const pool = require('../../conexion');

const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM acompanamientos WHERE activo = 1 ORDER BY categoria, nombre');
  return rows;
};

const crear = async (nombre, categoria) => {
  const [result] = await pool.query(
    'INSERT INTO acompanamientos (nombre, categoria) VALUES (?, ?)',
    [nombre, categoria]
  );
  return result.insertId;
};

const eliminar = async (id) => {
  // Soft delete (borrado lógico)
  const [result] = await pool.query('UPDATE acompanamientos SET activo = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { obtenerTodos, crear, eliminar };