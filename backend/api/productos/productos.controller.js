const productosModel = require('./productos.model');
const { generarYGuardarImagen } = require('./imagenIA.service');
const { MENSAJES_ERROR, MENSAJES_EXITO } = require('../utils/constants');

/**
 * Agrega a cada producto su lista de acompañamientos con UNA sola consulta.
 */
const adjuntarAcompanamientos = async (productos) => {
  const mapa = await productosModel.obtenerAcompanamientosPorProductos(productos.map(p => p.id));
  return productos.map(producto => ({ producto, acompanamientos: mapa.get(producto.id) || [] }));
};

/**
 * Valida precio/stock numéricos. Devuelve un mensaje de error o null.
 */
const validarNumerosProducto = ({ precio, stock, stock_minimo }) => {
  if (precio !== undefined && !(Number(precio) > 0)) return 'El precio debe ser un número mayor a 0';
  for (const [campo, valor] of [['stock', stock], ['stock_minimo', stock_minimo]]) {
    if (valor !== undefined && valor !== '' && !(Number.isInteger(Number(valor)) && Number(valor) >= 0)) {
      return `El campo ${campo} debe ser un entero mayor o igual a 0`;
    }
  }
  return null;
};

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
    const productosConAcompanamientos = (await adjuntarAcompanamientos(productos))
      .map(({ producto, acompanamientos }) => ({ ...producto, acompanamientos }));

    res.json({
      total: productosConAcompanamientos.length,
      productos: productosConAcompanamientos
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener menú público (solo productos activos)
 * GET /api/productos/menu
 */
const obtenerMenu = async (req, res, next) => {
  try {
    const productos = await productosModel.obtenerTodos({ activo: true });

    const menu = (await adjuntarAcompanamientos(productos)).map(({ producto, acompanamientos }) => ({
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
    }));

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

    const errorNumeros = validarNumerosProducto(productoData);
    if (errorNumeros) {
      return res.status(400).json({ error: 'Datos inválidos', mensaje: errorNumeros });
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

    const errorNumeros = validarNumerosProducto(productoData);
    if (errorNumeros) {
      return res.status(400).json({ error: 'Datos inválidos', mensaje: errorNumeros });
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
 */
const generarImagen = async (req, res, next) => {
  try {
    const { id } = req.params;

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
      descripcion: producto.descripcion
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
      if (!Number.isInteger(Number(ajuste))) {
        return res.status(400).json({ error: 'Ajuste inválido', mensaje: 'El ajuste debe ser un número entero' });
      }
      const ajustado = await productosModel.ajustarStock(id, Number(ajuste));
      if (!ajustado) {
        return res.status(400).json({ error: 'Stock inválido', mensaje: 'El ajuste dejaría el stock en negativo' });
      }
    } 
    // Si es un valor absoluto
    else if (stock !== undefined) {
      if (!(Number.isInteger(Number(stock)) && Number(stock) >= 0)) {
        return res.status(400).json({
          error: 'Stock inválido',
          mensaje: 'El stock debe ser un entero mayor o igual a 0'
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