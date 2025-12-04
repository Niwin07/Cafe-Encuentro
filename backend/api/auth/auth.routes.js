const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verificarToken } = require('../middleware/auth');
const { validarCamposRequeridos } = require('../middleware/validator');

// Rutas públicas
router.post(
  '/login',
  validarCamposRequeridos(['usuario', 'password']),
  authController.login
);

router.post(
  '/registro',
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