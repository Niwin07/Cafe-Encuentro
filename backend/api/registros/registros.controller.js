const registrosModel = require('./registros.model');
const pool = require('../../conexion');


// --- NUEVA FUNCIÓN HELPER ---
const obtenerIdDestino = async (nombre) => {
  try {
    const [rows] = await pool.query('SELECT id FROM destinos WHERE nombre LIKE ? LIMIT 1', [`%${nombre}%`]);
    return rows.length > 0 ? rows[0].id : (nombre === 'Cocina' ? 1 : 2);
  } catch (error) { return 1; }
};


/**
 * Obtener registros de Cocina
 * GET /api/registros/cocina
 */
const obtenerRegistrosCocina = async (req, res, next) => {
  try {
    const filtros = {
      fecha_desde: req.query.fecha_desde,
      fecha_hasta: req.query.fecha_hasta,
      cajera_id: req.query.cajera_id,
      estado: req.query.estado
    };

    // MODIFICADO: Obtenemos ID dinámico
    const destinoId = await obtenerIdDestino('Cocina');
    const registros = await registrosModel.obtenerPorDestino(destinoId, filtros);

    // Agrupar por pedido
    const pedidosAgrupados = {};
    
    registros.forEach(item => {
      if (!pedidosAgrupados[item.pedido_id]) {
        pedidosAgrupados[item.pedido_id] = {
          pedido_id: item.pedido_id,
          cliente: item.cliente,
          cajera_id: item.cajera_id,
          cajera_nombre: item.cajera_nombre,
          fecha_hora: item.fecha_hora,
          estado_general: item.estado_general,
          total_pedido: item.total_pedido,
          notas_pedido: item.notas_pedido,
          items: []
        };
      }
      
      pedidosAgrupados[item.pedido_id].items.push({
        id: item.item_id,
        producto_id: item.producto_id,
        producto_nombre: item.producto_nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        estado: item.estado,
        acompanamiento_nombre: item.acompanamiento_nombre,
        instrucciones_especiales: item.instrucciones_especiales
      });
    });

    const pedidosArray = Object.values(pedidosAgrupados);

    res.json({
      total: pedidosArray.length,
      destino: 'Cocina',
      registros: pedidosArray
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener registros de Cafetería
 * GET /api/registros/cafeteria
 */
const obtenerRegistrosCafeteria = async (req, res, next) => {
  try {
    const filtros = {
      fecha_desde: req.query.fecha_desde,
      fecha_hasta: req.query.fecha_hasta,
      cajera_id: req.query.cajera_id,
      estado: req.query.estado
    };

    // MODIFICADO: Obtenemos ID dinámico
    const destinoId = await obtenerIdDestino('Cafeteria');
    const registros = await registrosModel.obtenerPorDestino(destinoId, filtros);

    // Agrupar por pedido
    const pedidosAgrupados = {};
    
    registros.forEach(item => {
      if (!pedidosAgrupados[item.pedido_id]) {
        pedidosAgrupados[item.pedido_id] = {
          pedido_id: item.pedido_id,
          cliente: item.cliente,
          cajera_id: item.cajera_id,
          cajera_nombre: item.cajera_nombre,
          fecha_hora: item.fecha_hora,
          estado_general: item.estado_general,
          total_pedido: item.total_pedido,
          notas_pedido: item.notas_pedido,
          items: []
        };
      }
      
      pedidosAgrupados[item.pedido_id].items.push({
        id: item.item_id,
        producto_id: item.producto_id,
        producto_nombre: item.producto_nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        estado: item.estado,
        acompanamiento_nombre: item.acompanamiento_nombre,
        instrucciones_especiales: item.instrucciones_especiales
      });
    });

    const pedidosArray = Object.values(pedidosAgrupados);

    res.json({
      total: pedidosArray.length,
      destino: 'Cafetería',
      registros: pedidosArray
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener resumen de registros
 * GET /api/registros/resumen
 */
const obtenerResumen = async (req, res, next) => {
  try {
    const filtros = {
      fecha_desde: req.query.fecha_desde,
      fecha_hasta: req.query.fecha_hasta
    };

    const resumenGeneral = await registrosModel.obtenerResumenGeneral(filtros);
    const resumenPorCajera = await registrosModel.obtenerResumenPorCajera(filtros);

    res.json({
      resumen_general: resumenGeneral,
      resumen_por_cajera: resumenPorCajera
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener datos para cierre de caja
 * GET /api/registros/cierre-caja
 */
const obtenerCierreCaja = async (req, res, next) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({
        error: 'Parámetros requeridos',
        mensaje: 'Se requieren fecha_desde y fecha_hasta'
      });
    }

    const registros = await registrosModel.obtenerParaCierreCaja(fecha_desde, fecha_hasta);
    const resumen = await registrosModel.obtenerResumenGeneral({ fecha_desde, fecha_hasta });
    const resumenCajeras = await registrosModel.obtenerResumenPorCajera({ fecha_desde, fecha_hasta });

    res.json({
      periodo: {
        desde: fecha_desde,
        hasta: fecha_hasta
      },
      resumen_general: resumen,
      resumen_por_cajera: resumenCajeras,
      pedidos: registros
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerRegistrosCocina,
  obtenerRegistrosCafeteria,
  obtenerResumen,
  obtenerCierreCaja
};