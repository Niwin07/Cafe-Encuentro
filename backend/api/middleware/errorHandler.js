/**
 * Middleware global para manejo de errores
 * Debe ser el último middleware registrado en la aplicación
 */
const errorHandler = (err, req, res, next) => {
  // Log del error (en producción usar un logger como Winston)
  console.error('❌ Error capturado:', {
    mensaje: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ruta: req.path,
    metodo: req.method
  });

  // Errores de MySQL
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return res.status(409).json({
          error: 'Registro duplicado',
          mensaje: 'Ya existe un registro con esos datos',
          detalle: process.env.NODE_ENV === 'development' ? err.sqlMessage : undefined
        });

      case 'ER_NO_REFERENCED_ROW_2':
        return res.status(400).json({
          error: 'Referencia inválida',
          mensaje: 'El registro referenciado no existe'
        });

      case 'ER_ROW_IS_REFERENCED_2':
        return res.status(400).json({
          error: 'No se puede eliminar',
          mensaje: 'Este registro está siendo utilizado en otros lugares'
        });

      case 'ER_BAD_FIELD_ERROR':
        return res.status(400).json({
          error: 'Campo inválido',
          mensaje: 'Uno de los campos enviados no existe en la base de datos'
        });

      case 'ER_PARSE_ERROR':
        return res.status(500).json({
          error: 'Error de sintaxis SQL',
          mensaje: 'Error en la consulta a la base de datos'
        });

      case 'ECONNREFUSED':
        return res.status(503).json({
          error: 'Base de datos no disponible',
          mensaje: 'No se pudo conectar a la base de datos'
        });
    }
  }

  // Errores de validación personalizados
  if (err.tipo === 'VALIDACION') {
    return res.status(400).json({
      error: 'Error de validación',
      mensaje: err.message,
      campos: err.campos || []
    });
  }

  // Errores de negocio personalizados
  if (err.tipo === 'NEGOCIO') {
    return res.status(err.status || 400).json({
      error: err.titulo || 'Error de negocio',
      mensaje: err.message
    });
  }

  // Error por defecto
  const statusCode = err.status || err.statusCode || 500;
  const mensaje = statusCode === 500 
    ? 'Error interno del servidor' 
    : err.message || 'Ha ocurrido un error';

  res.status(statusCode).json({
    error: mensaje,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      detalles: err 
    })
  });
};

/**
 * Middleware para rutas no encontradas (404)
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    mensaje: `La ruta ${req.originalUrl} no existe`,
    metodo: req.method
  });
};

module.exports = { errorHandler, notFound };