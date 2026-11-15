const pool = require('../../conexion');
const { normalizarFecha } = require('../utils/helpers');
const { ESTADOS_ITEM_COCINA } = require('../utils/constants');

/**
 * Las escrituras de pedidos (crear, cancelar, entregar, eliminar, cambiar
 * estado) viven en pedidos.controller dentro de transacciones (utils/db
 * conTransaccion). Este modelo solo contiene lecturas.
 */

/**
 * Obtener pedido por ID con todos sus items
 */
const obtenerPorId = async (pedidoId) => {
  const queryPedido = `
    SELECT
      p.id,
      p.cliente,
      p.cajera_id,
      c.nombre as cajera_nombre,
      p.fecha_hora,
      p.estado_general,
      p.total,
      p.notas,
      p.created_at,
      p.updated_at
    FROM pedidos p
    INNER JOIN cajeras c ON p.cajera_id = c.id
    WHERE p.id = ?
  `;

  const [pedidos] = await pool.query(queryPedido, [pedidoId]);

  if (pedidos.length === 0) {
    return null;
  }

  const queryItems = `
    SELECT
      pi.id,
      pi.pedido_id,
      pi.producto_id,
      prod.nombre as producto_nombre,
      pi.cantidad,
      pi.precio_unitario,
      pi.subtotal,
      pi.acompanamiento_id,
      acomp.nombre as acompanamiento_nombre,
      pi.instrucciones_especiales,
      pi.estado,
      pi.destino_id,
      dest.nombre as destino_nombre,
      pi.created_at,
      pi.updated_at
    FROM pedidos_items pi
    INNER JOIN productos prod ON pi.producto_id = prod.id
    INNER JOIN destinos dest ON pi.destino_id = dest.id
    LEFT JOIN acompanamientos acomp ON pi.acompanamiento_id = acomp.id
    WHERE pi.pedido_id = ?
    ORDER BY pi.id ASC
  `;

  const [items] = await pool.query(queryItems, [pedidoId]);

  return {
    ...pedidos[0],
    items
  };
};

/**
 * Construye el WHERE compartido por obtenerTodos y contarTodos.
 * (Antes contarTodos no aplicaba el filtro `cliente` y el total no
 * coincidía con las filas devueltas.)
 */
const construirFiltros = (filtros = {}) => {
  const condiciones = [];
  const valores = [];

  if (filtros.estado_general) {
    condiciones.push('p.estado_general = ?');
    valores.push(filtros.estado_general);
  }

  if (filtros.cajera_id) {
    condiciones.push('p.cajera_id = ?');
    valores.push(filtros.cajera_id);
  }

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

  if (filtros.cliente) {
    condiciones.push('p.cliente LIKE ?');
    valores.push(`%${filtros.cliente}%`);
  }

  return {
    where: condiciones.length > 0 ? ' WHERE ' + condiciones.join(' AND ') : '',
    valores
  };
};

/**
 * Obtener todos los pedidos con filtros
 */
const obtenerTodos = async (filtros = {}) => {
  const { where, valores } = construirFiltros(filtros);

  let query = `
    SELECT
      p.id,
      p.cliente,
      p.cajera_id,
      c.nombre as cajera_nombre,
      p.fecha_hora,
      p.estado_general,
      p.total,
      p.notas,
      p.created_at
    FROM pedidos p
    INNER JOIN cajeras c ON p.cajera_id = c.id
    ${where}
    ORDER BY p.fecha_hora DESC
  `;

  if (filtros.limite) {
    query += ' LIMIT ? OFFSET ?';
    valores.push(parseInt(filtros.limite), parseInt(filtros.offset) || 0);
  }

  const [rows] = await pool.query(query, valores);
  return rows;
};

/**
 * Contar total de pedidos con los mismos filtros que obtenerTodos
 */
const contarTodos = async (filtros = {}) => {
  const { where, valores } = construirFiltros(filtros);
  const [rows] = await pool.query(`SELECT COUNT(*) as total FROM pedidos p ${where}`, valores);
  return rows[0].total;
};

/**
 * Obtener items de pedidos por destino (Cocina o Cafetería)
 */
const obtenerItemsPorDestino = async (destinoId, estados = []) => {
  let query = `
    SELECT
      pi.id,
      pi.pedido_id,
      p.cliente,
      p.cajera_id,
      caj.nombre as cajera_nombre,
      p.fecha_hora,
      pi.producto_id,
      prod.nombre as producto_nombre,
      pi.cantidad,
      pi.precio_unitario,
      pi.subtotal,
      pi.acompanamiento_id,
      acomp.nombre as acompanamiento_nombre,
      pi.instrucciones_especiales,
      pi.estado,
      pi.destino_id,
      dest.nombre as destino_nombre,
      pi.created_at,
      pi.updated_at
    FROM pedidos_items pi
    INNER JOIN pedidos p ON pi.pedido_id = p.id
    INNER JOIN productos prod ON pi.producto_id = prod.id
    INNER JOIN destinos dest ON pi.destino_id = dest.id
    INNER JOIN cajeras caj ON p.cajera_id = caj.id
    LEFT JOIN acompanamientos acomp ON pi.acompanamiento_id = acomp.id
    WHERE pi.destino_id = ?
  `;

  const valores = [destinoId];

  if (estados.length > 0) {
    query += ' AND pi.estado IN (?)';
    valores.push(estados);
  }

  query += ' ORDER BY p.fecha_hora ASC, pi.id ASC';

  const [rows] = await pool.query(query, valores);
  return rows;
};

/**
 * Obtener items activos por destino (Pendiente, En Preparación, Listo)
 */
const obtenerItemsActivosPorDestino = async (destinoId) => {
  return obtenerItemsPorDestino(destinoId, ESTADOS_ITEM_COCINA);
};

/**
 * Obtener un item específico por ID
 */
const obtenerItemPorId = async (itemId) => {
  const query = `
    SELECT
      pi.id,
      pi.pedido_id,
      pi.producto_id,
      pi.cantidad,
      pi.estado,
      pi.destino_id,
      prod.nombre as producto_nombre
    FROM pedidos_items pi
    INNER JOIN productos prod ON pi.producto_id = prod.id
    WHERE pi.id = ?
  `;

  const [rows] = await pool.query(query, [itemId]);
  return rows[0];
};

module.exports = {
  obtenerPorId,
  obtenerTodos,
  contarTodos,
  obtenerItemsPorDestino,
  obtenerItemsActivosPorDestino,
  obtenerItemPorId
};
