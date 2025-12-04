const pool = require('../../conexion');

/**
 * Buscar cajera por usuario
 */
const buscarPorUsuario = async (usuario) => {
  const query = `
    SELECT id, nombre, usuario, password_hash, activo
    FROM cajeras
    WHERE usuario = ?
  `;
  
  const [rows] = await pool.query(query, [usuario]);
  return rows[0];
};

/**
 * Buscar cajera por ID
 */
const buscarPorId = async (id) => {
  const query = `
    SELECT id, nombre, usuario, activo, created_at, updated_at
    FROM cajeras
    WHERE id = ?
  `;
  
  const [rows] = await pool.query(query, [id]);
  return rows[0];
};

/**
 * Crear una nueva cajera
 */
const crear = async (nombre, usuario, passwordHash) => {
  const query = `
    INSERT INTO cajeras (nombre, usuario, password_hash)
    VALUES (?, ?, ?)
  `;
  
  const [result] = await pool.query(query, [nombre, usuario, passwordHash]);
  return result.insertId;
};

/**
 * Obtener todas las cajeras
 */
const obtenerTodas = async () => {
  const query = `
    SELECT id, nombre, usuario, activo, created_at, updated_at
    FROM cajeras
    ORDER BY nombre ASC
  `;
  
  const [rows] = await pool.query(query);
  return rows;
};

/**
 * Actualizar estado de cajera (activar/desactivar)
 */
const actualizarEstado = async (id, activo) => {
  const query = `
    UPDATE cajeras
    SET activo = ?
    WHERE id = ?
  `;
  
  const [result] = await pool.query(query, [activo, id]);
  return result.affectedRows > 0;
};

/**
 * Actualizar contraseña de cajera
 */
const actualizarPassword = async (id, nuevoPasswordHash) => {
  const query = `
    UPDATE cajeras
    SET password_hash = ?
    WHERE id = ?
  `;
  
  const [result] = await pool.query(query, [nuevoPasswordHash, id]);
  return result.affectedRows > 0;
};

module.exports = {
  buscarPorUsuario,
  buscarPorId,
  crear,
  obtenerTodas,
  actualizarEstado,
  actualizarPassword
};