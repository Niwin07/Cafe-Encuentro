/**
 * Middleware para validar campos requeridos en el body
 */
const validarCamposRequeridos = (campos) => {
  return (req, res, next) => {
    const camposFaltantes = [];
    
    campos.forEach(campo => {
      if (req.body[campo] === undefined || req.body[campo] === null || req.body[campo] === '') {
        camposFaltantes.push(campo);
      }
    });

    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        mensaje: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        campos: camposFaltantes
      });
    }

    next();
  };
};

/**
 * Middleware para validar que un campo sea un número
 */
const validarNumero = (campo, opciones = {}) => {
  return (req, res, next) => {
    const valor = req.body[campo] || req.params[campo] || req.query[campo];
    
    if (valor === undefined || valor === null) {
      if (opciones.requerido) {
        return res.status(400).json({
          error: 'Campo requerido',
          mensaje: `El campo ${campo} es obligatorio`
        });
      }
      return next();
    }

    const numero = Number(valor);
    
    if (isNaN(numero)) {
      return res.status(400).json({
        error: 'Tipo de dato inválido',
        mensaje: `El campo ${campo} debe ser un número`
      });
    }

    if (opciones.min !== undefined && numero < opciones.min) {
      return res.status(400).json({
        error: 'Valor inválido',
        mensaje: `El campo ${campo} debe ser mayor o igual a ${opciones.min}`
      });
    }

    if (opciones.max !== undefined && numero > opciones.max) {
      return res.status(400).json({
        error: 'Valor inválido',
        mensaje: `El campo ${campo} debe ser menor o igual a ${opciones.max}`
      });
    }

    next();
  };
};

/**
 * Middleware para validar que un campo sea un email válido
 */
const validarEmail = (campo) => {
  return (req, res, next) => {
    const email = req.body[campo];
    
    if (!email) {
      return res.status(400).json({
        error: 'Campo requerido',
        mensaje: `El campo ${campo} es obligatorio`
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        mensaje: `El formato del email no es válido`
      });
    }

    next();
  };
};

/**
 * Middleware para validar longitud de string
 */
const validarLongitud = (campo, min, max) => {
  return (req, res, next) => {
    const valor = req.body[campo];
    
    if (!valor) {
      return res.status(400).json({
        error: 'Campo requerido',
        mensaje: `El campo ${campo} es obligatorio`
      });
    }

    if (typeof valor !== 'string') {
      return res.status(400).json({
        error: 'Tipo de dato inválido',
        mensaje: `El campo ${campo} debe ser texto`
      });
    }

    if (valor.length < min) {
      return res.status(400).json({
        error: 'Valor muy corto',
        mensaje: `El campo ${campo} debe tener al menos ${min} caracteres`
      });
    }

    if (max && valor.length > max) {
      return res.status(400).json({
        error: 'Valor muy largo',
        mensaje: `El campo ${campo} no puede tener más de ${max} caracteres`
      });
    }

    next();
  };
};

/**
 * Middleware para validar que un valor esté en una lista permitida
 */
const validarEnum = (campo, valoresPermitidos) => {
  return (req, res, next) => {
    const valor = req.body[campo] || req.params[campo] || req.query[campo];
    
    if (!valor) {
      return res.status(400).json({
        error: 'Campo requerido',
        mensaje: `El campo ${campo} es obligatorio`
      });
    }

    if (!valoresPermitidos.includes(valor)) {
      return res.status(400).json({
        error: 'Valor inválido',
        mensaje: `El campo ${campo} debe ser uno de: ${valoresPermitidos.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware para sanitizar datos (prevenir inyecciones)
 */
const sanitizar = (req, res, next) => {
  // Sanitizar body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitizar query params
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

module.exports = {
  validarCamposRequeridos,
  validarNumero,
  validarEmail,
  validarLongitud,
  validarEnum,
  sanitizar
};