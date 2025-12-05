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

const eliminar = async (req, res, next) => {
  try {
    await destinosModel.eliminar(req.params.id);
    res.json({ mensaje: 'Destino eliminado' });
  } catch (error) { next(error); }
};
// Agrégala al export

module.exports = { obtenerTodos, crear, eliminar };