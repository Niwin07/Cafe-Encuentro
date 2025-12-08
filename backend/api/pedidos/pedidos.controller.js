const pool = require('../../conexion');
const pedidosModel = require('./pedidos.model');
const productosModel = require('../productos/productos.model');
const { 
  MENSAJES_ERROR, 
  MENSAJES_EXITO,
  ESTADOS_PEDIDO_ITEM,
  ESTADOS_ITEM_VALIDOS
} = require('../utils/constants');
const { 
  generarIdPedido, 
  calcularEstadoGeneral,
  calcularSubtotal,
  validarStock,
  agruparPor
} = require('../utils/helpers');


/**
 * Crear un nuevo pedido completo con sus items (requiere autenticación)
 * POST /api/pedidos
 */
const crear = async (req, res, next) => {
  const connection = await pool.getConnection();
  
  try {
    const { cliente, items, notas } = req.body;
    const cajeraId = req.cajera.id;

    if (!cliente || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos', mensaje: 'Cliente e items son obligatorios' });
    }

    await connection.beginTransaction();
    const pedidoId = generarIdPedido();
    const productosValidados = [];
    
    for (const item of items) {
      // Asegurar que cantidad es número
      const cantidad = parseInt(item.cantidad);
      const prodId = parseInt(item.producto_id);
      const acompId = item.acompanamiento_id ? parseInt(item.acompanamiento_id) : null;

      // 1. Validar Producto Principal
      const producto = await productosModel.obtenerPorId(prodId);
      
      if (!producto || !producto.activo) {
        await connection.rollback();
        return res.status(400).json({ error: 'Producto no disponible', mensaje: `El producto con ID ${prodId} no está disponible` });
      }

      if (!validarStock(producto.stock, cantidad)) {
        await connection.rollback();
        return res.status(400).json({ error: 'Stock insuficiente', mensaje: `Stock insuficiente para "${producto.nombre}"` });
      }

      // 2. Validar Acompañamiento (MODIFICADO: Lógica de Vínculo)
      let dataAcomp = null;
      if (acompId) {
        // Hacemos JOIN para ver si tiene un producto vinculado y traer SU stock
        const queryAcomp = `
            SELECT a.*, p.stock as stock_producto, p.nombre as nombre_producto_vinculado
            FROM acompanamientos a
            LEFT JOIN productos p ON a.producto_vinculado_id = p.id
            WHERE a.id = ?
        `;
        const [acompRows] = await connection.query(queryAcomp, [acompId]);
        const acomp = acompRows[0];

        if (!acomp || !acomp.activo) {
             await connection.rollback();
             return res.status(400).json({ error: 'Acompañamiento no disponible', mensaje: 'El acompañamiento seleccionado no existe o no está activo' });
        }

        // Determinamos qué stock revisar
        let stockDisponible = acomp.stock; // Por defecto el propio
        
        if (acomp.producto_vinculado_id) {
            stockDisponible = acomp.stock_producto; // Si hay vínculo, usamos el del producto
        }

        // Validamos stock
        if (stockDisponible < cantidad) {
            await connection.rollback();
            const origenStock = acomp.producto_vinculado_id ? `(del producto ${acomp.nombre_producto_vinculado})` : '';
            return res.status(400).json({ 
                error: 'Stock insuficiente', 
                mensaje: `No hay suficiente stock de "${acomp.nombre}" ${origenStock}. Disponibles: ${stockDisponible}` 
            });
        }
        
        // Guardamos data para usarla luego al descontar
        dataAcomp = acomp;
      }

      productosValidados.push({
        ...item,
        cantidad, 
        acompanamiento_id: acompId,
        producto,
        dataAcomp, // Guardamos la info del acompañamiento (incluyendo vínculo)
        subtotal: calcularSubtotal(producto.precio, cantidad)
      });
    }

    const totalPedido = productosValidados.reduce((sum, item) => sum + item.subtotal, 0);

    // Crear Cabecera
    await pedidosModel.crear({
      id: pedidoId,
      cliente,
      cajera_id: cajeraId,
      total: totalPedido,
      notas,
      estado_general: 'Pendiente'
    });

    // Crear Items y Descontar Stock
    for (const item of productosValidados) {
      await pedidosModel.crearItem({
        pedido_id: pedidoId,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.subtotal,
        acompanamiento_id: item.acompanamiento_id,
        instrucciones_especiales: item.instrucciones_especiales || null,
        estado: 'Pendiente',
        destino_id: item.producto.destino_id
      });

      // A. Actualizar Stock Producto Principal
      await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.producto.id]);

      // B. Actualizar Stock Acompañamiento (MODIFICADO)
      if (item.acompanamiento_id && item.dataAcomp) {
        if (item.dataAcomp.producto_vinculado_id) {
            // Si está vinculado, descontamos al PRODUCTO VINCULADO
            await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', 
                [item.cantidad, item.dataAcomp.producto_vinculado_id]);
        } else {
            // Si NO está vinculado, descontamos al ACOMPAÑAMIENTO
            await connection.query('UPDATE acompanamientos SET stock = stock - ? WHERE id = ?', 
                [item.cantidad, item.acompanamiento_id]);
        }
      }
    }

    await connection.commit();
    const pedidoCreado = await pedidosModel.obtenerPorId(pedidoId);

    res.status(201).json({ mensaje: MENSAJES_EXITO.PEDIDO_CREADO, pedido: pedidoCreado });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
/**
 * Obtener todos los pedidos con filtros (requiere autenticación)
 * GET /api/pedidos
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
 * Obtener un pedido específico por ID
 * GET /api/pedidos/:id
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pedido = await pedidosModel.obtenerPorId(id);

    if (!pedido) {
      return res.status(404).json({
        error: 'Pedido no encontrado',
        mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO
      });
    }

    res.json(pedido);

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener items activos por destino (Cocina o Cafetería)
 * GET /api/pedidos/destino/:destinoId/activos
 */
const obtenerActivosPorDestino = async (req, res, next) => {
  try {
    const { destinoId } = req.params;

    const items = await pedidosModel.obtenerItemsActivosPorDestino(destinoId);

    // Agrupar por pedido
    const itemsAgrupados = agruparPor(items, 'pedido_id');

    res.json({
      total: items.length,
      pedidos: Object.keys(itemsAgrupados).length,
      items: itemsAgrupados
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener items de cocina activos (público)
 * GET /api/pedidos/cocina/activos
 */

// --- NUEVA FUNCIÓN HELPER ---
const obtenerIdDestinoPorNombre = async (nombre) => {
  try {
    const [rows] = await pool.query('SELECT id FROM destinos WHERE nombre LIKE ? LIMIT 1', [`%${nombre}%`]);
    // Si lo encuentra usa ese ID, si no, usa los defaults (1 para Cocina, 2 para Cafetería)
    if (rows.length > 0) return rows[0].id;
    return nombre === 'Cocina' ? 1 : 2; 
  } catch (error) {
    return nombre === 'Cocina' ? 1 : 2;
  }
};


const obtenerCocinaActivos = async (req, res, next) => {
  try {
    // MODIFICADO: Usamos el helper en lugar de un ID fijo
    const destinoId = await obtenerIdDestinoPorNombre('Cocina');
    const items = await pedidosModel.obtenerItemsActivosPorDestino(destinoId);
    
    // Agrupar por pedido
    const itemsAgrupados = agruparPor(items, 'pedido_id');

    res.json({
      total: items.length,
      items: itemsAgrupados
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener items de cafetería activos (público)
 * GET /api/pedidos/cafeteria/activos
 */
const obtenerCafeteriaActivos = async (req, res, next) => {
  try {
    // MODIFICADO: Usamos el helper en lugar de un ID fijo
    const destinoId = await obtenerIdDestinoPorNombre('Cafeteria'); // Buscamos por nombre (flexible con/sin tilde por el LIKE del helper)
    
    const items = await pedidosModel.obtenerItemsActivosPorDestino(destinoId);
    
    // Agrupar por pedido
    const itemsAgrupados = agruparPor(items, 'pedido_id');

    res.json({
      total: items.length,
      items: itemsAgrupados
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar estado de un item específico (público para cocina/cafetería)
 * PATCH /api/pedidos/items/:itemId/estado
 */
const cambiarEstadoItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { estado } = req.body;

    // Validar estado
    if (!estado || !ESTADOS_ITEM_VALIDOS.includes(estado)) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: `El estado debe ser uno de: ${ESTADOS_ITEM_VALIDOS.join(', ')}`
      });
    }

    // Obtener item
    const item = await pedidosModel.obtenerItemPorId(itemId);

    if (!item) {
      return res.status(404).json({
        error: 'Item no encontrado',
        mensaje: MENSAJES_ERROR.PEDIDO_ITEM_NO_ENCONTRADO
      });
    }

    // Actualizar estado del item
    await pedidosModel.actualizarEstadoItem(itemId, estado);

    // Obtener todos los items del pedido para recalcular estado general
    const todosLosItems = await pedidosModel.obtenerItemsPorPedidoId(item.pedido_id);
    const nuevoEstadoGeneral = calcularEstadoGeneral(todosLosItems);

    // Actualizar estado general del pedido
    await pedidosModel.actualizarEstadoGeneral(item.pedido_id, nuevoEstadoGeneral);

    res.json({
      mensaje: 'Estado actualizado exitosamente',
      item: {
        id: itemId,
        estado,
        pedido_id: item.pedido_id,
        estado_general_pedido: nuevoEstadoGeneral
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Marcar pedido completo como entregado (requiere autenticación)
 * PATCH /api/pedidos/:id/entregar
 */
const marcarEntregado = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar que el pedido existe
    const pedido = await pedidosModel.obtenerPorId(id);

    if (!pedido) {
      return res.status(404).json({
        error: 'Pedido no encontrado',
        mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO
      });
    }

    // Marcar todos los items como entregados
    const items = await pedidosModel.obtenerItemsPorPedidoId(id);

    for (const item of items) {
      if (item.estado !== 'Cancelado') {
        await pedidosModel.actualizarEstadoItem(item.id, 'Entregado');
      }
    }

    // Actualizar estado general a Completado
    await pedidosModel.actualizarEstadoGeneral(id, 'Completado');

    res.json({
      mensaje: MENSAJES_EXITO.PEDIDO_ENTREGADO,
      pedido_id: id
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Cancelar pedido completo y devolver stock (requiere autenticación)
 * PATCH /api/pedidos/:id/cancelar
 */
const cancelar = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const pedido = await pedidosModel.obtenerPorId(id);

    if (!pedido) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado', mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO });
    }

    if (pedido.estado_general === 'Cancelado' || pedido.estado_general === 'Completado') {
        await connection.rollback();
        return res.status(400).json({ error: 'Acción no permitida', mensaje: 'El pedido ya fue completado o cancelado' });
    }

    const items = pedido.items.filter(item => item.estado !== 'Entregado' && item.estado !== 'Cancelado');

    for (const item of items) {
      const cantidad = parseInt(item.cantidad);
      
      // 1. Devolver stock Producto Principal
      await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, item.producto_id]);

      // 2. Devolver stock Acompañamiento (MODIFICADO)
      if (item.acompanamiento_id) {
        // Necesitamos verificar si tiene vínculo ACTUALMENTE
        const [rows] = await connection.query(
            'SELECT producto_vinculado_id FROM acompanamientos WHERE id = ?', 
            [item.acompanamiento_id]
        );
        
        if (rows.length > 0) {
            const vinculadoId = rows[0].producto_vinculado_id;
            
            if (vinculadoId) {
                // Devolver al producto vinculado
                await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, vinculadoId]);
            } else {
                // Devolver al acompañamiento
                await connection.query('UPDATE acompanamientos SET stock = stock + ? WHERE id = ?', [cantidad, item.acompanamiento_id]);
            }
        }
      }

      await pedidosModel.actualizarEstadoItem(item.id, 'Cancelado');
    }

    await pedidosModel.actualizarEstadoGeneral(id, 'Cancelado');
    await connection.commit();

    res.json({ mensaje: MENSAJES_EXITO.PEDIDO_CANCELADO, pedido_id: id });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

const eliminar = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const pedido = await pedidosModel.obtenerPorId(id);
    if (!pedido) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado', mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO });
    }

    if (pedido.estado_general !== 'Cancelado') {
      const items = pedido.items;
      for (const item of items) {
        if (item.estado !== 'Cancelado') {
          const cantidad = parseInt(item.cantidad);

          // 1. Devolver stock Producto
          await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, item.producto_id]);
          
          // 2. Devolver stock Acompañamiento (MODIFICADO - Misma lógica que cancelar)
          if (item.acompanamiento_id) {
             const [rows] = await connection.query(
                'SELECT producto_vinculado_id FROM acompanamientos WHERE id = ?', 
                [item.acompanamiento_id]
             );
             
             if (rows.length > 0) {
                const vinculadoId = rows[0].producto_vinculado_id;
                if (vinculadoId) {
                    await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, vinculadoId]);
                } else {
                    await connection.query('UPDATE acompanamientos SET stock = stock + ? WHERE id = ?', [cantidad, item.acompanamiento_id]);
                }
             }
          }
        }
      }
    }

    await connection.query('DELETE FROM pedidos_items WHERE pedido_id = ?', [id]);
    await connection.query('DELETE FROM pedidos WHERE id = ?', [id]);

    await connection.commit();
    res.json({ mensaje: 'Registro eliminado y stock ajustado.', id_eliminado: id });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

module.exports = {
  crear,
  obtenerTodos,
  obtenerPorId,
  obtenerActivosPorDestino,
  obtenerCocinaActivos,
  obtenerCafeteriaActivos,
  cambiarEstadoItem,
  marcarEntregado,
  cancelar,
  eliminar
};