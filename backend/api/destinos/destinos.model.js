const pool = require('../../conexion');

// 1. CAMBIAR ESTO (Quitamos "WHERE activo = 1")
const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM destinos'); // <--- Trae todo
  return rows;
};

const crear = async (nombre, descripcion) => {
  const query = `
    INSERT INTO destinos (nombre, descripcion, activo)
    VALUES (?, ?, 1)
  `;

  const [result] = await pool.query(query, [nombre, descripcion]);
  return result.insertId;
};


// 2. AGREGAR ESTO (Actualizar para poder reactivar)
const actualizar = async (id, datos) => {
  const campos = Object.keys(datos).map(key => `${key} = ?`).join(', ');
  const valores = [...Object.values(datos), id];
  const [result] = await pool.query(`UPDATE destinos SET ${campos} WHERE id = ?`, valores);
  return result.affectedRows > 0;
};

const eliminar = async (id) => { /* ... igual (soft delete) ... */ };

// 3. AGREGAR ESTO (Borrado real)
const eliminarPermanente = async (id) => {
  const [result] = await pool.query('DELETE FROM destinos WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { obtenerTodos, crear, actualizar, eliminar, eliminarPermanente };