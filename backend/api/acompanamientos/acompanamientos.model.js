const pool = require('../../conexion');

// 1. CAMBIAR (Quitar WHERE activo = 1)
const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM acompanamientos ORDER BY categoria, nombre');
  return rows;
};

const crear = async (nombre, categoria, stock = 0) => {
  const query = `
    INSERT INTO acompanamientos (nombre, categoria, stock, activo)
    VALUES (?, ?, ?, 1)
  `;
  const [result] = await pool.query(query, [nombre, categoria, stock]);
  return result.insertId;
};

// AGREGAR ESTA FUNCIÓN DE ACTUALIZAR
const actualizar = async (id, datos) => {
  const campos = Object.keys(datos).map(key => `${key} = ?`).join(', ');
  const valores = [...Object.values(datos), id];
  const [result] = await pool.query(`UPDATE acompanamientos SET ${campos} WHERE id = ?`, valores);
  return result.affectedRows > 0;
};

// MODIFICAR ELIMINAR
const eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Si mandamos ?fisico=true en la URL, borra de verdad
    if (req.query.fisico === 'true') {
      await destinosModel.eliminarPermanente(id);
      return res.json({ mensaje: 'Acompañamiento eliminado DEFINITIVAMENTE' });
    }

    // Si no, borrado lógico (soft)
    await destinosModel.eliminar(id);
    res.json({ mensaje: 'Acompañamiento desactivado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { obtenerTodos, crear, actualizar, eliminar };

// 3. AGREGAR Borrado Físico
const eliminarPermanente = async (id) => {
  const [result] = await pool.query('DELETE FROM acompanamientos WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { obtenerTodos, crear, actualizar, eliminar, eliminarPermanente };