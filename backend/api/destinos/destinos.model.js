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

module.exports = { obtenerTodos, crear };