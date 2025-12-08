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
    const { nombre, categoria, stock } = req.body;
    // Si no envían stock, asumimos 0
    const stockInt = stock ? parseInt(stock) : 0;
    const id = await model.crear(nombre, categoria, stockInt);
    res.status(201).json({ mensaje: 'Acompañamiento creado', id, nombre, stock: stockInt });
  } catch (error) { next(error); }
};

const actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    const exito = await model.actualizar(id, datos);
    if (!exito) return res.status(404).json({ error: MENSAJES_ERROR.ACOMPANAMIENTO_NO_ENCONTRADO });
    res.json({ mensaje: 'Acompañamiento actualizado' });
  } catch (error) { next(error); }
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

module.exports = { obtenerTodos, crear, eliminar, actualizar };