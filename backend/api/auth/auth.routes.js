const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verificarToken } = require('../middleware/auth');
const { validarCamposRequeridos } = require('../middleware/validator');

// Ruta pública
router.post(
  '/login',
  validarCamposRequeridos(['usuario', 'password']),
  authController.login
);

// Alta de cajeras: SOLO desde el panel de administración (requiere sesión).
// Antes era pública: cualquiera podía crearse un usuario y obtener un token
// con acceso total (borrar pedidos, cambiar precios/stock, etc.).
router.post(
  '/registro',
  verificarToken,
  validarCamposRequeridos(['nombre', 'usuario', 'password']),
  authController.registro
);

// Rutas protegidas (requieren autenticación)
router.get(
  '/verificar',
  verificarToken,
  authController.verificarSesion
);

router.get(
  '/cajeras',
  verificarToken,
  authController.obtenerCajeras
);

router.patch(
  '/cambiar-password',
  verificarToken,
  validarCamposRequeridos(['passwordActual', 'passwordNuevo']),
  authController.cambiarPassword
);

module.exports = router;