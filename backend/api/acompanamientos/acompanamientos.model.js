const pool = require('../../conexion');

// Obtener todos
const obtenerTodos = async () => {
  const query = `
    SELECT 
      a.id, 
      a.nombre, 
      a.categoria, 
      a.activo, 
      a.producto_vinculado_id,
      -- Si hay producto vinculado, mostramos su stock, si no, el del acompañamiento
      COALESCE(p.stock, a.stock) as stock 
    FROM acompanamientos a
    LEFT JOIN productos p ON a.producto_vinculado_id = p.id
    ORDER BY a.categoria, a.nombre
  `;
  const [rows] = await pool.query(query);
  return rows;
};

// Crear
const crear = async (nombre, categoria, stock = 0, producto_vinculado_id = null) => {
  const query = `
    INSERT INTO acompanamientos (nombre, categoria, stock, producto_vinculado_id, activo)
    VALUES (?, ?, ?, ?, 1)
  `;
  // Si hay producto vinculado, el stock propio se ignora (o se pone en 0)
  const stockReal = producto_vinculado_id ? 0 : stock;
  const [result] = await pool.query(query, [nombre, categoria, stockReal, producto_vinculado_id]);
  return result.insertId;
};

// Actualizar (Corregido y protegido)
const actualizar = async (id, datos) => {
  const camposValidos = ['nombre', 'categoria', 'stock', 'activo', 'producto_vinculado_id'];
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