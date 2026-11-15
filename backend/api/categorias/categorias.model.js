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
    [nombre, descripcion || null]
  );
  return result.insertId;
};

// Actualización parcial: el panel solo envía `nombre`; antes se pisaba
// `descripcion` con NULL.
const CAMPOS_ACTUALIZABLES = ['nombre', 'descripcion'];

const actualizar = async (id, datos) => {
  const campos = Object.keys(datos).filter(key => CAMPOS_ACTUALIZABLES.includes(key));
  if (campos.length === 0) return false;

  const set = campos.map(key => `${key} = ?`).join(', ');
  const [result] = await pool.query(
    `UPDATE categorias SET ${set} WHERE id = ?`,
    [...campos.map(key => datos[key]), id]
  );
  return result.affectedRows > 0;
};

const eliminar = async (id) => {
  // Nota: Si hay productos usando esta categoría, MySQL dará error por FK (protección)
  const [result] = await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { obtenerTodas, obtenerPorId, crear, actualizar, eliminar };