const pool = require('../../conexion');

// 1. CAMBIAR (Quitar WHERE activo = 1)
const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM acompanamientos ORDER BY categoria, nombre');
  return rows;
};

const crear = async (nombre, categoria) => { /* ... igual ... */ };

// ... imports ...

// AGREGAR ESTA FUNCIÓN DE ACTUALIZAR
const actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    await destinosModel.actualizar(id, req.body);
    res.json({ mensaje: 'Actualizado correctamente' });
  } catch (error) { next(error); }
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