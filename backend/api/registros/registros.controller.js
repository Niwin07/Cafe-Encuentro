const registrosModel = require('./registros.model');
const { obtenerIdDestinoPorNombre } = require('../utils/db');
const { normalizarFecha } = require('../utils/helpers');

/**
 * Agrupa las filas (una por item) en pedidos con su lista de items.
 * Antes este bloque estaba copiado en Cocina y Cafetería.
 */
const agruparRegistrosPorPedido = (registros) => {
  const pedidosAgrupados = new Map();

  registros.forEach(item => {
    if (!pedidosAgrupados.has(item.pedido_id)) {
      pedidosAgrupados.set(item.pedido_id, {
        pedido_id: item.pedido_id,
        cliente: item.cliente,
        cajera_id: item.cajera_id,
        cajera_nombre: item.cajera_nombre,
        fecha_hora: item.fecha_hora,
        estado_general: item.estado_general,
        total_pedido: item.total_pedido,
        notas_pedido: item.notas_pedido,
        metodo_pago: item.metodo_pago,
        items: []
      });
    }

    pedidosAgrupados.get(item.pedido_id).items.push({
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

  return [...pedidosAgrupados.values()];
};

const responderRegistrosDestino = async (req, res, nombreDestino, etiqueta) => {
  const filtros = {
    fecha_desde: req.query.fecha_desde,
    fecha_hasta: req.query.fecha_hasta,
    cajera_id: req.query.cajera_id,
    estado: req.query.estado
  };

  const destinoId = await obtenerIdDestinoPorNombre(nombreDestino);
  const registros = await registrosModel.obtenerPorDestino(destinoId, filtros);
  const pedidosArray = agruparRegistrosPorPedido(registros);

  res.json({
    total: pedidosArray.length,
    destino: etiqueta,
    registros: pedidosArray
  });
};

/**
 * Obtener registros de Cocina
 * GET /api/registros/cocina
 */
const obtenerRegistrosCocina = async (req, res, next) => {
  try {
    await responderRegistrosDestino(req, res, 'Cocina', 'Cocina');
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
    await responderRegistrosDestino(req, res, 'Cafeteria', 'Cafetería');
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

    if (!normalizarFecha(fecha_desde) || !normalizarFecha(fecha_hasta)) {
      return res.status(400).json({
        error: 'Parámetros requeridos',
        mensaje: 'Se requieren fecha_desde y fecha_hasta válidas'
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