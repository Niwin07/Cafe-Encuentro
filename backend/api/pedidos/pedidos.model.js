const pool = require('../../conexion');

/**
 * Crear un nuevo pedido (cabecera)
 */
const crear = async (pedido) => {
  const query = `
    INSERT INTO pedidos (id, cliente, cajera_id, total, notas, estado_general)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    pedido.id,
    pedido.cliente,
    pedido.cajera_id,
    pedido.total || 0,
    pedido.notas || null,
    pedido.estado_general || 'Pendiente'
  ];

  await pool.query(query, valores);
  return pedido.id;
};

/**
 * Crear un item del pedido
 */
const crearItem = async (item) => {
  const query = `
    INSERT INTO pedidos_items (
      pedido_id, producto_id, cantidad, precio_unitario, subtotal,
      acompanamiento_id, instrucciones_especiales, estado, destino_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    item.pedido_id,
    item.producto_id,
    item.cantidad,
    item.precio_unitario,
    item.subtotal,
    item.acompanamiento_id || null,
    item.instrucciones_especiales || null,
    item.estado || 'Pendiente',
    item.destino_id
  ];

  const [result] = await pool.query(query, valores);
  return result.insertId;
};

/**
 * Obtener pedido por ID con todos sus items
 */
const obtenerPorId = async (pedidoId) => {
  // Obtener cabecera del pedido
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

  const pedido = pedidos[0];

  // Obtener items del pedido
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
    ...pedido,
    items
  };
};

/**
 * Obtener todos los pedidos con filtros
 */
const obtenerTodos = async (filtros = {}) => {
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
  `;

  const condiciones = [];
  const valores = [];

  // Filtrar por estado general
  if (filtros.estado_general) {
    condiciones.push('p.estado_general = ?');
    valores.push(filtros.estado_general);
  }

  // Filtrar por cajera
  if (filtros.cajera_id) {
    condiciones.push('p.cajera_id = ?');
    valores.push(filtros.cajera_id);
  }

  // Filtrar por fecha (desde)
  if (filtros.fecha_desde) {
    condiciones.push('p.fecha_hora >= ?');
    valores.push(filtros.fecha_desde);
  }

  // Filtrar por fecha (hasta)
  if (filtros.fecha_hasta) {
    condiciones.push('p.fecha_hora <= ?');
    valores.push(filtros.fecha_hasta);
  }

  // Filtrar por cliente
  if (filtros.cliente) {
    condiciones.push('p.cliente LIKE ?');
    valores.push(`%${filtros.cliente}%`);
  }

  if (condiciones.length > 0) {
    query += ' WHERE ' + condiciones.join(' AND ');
  }

  query += ' ORDER BY p.fecha_hora DESC';

  // Paginación
  if (filtros.limite) {
    query += ' LIMIT ?';
    valores.push(parseInt(filtros.limite));

    if (filtros.offset) {
      query += ' OFFSET ?';
      valores.push(parseInt(filtros.offset));
    }
  }

  const [rows] = await pool.query(query, valores);
  return rows;
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

  // Filtrar por estados
  if (estados.length > 0) {
    query += ` AND pi.estado IN (${estados.map(() => '?').join(',')})`;
    valores.push(...estados);
  }

  query += ' ORDER BY p.fecha_hora DESC, pi.id ASC';

  const [rows] = await pool.query(query, valores);
  return rows;
};

/**
 * Obtener items activos por destino (Pendiente, En Preparación, Listo)
 */
const obtenerItemsActivosPorDestino = async (destinoId) => {
  return obtenerItemsPorDestino(destinoId, ['Pendiente', 'En Preparación', 'Listo']);
};

/**
 * Actualizar estado general del pedido
 */
const actualizarEstadoGeneral = async (pedidoId, nuevoEstado) => {
  const query = `
    UPDATE pedidos
    SET estado_general = ?
    WHERE id = ?
  `;

  const [result] = await pool.query(query, [nuevoEstado, pedidoId]);
  return result.affectedRows > 0;
};

/**
 * Actualizar estado de un item específico
 */
const actualizarEstadoItem = async (itemId, nuevoEstado) => {
  const query = `
    UPDATE pedidos_items
    SET estado = ?
    WHERE id = ?
  `;

  const [result] = await pool.query(query, [nuevoEstado, itemId]);
  return result.affectedRows > 0;
};

/**
 * Obtener todos los items de un pedido
 */
const obtenerItemsPorPedidoId = async (pedidoId) => {
  const query = `
    SELECT 
      id, pedido_id, producto_id, cantidad, estado, destino_id, subtotal
    FROM pedidos_items
    WHERE pedido_id = ?
  `;

  const [rows] = await pool.query(query, [pedidoId]);
  return rows;
};

/**
 * Cancelar todos los items de un pedido
 */
const cancelarItemsPorPedidoId = async (pedidoId) => {
  const query = `
    UPDATE pedidos_items
    SET estado = 'Cancelado'
    WHERE pedido_id = ? AND estado != 'Entregado' AND estado != 'Cancelado'
  `;

  const [result] = await pool.query(query, [pedidoId]);
  return result.affectedRows;
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

/**
 * Verificar si un pedido existe
 */
const existe = async (pedidoId) => {
  const query = `SELECT id FROM pedidos WHERE id = ?`;
  const [rows] = await pool.query(query, [pedidoId]);
  return rows.length > 0;
};

/**
 * Contar total de pedidos con filtros
 */
const contarTodos = async (filtros = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM pedidos p
  `;

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
  return rows[0].total;
};

/**
 * Actualizar total del pedido
 */
const actualizarTotal = async (pedidoId, nuevoTotal) => {
  const query = `
    UPDATE pedidos
    SET total = ?
    WHERE id = ?
  `;

  const [result] = await pool.query(query, [nuevoTotal, pedidoId]);
  return result.affectedRows > 0;
};

const eliminar = async (pedidoId) => {
  // Primero eliminamos los items asociados
  const queryItems = `DELETE FROM pedidos_items WHERE pedido_id = ?`;
  await pool.query(queryItems, [pedidoId]);

  // Luego eliminamos la cabecera del pedido
  const queryPedido = `DELETE FROM pedidos WHERE id = ?`;
  const [result] = await pool.query(queryPedido, [pedidoId]);
  
  return result.affectedRows > 0;
};

module.exports = {
  crear,
  crearItem,
  obtenerPorId,
  obtenerTodos,
  obtenerItemsPorDestino,
  obtenerItemsActivosPorDestino,
  actualizarEstadoGeneral,
  actualizarEstadoItem,
  obtenerItemsPorPedidoId,
  cancelarItemsPorPedidoId,
  obtenerItemPorId,
  existe,
  contarTodos,
  actualizarTotal,
  eliminar
};