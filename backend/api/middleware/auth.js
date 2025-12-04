const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar que el usuario esté autenticado
 * Verifica el token JWT en el header Authorization
 */
const verificarToken = (req, res, next) => {
  try {
    // Extraer token del header: "Bearer TOKEN"
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'No autorizado',
        mensaje: 'No se proporcionó token de autenticación' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No autorizado',
        mensaje: 'Formato de token inválido' 
      });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Guardar información de la cajera en la request
    req.cajera = {
      id: decoded.id,
      nombre: decoded.nombre,
      usuario: decoded.usuario
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        mensaje: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        mensaje: 'El token proporcionado no es válido' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Error de autenticación',
      mensaje: error.message 
    });
  }
};

/**
 * Middleware opcional - No requiere autenticación pero si hay token lo verifica
 */
const verificarTokenOpcional = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.cajera = {
        id: decoded.id,
        nombre: decoded.nombre,
        usuario: decoded.usuario
      };
    }
    
    next();
  } catch (error) {
    // Si el token es inválido, continuamos sin autenticación
    next();
  }
};

module.exports = { 
  verificarToken,
  verificarTokenOpcional
};