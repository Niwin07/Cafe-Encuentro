const pool = require('../../conexion');

const obtenerTodas = async () => {
  const [rows] = await pool.query('SELECT * FROM categorias ORDER BY nombre ASC');
  return rows;
};

const obtenerPorId = async (id) => {
  const [rows] = await pool.query('SELECT * FROM categorias WHERE id = ?', [id]);
  return rows[0];
};

const crear = async (nombre, descripcion) => {
  const [result] = await pool.query(
    'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion]
  );
  return result.insertId;
};

const actualizar = async (id, nombre, descripcion) => {
  const [result] = await pool.query(
    'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?',
    [nombre, descripcion, id]
  );
  return result.affectedRows > 0;
};

const eliminar = async (id) => {
  // Nota: Si hay productos usando esta categoría, MySQL dará error por FK (protección)
  const [result] = await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { obtenerTodas, obtenerPorId, crear, actualizar, eliminar };