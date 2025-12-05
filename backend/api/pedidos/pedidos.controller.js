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

    // Validaciones básicas
    if (!cliente || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Cliente e items son obligatorios'
      });
    }

    await connection.beginTransaction();

    // Generar ID único para el pedido
    const pedidoId = generarIdPedido();

    // Validar stock y obtener datos de productos
    const productosValidados = [];
    
    for (const item of items) {
      if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Item inválido',
          mensaje: 'Cada item debe tener producto_id y cantidad válida'
        });
      }

      // Obtener producto
      const producto = await productosModel.obtenerPorId(item.producto_id);

      if (!producto) {
        await connection.rollback();
        return res.status(404).json({
          error: 'Producto no encontrado',
          mensaje: `El producto con ID ${item.producto_id} no existe`
        });
      }

      if (!producto.activo) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Producto no disponible',
          mensaje: `El producto "${producto.nombre}" no está disponible`
        });
      }

      // Validar stock
      if (!validarStock(producto.stock, item.cantidad)) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Stock insuficiente',
          mensaje: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`
        });
      }

      productosValidados.push({
        ...item,
        producto,
        subtotal: calcularSubtotal(producto.precio, item.cantidad)
      });
    }

    // Calcular total del pedido
    const totalPedido = productosValidados.reduce((sum, item) => sum + item.subtotal, 0);

    // Crear cabecera del pedido
    await pedidosModel.crear({
      id: pedidoId,
      cliente,
      cajera_id: cajeraId,
      total: totalPedido,
      notas,
      estado_general: 'Pendiente'
    });

    // Crear items y actualizar stock
    for (const item of productosValidados) {
      // Crear item del pedido
      await pedidosModel.crearItem({
        pedido_id: pedidoId,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.subtotal,
        acompanamiento_id: item.acompanamiento_id || null,
        instrucciones_especiales: item.instrucciones_especiales || null,
        estado: 'Pendiente',
        destino_id: item.producto.destino_id
      });

      // Restar stock
      const nuevoStock = item.producto.stock - item.cantidad;
      await connection.query(
        'UPDATE productos SET stock = ? WHERE id = ?',
        [nuevoStock, item.producto_id]
      );
    }

    await connection.commit();

    // Obtener pedido completo creado
    const pedidoCreado = await pedidosModel.obtenerPorId(pedidoId);

    res.status(201).json({
      mensaje: MENSAJES_EXITO.PEDIDO_CREADO,
      pedido: pedidoCreado
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

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
const obtenerCocinaActivos = async (req, res, next) => {
  try {
    // Destino 1 = Cocina (según tu schema inicial)
    const items = await pedidosModel.obtenerItemsActivosPorDestino(1);
    
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
    // Destino 2 = Cafetería
    const items = await pedidosModel.obtenerItemsActivosPorDestino(2);
    
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

    // Verificar que el pedido existe
    const pedido = await pedidosModel.obtenerPorId(id);

    if (!pedido) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Pedido no encontrado',
        mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO
      });
    }

    if (pedido.estado_general === 'Cancelado') {
      await connection.rollback();
      return res.status(400).json({
        error: 'Pedido ya cancelado',
        mensaje: 'Este pedido ya fue cancelado anteriormente'
      });
    }

    if (pedido.estado_general === 'Completado') {
      await connection.rollback();
      return res.status(400).json({
        error: 'No se puede cancelar',
        mensaje: 'No se puede cancelar un pedido ya completado'
      });
    }

    // Obtener items no entregados ni cancelados
    const items = pedido.items.filter(
      item => item.estado !== 'Entregado' && item.estado !== 'Cancelado'
    );

    // Devolver stock y marcar items como cancelados
    for (const item of items) {
      // Devolver stock
      await connection.query(
        'UPDATE productos SET stock = stock + ? WHERE id = ?',
        [item.cantidad, item.producto_id]
      );

      // Marcar item como cancelado
      await pedidosModel.actualizarEstadoItem(item.id, 'Cancelado');
    }

    // Actualizar estado general
    await pedidosModel.actualizarEstadoGeneral(id, 'Cancelado');

    await connection.commit();

    res.json({
      mensaje: MENSAJES_EXITO.PEDIDO_CANCELADO,
      pedido_id: id,
      items_cancelados: items.length
    });

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

    // 1. Obtener datos del pedido antes de borrarlo (para saber qué hacer con el stock)
    const pedido = await pedidosModel.obtenerPorId(id);

    if (!pedido) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Pedido no encontrado',
        mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO
      });
    }

    // 2. Devolver stock si corresponde
    // Si el pedido NO estaba cancelado, significa que los items descontaron stock.
    // Hay que devolverlo antes de borrar el registro para no perder inventario.
    if (pedido.estado_general !== 'Cancelado') {
      const items = pedido.items;
      
      for (const item of items) {
        // Solo devolvemos stock si el item no estaba ya cancelado individualmente
        if (item.estado !== 'Cancelado') {
          await connection.query(
            'UPDATE productos SET stock = stock + ? WHERE id = ?',
            [item.cantidad, item.producto_id]
          );
        }
      }
    }

    // 3. Ejecutar el borrado físico (usando la conexión de la transacción para seguridad)
    // Nota: Como pedidosModel.eliminar usa 'pool' directo, aquí lo hacemos manual 
    // dentro de la transacción para asegurar atomicidad.
    
    // Borrar items
    await connection.query('DELETE FROM pedidos_items WHERE pedido_id = ?', [id]);
    
    // Borrar cabecera
    await connection.query('DELETE FROM pedidos WHERE id = ?', [id]);

    await connection.commit();

    res.json({
      mensaje: 'Registro eliminado permanentemente y stock ajustado.',
      id_eliminado: id
    });

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