const pool = require('../../conexion');

/**
 * Obtener todos los productos (con filtros opcionales)
 */
const obtenerTodos = async (filtros = {}) => {
  let query = `
    SELECT 
      p.id,
      p.nombre,
      p.descripcion,
      p.ingredientes,
      p.precio,
      p.stock,
      p.stock_minimo,
      p.activo,
      p.created_at,
      p.updated_at,
      c.id as categoria_id,
      c.nombre as categoria_nombre,
      d.id as destino_id,
      d.nombre as destino_nombre
    FROM productos p
    INNER JOIN categorias c ON p.categoria_id = c.id
    INNER JOIN destinos d ON p.destino_id = d.id
  `;

  const condiciones = [];
  const valores = [];

  // Filtrar por activo
  if (filtros.activo !== undefined) {
    condiciones.push('p.activo = ?');
    valores.push(filtros.activo);
  }

  // Filtrar por categoría
  if (filtros.categoria_id) {
    condiciones.push('p.categoria_id = ?');
    valores.push(filtros.categoria_id);
  }

  // Filtrar por destino
  if (filtros.destino_id) {
    condiciones.push('p.destino_id = ?');
    valores.push(filtros.destino_id);
  }

  // Filtrar por búsqueda de texto
  if (filtros.busqueda) {
    condiciones.push('(p.nombre LIKE ? OR p.ingredientes LIKE ?)');
    const busqueda = `%${filtros.busqueda}%`;
    valores.push(busqueda, busqueda);
  }

  // Agregar condiciones WHERE
  if (condiciones.length > 0) {
    query += ' WHERE ' + condiciones.join(' AND ');
  }

  query += ' ORDER BY p.nombre ASC';

  const [rows] = await pool.query(query, valores);
  return rows;
};

/**
 * Obtener producto por ID
 */
const obtenerPorId = async (id) => {
  const query = `
    SELECT 
      p.id,
      p.nombre,
      p.descripcion,
      p.ingredientes,
      p.precio,
      p.stock,
      p.stock_minimo,
      p.activo,
      p.created_at,
      p.updated_at,
      c.id as categoria_id,
      c.nombre as categoria_nombre,
      d.id as destino_id,
      d.nombre as destino_nombre
    FROM productos p
    INNER JOIN categorias c ON p.categoria_id = c.id
    INNER JOIN destinos d ON p.destino_id = d.id
    WHERE p.id = ?
  `;

  const [rows] = await pool.query(query, [id]);
  return rows[0];
};

/**
 * Obtener acompañamientos de un producto
 */
const obtenerAcompanamientos = async (productoId) => {
  const query = `
    SELECT 
      a.id,
      a.nombre,
      a.categoria,
      a.stock,  
      a.activo
    FROM acompanamientos a
    INNER JOIN productos_acompanamientos pa ON a.id = pa.acompanamiento_id
    WHERE pa.producto_id = ? AND a.activo = TRUE
    ORDER BY a.categoria, a.nombre
  `;

  const [rows] = await pool.query(query, [productoId]);
  return rows;
};

/**
 * Crear un nuevo producto
 */
const crear = async (producto) => {
  const query = `
    INSERT INTO productos (
      nombre, descripcion, ingredientes, precio, stock, stock_minimo,
      categoria_id, destino_id, activo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    producto.nombre,
    producto.descripcion || null,
    producto.ingredientes || null,
    producto.precio,
    producto.stock || 0,
    producto.stock_minimo || 5,
    producto.categoria_id,
    producto.destino_id,
    producto.activo !== undefined ? producto.activo : true
  ];

  const [result] = await pool.query(query, valores);
  return result.insertId;
};

/**
 * Actualizar un producto
 */
const actualizar = async (id, producto) => {
  const campos = [];
  const valores = [];

  if (producto.nombre !== undefined) {
    campos.push('nombre = ?');
    valores.push(producto.nombre);
  }
  if (producto.descripcion !== undefined) {
    campos.push('descripcion = ?');
    valores.push(producto.descripcion);
  }
  if (producto.ingredientes !== undefined) {
    campos.push('ingredientes = ?');
    valores.push(producto.ingredientes);
  }
  if (producto.precio !== undefined) {
    campos.push('precio = ?');
    valores.push(producto.precio);
  }
  if (producto.stock !== undefined) {
    campos.push('stock = ?');
    valores.push(producto.stock);
  }
  if (producto.stock_minimo !== undefined) {
    campos.push('stock_minimo = ?');
    valores.push(producto.stock_minimo);
  }
  if (producto.categoria_id !== undefined) {
    campos.push('categoria_id = ?');
    valores.push(producto.categoria_id);
  }
  if (producto.destino_id !== undefined) {
    campos.push('destino_id = ?');
    valores.push(producto.destino_id);
  }
  if (producto.activo !== undefined) {
    campos.push('activo = ?');
    valores.push(producto.activo);
  }

  if (campos.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  valores.push(id);

  const query = `UPDATE productos SET ${campos.join(', ')} WHERE id = ?`;
  const [result] = await pool.query(query, valores);
  
  return result.affectedRows > 0;
};

/**
 * Actualizar solo el stock de un producto
 */
const actualizarStock = async (id, nuevoStock) => {
  const query = `UPDATE productos SET stock = ? WHERE id = ?`;
  const [result] = await pool.query(query, [nuevoStock, id]);
  return result.affectedRows > 0;
};

/**
 * Incrementar o decrementar stock
 */
const ajustarStock = async (id, cantidad) => {
  const query = `
    UPDATE productos 
    SET stock = stock + ? 
    WHERE id = ?
  `;
  const [result] = await pool.query(query, [cantidad, id]);
  return result.affectedRows > 0;
};

/**
 * Eliminar producto (soft delete)
 */
const eliminar = async (id) => {
  const query = `UPDATE productos SET activo = FALSE WHERE id = ?`;
  const [result] = await pool.query(query, [id]);
  return result.affectedRows > 0;
};

/**
 * Eliminar producto permanentemente
 */
const eliminarPermanente = async (id) => {
  const query = `DELETE FROM productos WHERE id = ?`;
  const [result] = await pool.query(query, [id]);
  return result.affectedRows > 0;
};

/**
 * Asignar acompañamientos a un producto
 */
const asignarAcompanamientos = async (productoId, acompanamientosIds) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Eliminar acompañamientos existentes
    await connection.query(
      'DELETE FROM productos_acompanamientos WHERE producto_id = ?',
      [productoId]
    );

    // Insertar nuevos acompañamientos
    if (acompanamientosIds && acompanamientosIds.length > 0) {
      const valores = acompanamientosIds.map(acompId => [productoId, acompId]);
      await connection.query(
        'INSERT INTO productos_acompanamientos (producto_id, acompanamiento_id) VALUES ?',
        [valores]
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Verificar si un producto existe
 */
const existe = async (id) => {
  const query = `SELECT id FROM productos WHERE id = ?`;
  const [rows] = await pool.query(query, [id]);
  return rows.length > 0;
};

/**
 * Obtener productos con stock bajo
 */
const obtenerConStockBajo = async () => {
  const query = `
    SELECT 
      p.id,
      p.nombre,
      p.stock,
      p.stock_minimo,
      c.nombre as categoria_nombre,
      d.nombre as destino_nombre
    FROM productos p
    INNER JOIN categorias c ON p.categoria_id = c.id
    INNER JOIN destinos d ON p.destino_id = d.id
    WHERE p.stock <= p.stock_minimo AND p.activo = TRUE
    ORDER BY (p.stock - p.stock_minimo) ASC
  `;

  const [rows] = await pool.query(query);
  return rows;
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  obtenerAcompanamientos,
  crear,
  actualizar,
  actualizarStock,
  ajustarStock,
  eliminar,
  eliminarPermanente,
  asignarAcompanamientos,
  existe,
  obtenerConStockBajo,
  eliminarPermanente
};