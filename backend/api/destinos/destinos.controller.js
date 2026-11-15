const destinosModel = require('./destinos.model');
const { MENSAJES_ERROR } = require('../utils/constants');

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

const actualizar = async (req, res, next) => {
  try {
    const exito = await destinosModel.actualizar(req.params.id, req.body);
    if (!exito) {
      return res.status(404).json({ error: MENSAJES_ERROR.DESTINO_NO_ENCONTRADO, mensaje: MENSAJES_ERROR.DESTINO_NO_ENCONTRADO });
    }
    res.json({ mensaje: 'Actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ?fisico=true borra de verdad (falla por FK si hay productos/pedidos que lo usan)
    const exito = req.query.fisico === 'true'
      ? await destinosModel.eliminarPermanente(id)
      : await destinosModel.eliminar(id);

    if (!exito) {
      return res.status(404).json({ error: MENSAJES_ERROR.DESTINO_NO_ENCONTRADO, mensaje: MENSAJES_ERROR.DESTINO_NO_ENCONTRADO });
    }
    res.json({ mensaje: req.query.fisico === 'true' ? 'Destino eliminado DEFINITIVAMENTE' : 'Destino desactivado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { obtenerTodos, crear, actualizar, eliminar };
