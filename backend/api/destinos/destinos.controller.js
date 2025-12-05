const destinosModel = require('./destinos.model');

const obtenerTodos = async (req, res, next) => {
  try {
    const destinos = await destinosModel.obtenerTodos();
    res.json(destinos);
  } catch (error) {
    next(error);
  }
};

const crear = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    const id = await destinosModel.crear(nombre, descripcion);
    res.status(201).json({ mensaje: 'Destino creado', id });
  } catch (error) {
    next(error);
  }
};

// AGREGAR ESTA FUNCIÓN DE ACTUALIZAR
const actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    await destinosModel.actualizar(id, req.body);
    res.json({ mensaje: 'Actualizado correctamente' });
  } catch (error) { next(error); }
};

const eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Si mandamos ?fisico=true en la URL, borra de verdad
    if (req.query.fisico === 'true') {
      await destinosModel.eliminarPermanente(id);
      return res.json({ mensaje: 'Destino eliminado DEFINITIVAMENTE' });
    }

    // Si no, borrado lógico (soft)
    await destinosModel.eliminar(id);
    res.json({ mensaje: 'Destino desactivado' });
  } catch (error) {
    next(error);
  }
};
// Agrégala al export

module.exports = { obtenerTodos, crear, actualizar, eliminar };