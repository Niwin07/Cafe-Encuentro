const categoriasModel = require('./categorias.model');
const { MENSAJES_ERROR } = require('../utils/constants');

const obtenerTodas = async (req, res, next) => {
  try {
    const categorias = await categoriasModel.obtenerTodas();
    res.json(categorias);
  } catch (error) {
    next(error);
  }
};

const crear = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    const id = await categoriasModel.crear(nombre, descripcion);
    res.status(201).json({ mensaje: 'Categoría creada', id, nombre });
  } catch (error) {
    next(error);
  }
};

// PUT /api/categorias/:id (antes no existía: editar desde el panel daba 404)
const actualizar = async (req, res, next) => {
  try {
    const exito = await categoriasModel.actualizar(req.params.id, req.body);
    if (!exito) {
      return res.status(404).json({ error: MENSAJES_ERROR.CATEGORIA_NO_ENCONTRADA, mensaje: MENSAJES_ERROR.CATEGORIA_NO_ENCONTRADA });
    }
    res.json({ mensaje: 'Categoría actualizada' });
  } catch (error) {
    next(error);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const exito = await categoriasModel.eliminar(req.params.id);
    if (!exito) return res.status(404).json({ error: MENSAJES_ERROR.CATEGORIA_NO_ENCONTRADA });
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) {
    // Manejo especial para error de llave foránea (si tiene productos asociados)
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'No se puede eliminar', mensaje: 'Hay productos usando esta categoría' });
    }
    next(error);
  }
};

module.exports = { obtenerTodas, crear, actualizar, eliminar };