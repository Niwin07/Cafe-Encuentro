const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authModel = require('./auth.model');
const { MENSAJES_ERROR, MENSAJES_EXITO, JWT_EXPIRACION } = require('../utils/constants');

/**
 * Login de cajera
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { usuario, password } = req.body;

    // Validar campos requeridos
    if (!usuario || !password) {
      return res.status(400).json({
        error: 'Campos requeridos',
        mensaje: 'Usuario y contraseña son obligatorios'
      });
    }

    // Buscar cajera
    const cajera = await authModel.buscarPorUsuario(usuario);

    if (!cajera) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: MENSAJES_ERROR.CREDENCIALES_INVALIDAS
      });
    }

    // Verificar si está activa
    if (!cajera.activo) {
      return res.status(403).json({
        error: 'Usuario inactivo',
        mensaje: MENSAJES_ERROR.USUARIO_INACTIVO
      });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, cajera.password_hash);

    if (!passwordValido) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: MENSAJES_ERROR.CREDENCIALES_INVALIDAS
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: cajera.id,
        nombre: cajera.nombre,
        usuario: cajera.usuario
      },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRACION }
    );

    res.json({
      mensaje: MENSAJES_EXITO.LOGIN_EXITOSO,
      token,
      cajera: {
        id: cajera.id,
        nombre: cajera.nombre,
        usuario: cajera.usuario
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verificar sesión (validar token)
 * GET /api/auth/verificar
 */
const verificarSesion = async (req, res, next) => {
  try {
    // El middleware verificarToken ya validó el token
    // y guardó la info en req.cajera
    
    // Buscar datos actualizados de la cajera
    const cajera = await authModel.buscarPorId(req.cajera.id);

    if (!cajera) {
      return res.status(404).json({
        error: 'Cajera no encontrada',
        mensaje: MENSAJES_ERROR.CAJERA_NO_ENCONTRADA
      });
    }

    if (!cajera.activo) {
      return res.status(403).json({
        error: 'Usuario inactivo',
        mensaje: MENSAJES_ERROR.USUARIO_INACTIVO
      });
    }

    res.json({
      valido: true,
      cajera: {
        id: cajera.id,
        nombre: cajera.nombre,
        usuario: cajera.usuario
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Registro de nueva cajera (requiere estar autenticado como cajera)
 * POST /api/auth/registro
 */
const registro = async (req, res, next) => {
  try {
    const { nombre, usuario, password } = req.body;

    // Validar campos requeridos
    if (!nombre || !usuario || !password) {
      return res.status(400).json({
        error: 'Campos requeridos',
        mensaje: 'Nombre, usuario y contraseña son obligatorios'
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Contraseña muy corta',
        mensaje: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el usuario ya existe
    const cajeraExistente = await authModel.buscarPorUsuario(usuario);

    if (cajeraExistente) {
      return res.status(409).json({
        error: 'Usuario ya existe',
        mensaje: 'El nombre de usuario ya está en uso'
      });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear cajera
    const cajeraId = await authModel.crear(nombre, usuario, passwordHash);

    // Generar token
    const token = jwt.sign(
      {
        id: cajeraId,
        nombre,
        usuario
      },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRACION }
    );

    res.status(201).json({
      mensaje: 'Cajera registrada exitosamente',
      token,
      cajera: {
        id: cajeraId,
        nombre,
        usuario
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las cajeras
 * GET /api/auth/cajeras
 */
const obtenerCajeras = async (req, res, next) => {
  try {
    const cajeras = await authModel.obtenerTodas();

    res.json({
      total: cajeras.length,
      cajeras
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar contraseña
 * PATCH /api/auth/cambiar-password
 */
const cambiarPassword = async (req, res, next) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;
    const cajeraId = req.cajera.id; // Del token JWT

    // Validar campos
    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({
        error: 'Campos requeridos',
        mensaje: 'Contraseña actual y nueva son obligatorias'
      });
    }

    if (passwordNuevo.length < 6) {
      return res.status(400).json({
        error: 'Contraseña muy corta',
        mensaje: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Buscar cajera
    const cajera = await authModel.buscarPorUsuario(req.cajera.usuario);

    // Verificar contraseña actual
    const passwordValido = await bcrypt.compare(passwordActual, cajera.password_hash);

    if (!passwordValido) {
      return res.status(401).json({
        error: 'Contraseña incorrecta',
        mensaje: 'La contraseña actual no es correcta'
      });
    }

    // Hash de nueva contraseña
    const nuevoPasswordHash = await bcrypt.hash(passwordNuevo, 10);

    // Actualizar
    await authModel.actualizarPassword(cajeraId, nuevoPasswordHash);

    res.json({
      mensaje: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  verificarSesion,
  registro,
  obtenerCajeras,
  cambiarPassword
};