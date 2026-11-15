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
    // MODIFICADO: Extraemos producto_vinculado_id del body
    const { nombre, categoria, stock, producto_vinculado_id } = req.body;
    
    // Si no envían stock, asumimos 0
    const stockInt = stock ? parseInt(stock) : 0;
    
    // Si envían string vacío o "0", lo convertimos a null
    const prodVinculadoId = producto_vinculado_id ? parseInt(producto_vinculado_id) : null;

    const id = await model.crear(nombre, categoria, stockInt, prodVinculadoId);
    
    res.status(201).json({ 
        mensaje: 'Acompañamiento creado', 
        id, 
        nombre, 
        stock: stockInt,
        producto_vinculado_id: prodVinculadoId 
    });
  } catch (error) { next(error); }
};

const actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    
    // Convertir a null si viene vacío para desvincular
    if (datos.producto_vinculado_id === "") {
        datos.producto_vinculado_id = null;
    }

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