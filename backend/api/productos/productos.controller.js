const productosModel = require('./productos.model');
const { generarYGuardarImagen } = require('./imagenIA.service');
const { MENSAJES_ERROR, MENSAJES_EXITO } = require('../utils/constants');

/**
 * Obtener todos los productos (público o con filtros)
 * GET /api/productos
 * Query params: activo, categoria_id, destino_id, busqueda
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const filtros = {
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
      categoria_id: req.query.categoria_id,
      destino_id: req.query.destino_id,
      busqueda: req.query.busqueda
    };

    const productos = await productosModel.obtenerTodos(filtros);

    // Si es público (sin token), obtener también acompañamientos
    const productosConAcompanamientos = await Promise.all(
      productos.map(async (producto) => {
        const acompanamientos = await productosModel.obtenerAcompanamientos(producto.id);
        return {
          ...producto,
          acompanamientos
        };
      })
    );

    res.json({
      total: productosConAcompanamientos.length,
      productos: productosConAcompanamientos
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener menú público (solo productos activos con stock)
 * GET /api/productos/menu
 */
const obtenerMenu = async (req, res, next) => {
  try {
    const filtros = {
      activo: true
    };

    const productos = await productosModel.obtenerTodos(filtros);

    // Obtener acompañamientos para cada producto
    const menu = await Promise.all(
      productos.map(async (producto) => {
        const acompanamientos = await productosModel.obtenerAcompanamientos(producto.id);
        return {
          id: producto.id,
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          ingredientes: producto.ingredientes,
          precio: producto.precio,
          stock: producto.stock,
          imagen_url: producto.imagen_url,
          categoria: {
            id: producto.categoria_id,
            nombre: producto.categoria_nombre
          },
          destino: {
            id: producto.destino_id,
            nombre: producto.destino_nombre
          },
          acompanamientos
        };
      })
    );

    res.json({
      total: menu.length,
      menu
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un producto por ID
 * GET /api/productos/:id
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const producto = await productosModel.obtenerPorId(id);

    if (!producto) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: MENSAJES_ERROR.PRODUCTO_NO_ENCONTRADO
      });
    }

    // Obtener acompañamientos
    const acompanamientos = await productosModel.obtenerAcompanamientos(id);

    res.json({
      ...producto,
      acompanamientos
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Crear un nuevo producto (protegido - requiere autenticación)
 * POST /api/productos
 */
const crear = async (req, res, next) => {
  try {
    const { acompanamientos_ids, ...productoData } = req.body;

    // Validaciones básicas
    if (!productoData.nombre || !productoData.precio) {
      return res.status(400).json({
        error: 'Campos requeridos',
        mensaje: 'Nombre y precio son obligatorios'
      });
    }

    if (productoData.precio <= 0) {
      return res.status(400).json({
        error: 'Precio inválido',
        mensaje: 'El precio debe ser mayor a 0'
      });
    }

    // Crear producto
    const productoId = await productosModel.crear(productoData);

    // Asignar acompañamientos si se proporcionaron
    if (acompanamientos_ids && acompanamientos_ids.length > 0) {
      await productosModel.asignarAcompanamientos(productoId, acompanamientos_ids);
    }

    // Obtener el producto creado completo
    const productoCreado = await productosModel.obtenerPorId(productoId);
    const acompanamientos = await productosModel.obtenerAcompanamientos(productoId);

    res.status(201).json({
      mensaje: MENSAJES_EXITO.PRODUCTO_CREADO,
      producto: {
        ...productoCreado,
        acompanamientos
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar un producto (protegido)
 * PUT /api/productos/:id
 */
const actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { acompanamientos_ids, ...productoData } = req.body;

    // Verificar si existe
    const existe = await productosModel.existe(id);
    if (!existe) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: MENSAJES_ERROR.PRODUCTO_NO_ENCONTRADO
      });
    }

    // Validar precio si se proporciona
    if (productoData.precio !== undefined && productoData.precio <= 0) {
      return res.status(400).json({
        error: 'Precio inválido',
        mensaje: 'El precio debe ser mayor a 0'
      });
    }

    // Actualizar producto
    await productosModel.actualizar(id, productoData);

    // Actualizar acompañamientos si se proporcionaron
    if (acompanamientos_ids !== undefined) {
      await productosModel.asignarAcompanamientos(id, acompanamientos_ids);
    }

    // Obtener producto actualizado
    const productoActualizado = await productosModel.obtenerPorId(id);
    const acompanamientos = await productosModel.obtenerAcompanamientos(id);

    res.json({
      mensaje: MENSAJES_EXITO.PRODUCTO_ACTUALIZADO,
      producto: {
        ...productoActualizado,
        acompanamientos
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Generar (con IA) y guardar la imagen de un producto (protegido)
 * POST /api/productos/:id/generar-imagen
 * Body opcional: { imagen_referencia_url }
 */
const generarImagen = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imagen_referencia_url } = req.body;

    const producto = await productosModel.obtenerPorId(id);
    if (!producto) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: MENSAJES_ERROR.PRODUCTO_NO_ENCONTRADO
      });
    }

    const imagenUrl = await generarYGuardarImagen({
      productoId: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      imagenReferenciaUrl: imagen_referencia_url
    });

    await productosModel.actualizarImagen(id, imagenUrl);

    res.json({
      mensaje: 'Imagen generada correctamente',
      imagen_url: imagenUrl
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar stock de un producto (protegido)
 * PATCH /api/productos/:id/stock
 */
const actualizarStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stock, ajuste } = req.body;

    // Verificar si existe
    const existe = await productosModel.existe(id);
    if (!existe) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: MENSAJES_ERROR.PRODUCTO_NO_ENCONTRADO
      });
    }

    // Si es un ajuste (+/-)
    if (ajuste !== undefined) {
      await productosModel.ajustarStock(id, ajuste);
    } 
    // Si es un valor absoluto
    else if (stock !== undefined) {
      if (stock < 0) {
        return res.status(400).json({
          error: 'Stock inválido',
          mensaje: 'El stock no puede ser negativo'
        });
      }
      await productosModel.actualizarStock(id, stock);
    } 
    else {
      return res.status(400).json({
        error: 'Parámetro requerido',
        mensaje: 'Debes proporcionar "stock" o "ajuste"'
      });
    }

    // Obtener producto actualizado
    const productoActualizado = await productosModel.obtenerPorId(id);

    res.json({
      mensaje: MENSAJES_EXITO.STOCK_ACTUALIZADO,
      producto: productoActualizado
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar producto (soft delete) (protegido)
 * DELETE /api/productos/:id
 */
const eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si existe
    const existe = await productosModel.existe(id);
    if (!existe) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: MENSAJES_ERROR.PRODUCTO_NO_ENCONTRADO
      });
    }

    await productosModel.eliminar(id);

    res.json({
      mensaje: MENSAJES_EXITO.PRODUCTO_ELIMINADO
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener productos con stock bajo (protegido)
 * GET /api/productos/stock-bajo
 */
const obtenerStockBajo = async (req, res, next) => {
  try {
    const productos = await productosModel.obtenerConStockBajo();

    res.json({
      total: productos.length,
      productos
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTodos,
  obtenerMenu,
  obtenerPorId,
  crear,
  actualizar,
  generarImagen,
  actualizarStock,
  eliminar,
  obtenerStockBajo
};