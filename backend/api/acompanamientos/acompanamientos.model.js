const pool = require('../../conexion');

// Obtener todos
const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM acompanamientos ORDER BY categoria, nombre');
  return rows;
};

// Crear
const crear = async (nombre, categoria, stock = 0) => {
  const query = `
    INSERT INTO acompanamientos (nombre, categoria, stock, activo)
    VALUES (?, ?, ?, 1)
  `;
  const [result] = await pool.query(query, [nombre, categoria, stock]);
  return result.insertId;
};

// Actualizar (Corregido y protegido)
const actualizar = async (id, datos) => {
  // Limpiamos los datos para evitar campos que no existen en la BD
  const camposValidos = ['nombre', 'categoria', 'stock', 'activo'];
  const datosLimpios = {};
  
  Object.keys(datos).forEach(key => {
    if (camposValidos.includes(key)) {
      datosLimpios[key] = datos[key];
    }
  });

  if (Object.keys(datosLimpios).length === 0) return false;

  const campos = Object.keys(datosLimpios).map(key => `${key} = ?`).join(', ');
  const valores = [...Object.values(datosLimpios), id];
  
  const [result] = await pool.query(`UPDATE acompanamientos SET ${campos} WHERE id = ?`, valores);
  return result.affectedRows > 0;
};

// Eliminar (Soft Delete - Desactivar)
const eliminar = async (id) => {
  const [result] = await pool.query('UPDATE acompanamientos SET activo = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

// Eliminar Físico (Opcional, para limpieza real)
const eliminarPermanente = async (id) => {
  const [result] = await pool.query('DELETE FROM acompanamientos WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { obtenerTodos, crear, actualizar, eliminar, eliminarPermanente };