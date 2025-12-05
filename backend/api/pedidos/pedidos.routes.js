const express = require('express');
const router = express.Router();
const pedidosController = require('./pedidos.controller');
const { verificarToken } = require('../middleware/auth');
const { validarCamposRequeridos, validarEnum } = require('../middleware/validator');
const { ESTADOS_ITEM_VALIDOS } = require('../utils/constants');

// Rutas públicas (para cocina y cafetería)
router.get('/cocina/activos', pedidosController.obtenerCocinaActivos);
router.get('/cafeteria/activos', pedidosController.obtenerCafeteriaActivos);
router.get('/destino/:destinoId/activos', pedidosController.obtenerActivosPorDestino);

router.patch(
  '/items/:itemId/estado',
  validarCamposRequeridos(['estado']),
  validarEnum('estado', ESTADOS_ITEM_VALIDOS),
  pedidosController.cambiarEstadoItem
);

// Rutas protegidas (requieren autenticación de cajera)
router.post(
  '/',
  verificarToken,
  validarCamposRequeridos(['cliente', 'items']),
  pedidosController.crear
);

router.get(
  '/',
  verificarToken,
  pedidosController.obtenerTodos
);

router.get(
  '/:id',
  verificarToken,
  pedidosController.obtenerPorId
);

router.patch(
  '/:id/entregar',
  verificarToken,
  pedidosController.marcarEntregado
);

router.patch(
  '/:id/cancelar',
  verificarToken,
  pedidosController.cancelar
);

router.delete(
  '/:id',
  verificarToken,
  pedidosController.eliminar
);

module.exports = router;