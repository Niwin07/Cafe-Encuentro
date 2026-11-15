const pool = require('../../conexion');

// Trae activos e inactivos (el panel de admin permite reactivar)
const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM destinos');
  return rows;
};

const crear = async (nombre, descripcion) => {
  const query = `
    INSERT INTO destinos (nombre, descripcion, activo)
    VALUES (?, ?, TRUE)
  `;

  const [result] = await pool.query(query, [nombre, descripcion || null]);
  return result.insertId;
};

// Solo estas columnas pueden actualizarse. Antes se interpolaban las claves
// de req.body directamente en el SQL (`${key} = ?`), lo que permitía
// inyección SQL a través del nombre del campo.
const CAMPOS_ACTUALIZABLES = ['nombre', 'descripcion', 'activo'];

const actualizar = async (id, datos) => {
  const campos = Object.keys(datos).filter(key => CAMPOS_ACTUALIZABLES.includes(key));
  if (campos.length === 0) return false;

  const set = campos.map(key => `${key} = ?`).join(', ');
  const valores = [...campos.map(key => datos[key]), id];
  const [result] = await pool.query(`UPDATE destinos SET ${set} WHERE id = ?`, valores);
  return result.affectedRows > 0;
};

// Borrado lógico. Antes era un stub vacío: respondía "Destino desactivado"
// pero no hacía nada.
const eliminar = async (id) => {
  const [result] = await pool.query('UPDATE destinos SET activo = FALSE WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

const eliminarPermanente = async (id) => {
  const [result] = await pool.query('DELETE FROM destinos WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { obtenerTodos, crear, actualizar, eliminar, eliminarPermanente };
