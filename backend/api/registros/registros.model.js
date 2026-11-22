const pool = require('../../conexion');
const { normalizarFecha } = require('../utils/helpers');

/**
 * Obtener registros (una fila por item) con filtros.
 * destinoId = null → todos los destinos.
 * filtros.categoria_id → solo los items de productos de esa categoría.
 */
const obtenerPorDestino = async (destinoId, filtros = {}) => {
  let query = `
    SELECT 
      p.id as pedido_id,
      p.cliente,
      p.cajera_id,
      c.nombre as cajera_nombre,
      p.fecha_hora,
      p.estado_general,
      p.total as total_pedido,
      p.notas as notas_pedido,
      p.metodo_pago,
      
      pi.id as item_id,
      pi.producto_id,
      prod.nombre as producto_nombre,
      prod.categoria_id,
      cat.nombre as categoria_nombre,
      pi.cantidad,
      pi.precio_unitario,
      pi.subtotal,
      pi.estado,
      pi.instrucciones_especiales,
      
      acomp.nombre as acompanamiento_nombre,
      
      d.id as destino_id,
      d.nombre as destino_nombre
      
    FROM pedidos_items pi
    INNER JOIN pedidos p ON pi.pedido_id = p.id
    INNER JOIN cajeras c ON p.cajera_id = c.id
    INNER JOIN productos prod ON pi.producto_id = prod.id
    LEFT JOIN categorias cat ON prod.categoria_id = cat.id
    INNER JOIN destinos d ON pi.destino_id = d.id
    LEFT JOIN acompanamientos acomp ON pi.acompanamiento_id = acomp.id
    
    WHERE TRUE
  `;

  const valores = [];

  if (destinoId) {
    query += ' AND pi.destino_id = ?';
    valores.push(destinoId);
  }

  if (filtros.categoria_id) {
    query += ' AND prod.categoria_id = ?';
    valores.push(filtros.categoria_id);
  }

  // Filtros opcionales
  const desde = normalizarFecha(filtros.fecha_desde);
  if (desde) {
    query += ' AND p.fecha_hora >= ?';
    valores.push(desde);
  }

  const hasta = normalizarFecha(filtros.fecha_hasta);
  if (hasta) {
    query += ' AND p.fecha_hora <= ?';
    valores.push(hasta);
  }

  if (filtros.cajera_id) {
    query += ' AND p.cajera_id = ?';
    valores.push(filtros.cajera_id);
  }

  if (filtros.estado) {
    query += ' AND p.estado_general = ?';
    valores.push(filtros.estado);
  }

  query += ' ORDER BY p.fecha_hora DESC, pi.id ASC';

  const [rows] = await pool.query(query, valores);
  return rows;
};

/**
 * Obtener resumen de registros por cajera
 */
const obtenerResumenPorCajera = async (filtros = {}) => {
  // Los filtros de fecha van en el ON (no en el WHERE): así el LEFT JOIN
  // conserva las cajeras sin pedidos en el período (con totales en 0).
  const condicionesJoin = ['c.id = p.cajera_id'];
  const valores = [];

  const desde = normalizarFecha(filtros.fecha_desde);
  if (desde) {
    condicionesJoin.push('p.fecha_hora >= ?');
    valores.push(desde);
  }

  const hasta = normalizarFecha(filtros.fecha_hasta);
  if (hasta) {
    condicionesJoin.push('p.fecha_hora <= ?');
    valores.push(hasta);
  }

  const query = `
    SELECT 
      c.id as cajera_id,
      c.nombre as cajera_nombre,
      COUNT(DISTINCT p.id) as total_pedidos,
      COALESCE(SUM(p.total), 0) as monto_total,
      COUNT(CASE WHEN p.estado_general = 'Completado' THEN 1 END) as pedidos_completados,
      COUNT(CASE WHEN p.estado_general = 'Cancelado' THEN 1 END) as pedidos_cancelados,
      COUNT(CASE WHEN p.estado_general = 'Pendiente' THEN 1 END) as pedidos_pendientes
    FROM cajeras c
    LEFT JOIN pedidos p ON ${condicionesJoin.join(' AND ')}
    GROUP BY c.id, c.nombre
    ORDER BY monto_total DESC
  `;

  const [rows] = await pool.query(query, valores);
  return rows;
};

/**
 * Obtener resumen general de registros
 */
const obtenerResumenGeneral = async (filtros = {}) => {
  let query = `
    SELECT 
      COUNT(DISTINCT p.id) as total_pedidos,
      SUM(p.total) as monto_total,
      AVG(p.total) as ticket_promedio,
      
      COUNT(CASE WHEN p.estado_general = 'Completado' THEN 1 END) as completados,
      COUNT(CASE WHEN p.estado_general = 'Cancelado' THEN 1 END) as cancelados,
      COUNT(CASE WHEN p.estado_general = 'Pendiente' THEN 1 END) as pendientes,
      COUNT(CASE WHEN p.estado_general = 'En Proceso' THEN 1 END) as en_proceso,

      -- Cobrado por método de pago (sin pedidos cancelados)
      COALESCE(SUM(CASE WHEN p.metodo_pago = 'Efectivo'      AND p.estado_general <> 'Cancelado' THEN p.total END), 0) as total_efectivo,
      COALESCE(SUM(CASE WHEN p.metodo_pago = 'Transferencia' AND p.estado_general <> 'Cancelado' THEN p.total END), 0) as total_transferencia,
      COALESCE(SUM(CASE WHEN p.metodo_pago = 'Tarjeta'       AND p.estado_general <> 'Cancelado' THEN p.total END), 0) as total_tarjeta,
      COALESCE(SUM(CASE WHEN p.metodo_pago IS NULL           AND p.estado_general <> 'Cancelado' THEN p.total END), 0) as total_sin_metodo,
      
      COUNT(DISTINCT p.cajera_id) as cajeras_activas
      
    FROM pedidos p
  `;

  const condiciones = [];
  const valores = [];

  const desde = normalizarFecha(filtros.fecha_desde);
  if (desde) {
    condiciones.push('p.fecha_hora >= ?');
    valores.push(desde);
  }

  const hasta = normalizarFecha(filtros.fecha_hasta);
  if (hasta) {
    condiciones.push('p.fecha_hora <= ?');
    valores.push(hasta);
  }

  if (condiciones.length > 0) {
    query += ' WHERE ' + condiciones.join(' AND ');
  }

  const [rows] = await pool.query(query, valores);
  return rows[0];
};

/**
 * Obtener registros por rango de fechas (para cierre de caja)
 */
const obtenerParaCierreCaja = async (fecha_desde, fecha_hasta) => {
  const query = `
    SELECT 
      p.id as pedido_id,
      p.cliente,
      p.cajera_id,
      c.nombre as cajera_nombre,
      p.fecha_hora,
      p.estado_general,
      p.total,
      p.metodo_pago,
      
      STRING_AGG(DISTINCT d.nombre, ', ' ORDER BY d.nombre) as destino_nombre,
      
      COUNT(pi.id) as total_items
      
    FROM pedidos p
    INNER JOIN cajeras c ON p.cajera_id = c.id
    INNER JOIN pedidos_items pi ON p.id = pi.pedido_id
    INNER JOIN destinos d ON pi.destino_id = d.id
    
    WHERE p.fecha_hora >= ? AND p.fecha_hora <= ?
    
    GROUP BY p.id, p.cliente, p.cajera_id, c.nombre, p.fecha_hora, p.estado_general, p.total, p.metodo_pago
    ORDER BY p.fecha_hora DESC
  `;

  const [rows] = await pool.query(query, [normalizarFecha(fecha_desde), normalizarFecha(fecha_hasta)]);
  return rows;
};

module.exports = {
  obtenerPorDestino,
  obtenerResumenPorCajera,
  obtenerResumenGeneral,
  obtenerParaCierreCaja
};