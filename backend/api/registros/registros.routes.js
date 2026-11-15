const express = require('express');
const router = express.Router();
const registrosController = require('./registros.controller');
const { verificarToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación (solo cajeras)
router.get(
  '/cocina',
  verificarToken,
  registrosController.obtenerRegistrosCocina
);

router.get(
  '/cafeteria',
  verificarToken,
  registrosController.obtenerRegistrosCafeteria
);

router.get(
  '/resumen',
  verificarToken,
  registrosController.obtenerResumen
);

router.get(
  '/cierre-caja',
  verificarToken,
  registrosController.obtenerCierreCaja
);

module.exports = router;