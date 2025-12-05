const pool = require('../../conexion');

/**
 * Obtener registros de pedidos por destino con filtros
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
      
      pi.id as item_id,
      pi.producto_id,
      prod.nombre as producto_nombre,
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
    INNER JOIN destinos d ON pi.destino_id = d.id
    LEFT JOIN acompanamientos acomp ON pi.acompanamiento_id = acomp.id
    
    WHERE pi.destino_id = ?
  `;

  const valores = [destinoId];

  // Filtros opcionales
  if (filtros.fecha_desde) {
    query += ' AND p.fecha_hora >= ?';
    valores.push(filtros.fecha_desde);
  }

  if (filtros.fecha_hasta) {
    query += ' AND p.fecha_hora <= ?';
    valores.push(filtros.fecha_hasta);
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
  let query = `
    SELECT 
      c.id as cajera_id,
      c.nombre as cajera_nombre,
      COUNT(DISTINCT p.id) as total_pedidos,
      SUM(p.total) as monto_total,
      COUNT(CASE WHEN p.estado_general = 'Completado' THEN 1 END) as pedidos_completados,
      COUNT(CASE WHEN p.estado_general = 'Cancelado' THEN 1 END) as pedidos_cancelados,
      COUNT(CASE WHEN p.estado_general = 'Pendiente' THEN 1 END) as pedidos_pendientes
      
    FROM cajeras c
    LEFT JOIN pedidos p ON c.id = p.cajera_id
  `;

  const condiciones = [];
  const valores = [];

  if (filtros.fecha_desde) {
    condiciones.push('p.fecha_hora >= ?');
    valores.push(filtros.fecha_desde);
  }

  if (filtros.fecha_hasta) {
    condiciones.push('p.fecha_hora <= ?');
    valores.push(filtros.fecha_hasta);
  }

  if (condiciones.length > 0) {
    query += ' WHERE ' + condiciones.join(' AND ');
  }

  query += ' GROUP BY c.id, c.nombre';
  query += ' ORDER BY monto_total DESC';

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
      
      COUNT(DISTINCT p.cajera_id) as cajeras_activas
      
    FROM pedidos p
  `;

  const condiciones = [];
  const valores = [];

  if (filtros.fecha_desde) {
    condiciones.push('p.fecha_hora >= ?');
    valores.push(filtros.fecha_desde);
  }

  if (filtros.fecha_hasta) {
    condiciones.push('p.fecha_hora <= ?');
    valores.push(filtros.fecha_hasta);
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
      
      d.nombre as destino_nombre,
      
      COUNT(pi.id) as total_items
      
    FROM pedidos p
    INNER JOIN cajeras c ON p.cajera_id = c.id
    INNER JOIN pedidos_items pi ON p.id = pi.pedido_id
    INNER JOIN destinos d ON pi.destino_id = d.id
    
    WHERE p.fecha_hora >= ? AND p.fecha_hora <= ?
    
    GROUP BY p.id, p.cliente, p.cajera_id, c.nombre, p.fecha_hora, p.estado_general, p.total, d.nombre
    ORDER BY p.fecha_hora DESC
  `;

  const [rows] = await pool.query(query, [fecha_desde, fecha_hasta]);
  return rows;
};

module.exports = {
  obtenerPorDestino,
  obtenerResumenPorCajera,
  obtenerResumenGeneral,
  obtenerParaCierreCaja
};