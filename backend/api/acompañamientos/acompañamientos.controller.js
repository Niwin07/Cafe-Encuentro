const model = require('./acompanamientos.model');
const { MENSAJES_ERROR } = require('../utils/constants');

const obtenerTodos = async (req, res, next) => {
  try {
    const items = await model.obtenerTodos();
    res.json(items);
  } catch (error) {
    next(error);
  }
};

const crear = async (req, res, next) => {
  try {
    const { nombre, categoria } = req.body;
    const id = await model.crear(nombre, categoria);
    res.status(201).json({ mensaje: 'Acompañamiento creado', id, nombre });
  } catch (error) {
    next(error);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const exito = await model.eliminar(req.params.id);
    if (!exito) return res.status(404).json({ error: MENSAJES_ERROR.ACOMPANAMIENTO_NO_ENCONTRADO });
    res.json({ mensaje: 'Acompañamiento eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { obtenerTodos, crear, eliminar };