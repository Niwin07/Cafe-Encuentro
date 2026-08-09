const pool = require('../../conexion');

// Solo destinos activos: el listado es público y se usa para poblar
// selects (p.ej. al crear un producto), no debe ofrecer destinos
// desactivados (ver auditoría — antes traía todo, incluidos los soft-deleted).
const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM destinos WHERE activo = 1 ORDER BY nombre ASC');
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


// Actualizar (columnas whiteliseadas: nunca construir el SET a partir de
// claves arbitrarias del body, es una inyección SQL — ver auditoría de seguridad)
const actualizar = async (id, datos) => {
  const camposValidos = ['nombre', 'descripcion', 'activo'];
  const datosLimpios = {};

  Object.keys(datos).forEach(key => {
    if (camposValidos.includes(key)) {
      datosLimpios[key] = datos[key];
    }
  });

  if (Object.keys(datosLimpios).length === 0) return false;

  const campos = Object.keys(datosLimpios).map(key => `${key} = ?`).join(', ');
  const valores = [...Object.values(datosLimpios), id];

  const [result] = await pool.query(`UPDATE destinos SET ${campos} WHERE id = ?`, valores);
  return result.affectedRows > 0;
};

// Borrado lógico (desactivar)
const eliminar = async (id) => {
  const [result] = await pool.query('UPDATE destinos SET activo = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

// Borrado real
const eliminarPermanente = async (id) => {
  const [result] = await pool.query('DELETE FROM destinos WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { obtenerTodos, crear, actualizar, eliminar, eliminarPermanente };