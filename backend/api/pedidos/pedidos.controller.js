const pool = require('../../conexion');
const pedidosModel = require('./pedidos.model');
const { 
  MENSAJES_ERROR, 
  MENSAJES_EXITO,
  ESTADOS_ITEM_VALIDOS
} = require('../utils/constants');
const { 
  generarIdPedido, 
  calcularEstadoGeneral,
  calcularSubtotal,
  validarStock,
  agruparPor
} = require('../utils/helpers');

// --- HELPER INTERNO ---
const obtenerIdDestinoPorNombre = async (nombre) => {
  try {
    const [rows] = await pool.query('SELECT id FROM destinos WHERE nombre LIKE ? LIMIT 1', [`%${nombre}%`]);
    if (rows.length > 0) return rows[0].id;
    return nombre === 'Cocina' ? 1 : 2; 
  } catch (error) {
    return nombre === 'Cocina' ? 1 : 2;
  }
};

/**
 * Crear un nuevo pedido completo con sus items (OPTIMIZADO CON TRANSACCIONES)
 * POST /api/pedidos
 */
const crear = async (req, res, next) => {
  const connection = await pool.getConnection();
  
  try {
    const { cliente, items, notas } = req.body;
    const cajeraId = req.cajera.id;

    if (!cliente || !items || items.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Datos incompletos', mensaje: 'Cliente e items son obligatorios' });
    }

    await connection.beginTransaction();
    
    // Generar ID único
    const pedidoId = generarIdPedido();
    const itemsProcesados = [];
    let totalPedido = 0;

    // 1. Validar y Calcular todo ANTES de insertar (Evita bloqueos de lectura/escritura)
    for (const item of items) {
      const cantidad = parseInt(item.cantidad);
      const prodId = parseInt(item.producto_id);
      const acompId = item.acompanamiento_id ? parseInt(item.acompanamiento_id) : null;

      // Usamos 'connection' con FOR UPDATE para bloquear fila y evitar condiciones de carrera
      const [prodRows] = await connection.query('SELECT * FROM productos WHERE id = ? FOR UPDATE', [prodId]);
      const producto = prodRows[0];

      if (!producto || !producto.activo) {
        throw { status: 400, message: `El producto "${producto?.nombre || prodId}" no está disponible` };
      }

      if (!validarStock(producto.stock, cantidad)) {
        throw { status: 400, message: `Stock insuficiente para "${producto.nombre}". Disponibles: ${producto.stock}` };
      }

      // Validar Acompañamiento (si existe) y verificar VINCULACIÓN
      let dataAcomp = null;
      if (acompId) {
        // Traemos el acomp y su posible producto vinculado
        const [acompRows] = await connection.query(`
            SELECT a.*, p.stock as stock_producto, p.nombre as nombre_prod_vinc
            FROM acompanamientos a
            LEFT JOIN productos p ON a.producto_vinculado_id = p.id
            WHERE a.id = ? FOR UPDATE`, [acompId]);
        
        const acomp = acompRows[0];

        if (!acomp || !acomp.activo) {
            throw { status: 400, message: 'El acompañamiento seleccionado no está disponible' };
        }

        // Determinar stock real del acompañamiento (Propio o Vinculado)
        let stockAcompDisponible = acomp.stock;
        if (acomp.producto_vinculado_id) {
            stockAcompDisponible = acomp.stock_producto;
        }

        if (stockAcompDisponible < cantidad) {
            const nombreRef = acomp.producto_vinculado_id ? `(Vinculado a ${acomp.nombre_prod_vinc})` : '';
            throw { status: 400, message: `Stock insuficiente de "${acomp.nombre}" ${nombreRef}. Disponibles: ${stockAcompDisponible}` };
        }
        dataAcomp = acomp;
      }

      const subtotal = calcularSubtotal(producto.precio, cantidad);
      totalPedido += subtotal;

      itemsProcesados.push({
        ...item,
        cantidad,
        prodId,
        acompId,
        precio: producto.precio,
        subtotal,
        dataAcomp,
        destino_id: producto.destino_id
      });
    }

    // 2. Insertar Cabecera del Pedido
    await connection.query(`
      INSERT INTO pedidos (id, cliente, cajera_id, total, notas, estado_general)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [pedidoId, cliente, cajeraId, totalPedido, notas || null, 'Pendiente']);

    // 3. Insertar Items y Descontar Stock
    for (const item of itemsProcesados) {
      // Insertar item
      await connection.query(`
        INSERT INTO pedidos_items (
          pedido_id, producto_id, cantidad, precio_unitario, subtotal,
          acompanamiento_id, instrucciones_especiales, estado, destino_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        pedidoId, item.prodId, item.cantidad, item.precio, item.subtotal,
        item.acompId, item.instrucciones_especiales || null, 'Pendiente', item.destino_id
      ]);

      // A. Descontar Producto Principal
      await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.prodId]);

      // B. Descontar Acompañamiento (Con lógica de vínculo)
      if (item.dataAcomp) {
        if (item.dataAcomp.producto_vinculado_id) {
            // Descontar al producto vinculado
            await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', 
                [item.cantidad, item.dataAcomp.producto_vinculado_id]);
        } else {
            // Descontar al acompañamiento propio
            await connection.query('UPDATE acompanamientos SET stock = stock - ? WHERE id = ?', 
                [item.cantidad, item.acompId]);
        }
      }
    }

    await connection.commit();
    
    // Recuperar el pedido completo para devolverlo al front (Lectura final fuera de transacción)
    // Usamos el modelo estándar aquí ya que la transacción terminó
    connection.release(); // Liberamos conexión transaccional
    const pedidoCreado = await pedidosModel.obtenerPorId(pedidoId);

    res.status(201).json({ mensaje: MENSAJES_EXITO.PEDIDO_CREADO, pedido: pedidoCreado });

  } catch (error) {
    if (connection) await connection.rollback();
    // Manejo de errores controlados vs inesperados
    const status = error.status || 500;
    const msg = error.message || 'Error interno al procesar el pedido';
    if (connection) connection.release();
    next({ status, message: msg });
  }
};

/**
 * Cancelar pedido (OPTIMIZADO CON TRANSACCIONES)
 * PATCH /api/pedidos/:id/cancelar
 */
const cancelar = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    await connection.beginTransaction();

    // Obtener pedido para verificar estado (bloqueando fila)
    const [pedidos] = await connection.query('SELECT estado_general FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    
    if (pedidos.length === 0) {
      throw { status: 404, message: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO };
    }

    if (pedidos[0].estado_general === 'Cancelado' || pedidos[0].estado_general === 'Completado') {
      throw { status: 400, message: 'El pedido ya fue finalizado o cancelado' };
    }

    // Traer items para devolver stock (solo los no cancelados/entregados)
    const [items] = await connection.query(`
        SELECT pi.*, a.producto_vinculado_id 
        FROM pedidos_items pi
        LEFT JOIN acompanamientos a ON pi.acompanamiento_id = a.id
        WHERE pi.pedido_id = ? 
        AND pi.estado NOT IN ('Entregado', 'Cancelado')
    `, [id]);

    for (const item of items) {
      const cantidad = item.cantidad;
      
      // 1. Devolver stock Producto Principal
      await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, item.producto_id]);

      // 2. Devolver stock Acompañamiento
      if (item.acompanamiento_id) {
         if (item.producto_vinculado_id) {
             // Devolver al producto vinculado
             await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, item.producto_vinculado_id]);
         } else {
             // Devolver al acompañamiento
             await connection.query('UPDATE acompanamientos SET stock = stock + ? WHERE id = ?', [cantidad, item.acompanamiento_id]);
         }
      }

      // Marcar item como cancelado
      await connection.query('UPDATE pedidos_items SET estado = ? WHERE id = ?', ['Cancelado', item.id]);
    }

    // Marcar pedido general como cancelado
    await connection.query('UPDATE pedidos SET estado_general = ? WHERE id = ?', ['Cancelado', id]);

    await connection.commit();
    res.json({ mensaje: MENSAJES_EXITO.PEDIDO_CANCELADO, pedido_id: id });

  } catch (error) {
    if (connection) await connection.rollback();
    const status = error.status || 500;
    const msg = error.message || 'Error al cancelar';
    next({ status, message: msg });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Eliminar pedido (OPTIMIZADO CON TRANSACCIONES)
 * DELETE /api/pedidos/:id
 */
const eliminar = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const [pedidos] = await connection.query('SELECT estado_general FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    if (pedidos.length === 0) throw { status: 404, message: 'Pedido no encontrado' };

    // Si no está cancelado, hay que devolver stock antes de borrar definitivamente
    if (pedidos[0].estado_general !== 'Cancelado') {
        const [items] = await connection.query(`
            SELECT pi.*, a.producto_vinculado_id 
            FROM pedidos_items pi
            LEFT JOIN acompanamientos a ON pi.acompanamiento_id = a.id
            WHERE pi.pedido_id = ? AND pi.estado != 'Cancelado'
        `, [id]);

        for (const item of items) {
            // Devolver stock principal
            await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.producto_id]);
            
            // Devolver stock acompañamiento
            if (item.acompanamiento_id) {
                if (item.producto_vinculado_id) {
                    await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.producto_vinculado_id]);
                } else {
                    await connection.query('UPDATE acompanamientos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.acompanamiento_id]);
                }
            }
        }
    }

    // Borrado físico
    await connection.query('DELETE FROM pedidos_items WHERE pedido_id = ?', [id]);
    await connection.query('DELETE FROM pedidos WHERE id = ?', [id]);

    await connection.commit();
    res.json({ mensaje: 'Registro eliminado definitivamente y stock ajustado' });

  } catch (error) {
    if (connection) await connection.rollback();
    const status = error.status || 500;
    const msg = error.message || 'Error eliminando';
    next({ status, message: msg });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Obtener todos los pedidos (Usando Model)
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const filtros = {
      estado_general: req.query.estado_general,
      cajera_id: req.query.cajera_id,
      fecha_desde: req.query.fecha_desde,
      fecha_hasta: req.query.fecha_hasta,
      cliente: req.query.cliente,
      limite: req.query.limite || 50,
      offset: req.query.offset || 0
    };

    const pedidos = await pedidosModel.obtenerTodos(filtros);
    const total = await pedidosModel.contarTodos(filtros);

    res.json({
      total,
      limite: parseInt(filtros.limite),
      offset: parseInt(filtros.offset),
      pedidos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un pedido por ID (Usando Model)
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pedido = await pedidosModel.obtenerPorId(id);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado', mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO });
    }
    res.json(pedido);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener items activos de Cocina (Usando Helper)
 */
const obtenerCocinaActivos = async (req, res, next) => {
  try {
    const destinoId = await obtenerIdDestinoPorNombre('Cocina');
    const items = await pedidosModel.obtenerItemsActivosPorDestino(destinoId);
    const itemsAgrupados = agruparPor(items, 'pedido_id');

    res.json({ total: items.length, items: itemsAgrupados });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener items activos de Cafetería (Usando Helper)
 */
const obtenerCafeteriaActivos = async (req, res, next) => {
  try {
    const destinoId = await obtenerIdDestinoPorNombre('Cafeteria');
    const items = await pedidosModel.obtenerItemsActivosPorDestino(destinoId);
    const itemsAgrupados = agruparPor(items, 'pedido_id');

    res.json({ total: items.length, items: itemsAgrupados });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener items activos por destino genérico
 */
const obtenerActivosPorDestino = async (req, res, next) => {
  try {
    const { destinoId } = req.params;
    const items = await pedidosModel.obtenerItemsActivosPorDestino(destinoId);
    const itemsAgrupados = agruparPor(items, 'pedido_id');

    res.json({ total: items.length, pedidos: Object.keys(itemsAgrupados).length, items: itemsAgrupados });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar estado de un item
 */
const cambiarEstadoItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { estado } = req.body;

    if (!estado || !ESTADOS_ITEM_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido', mensaje: `El estado debe ser uno de: ${ESTADOS_ITEM_VALIDOS.join(', ')}` });
    }

    const item = await pedidosModel.obtenerItemPorId(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado', mensaje: MENSAJES_ERROR.PEDIDO_ITEM_NO_ENCONTRADO });
    }

    await pedidosModel.actualizarEstadoItem(itemId, estado);

    // Recalcular estado general
    const todosLosItems = await pedidosModel.obtenerItemsPorPedidoId(item.pedido_id);
    const nuevoEstadoGeneral = calcularEstadoGeneral(todosLosItems);
    await pedidosModel.actualizarEstadoGeneral(item.pedido_id, nuevoEstadoGeneral);

    res.json({
      mensaje: 'Estado actualizado exitosamente',
      item: { id: itemId, estado, pedido_id: item.pedido_id, estado_general_pedido: nuevoEstadoGeneral }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marcar pedido completo como entregado
 */
const marcarEntregado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pedido = await pedidosModel.obtenerPorId(id);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado', mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO });
    }

    const items = await pedidosModel.obtenerItemsPorPedidoId(id);
    for (const item of items) {
      if (item.estado !== 'Cancelado') {
        await pedidosModel.actualizarEstadoItem(item.id, 'Entregado');
      }
    }

    await pedidosModel.actualizarEstadoGeneral(id, 'Completado');
    res.json({ mensaje: MENSAJES_EXITO.PEDIDO_ENTREGADO, pedido_id: id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crear,
  cancelar,
  eliminar,
  obtenerTodos,
  obtenerPorId,
  obtenerCocinaActivos,
  obtenerCafeteriaActivos,
  obtenerActivosPorDestino,
  cambiarEstadoItem,
  marcarEntregado
};