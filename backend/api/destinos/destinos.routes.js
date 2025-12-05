const express = require('express');
const router = express.Router();
const controller = require('./destinos.controller');
const { verificarToken } = require('../middleware/auth');
const { validarCamposRequeridos } = require('../middleware/validator');

router.get('/', controller.obtenerTodos);
router.post('/', verificarToken, validarCamposRequeridos(['nombre']), controller.crear);
router.delete('/:id', verificarToken, controller.eliminar);

module.exports = router;