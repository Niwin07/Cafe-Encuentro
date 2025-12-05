const pool = require('../../conexion');

const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM destinos WHERE activo = 1');
  return rows;
};

const crear = async (nombre, descripcion) => {
  const [result] = await pool.query(
    'INSERT INTO destinos (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion]
  );
  return result.insertId;
};

const eliminar = async (id) => {
  // Soft delete: Lo desactivamos en lugar de borrarlo físico
  const [result] = await pool.query('UPDATE destinos SET activo = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
// Recuerda agregar 'eliminar' al module.exports = { ..., eliminar }

module.exports = { obtenerTodos, crear, eliminar };