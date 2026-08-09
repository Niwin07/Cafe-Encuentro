const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verificarToken } = require('../middleware/auth');
const { validarCamposRequeridos } = require('../middleware/validator');
const { loginLimiter } = require('../middleware/rateLimiter');

// Rutas públicas
router.post(
  '/login',
  loginLimiter,
  validarCamposRequeridos(['usuario', 'password']),
  authController.login
);

// Protegida: solo una cajera ya autenticada puede dar de alta a otra
// (el panel de administración solo la usa estando logueado; ver auditoría
// de seguridad — antes era pública y permitía que cualquiera se auto-registrara).
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