const express = require('express');
const router = express.Router();
const controller = require('./categorias.controller');
const { verificarToken } = require('../middleware/auth');
const { validarCamposRequeridos } = require('../middleware/validator');

router.get('/', controller.obtenerTodas);
router.post('/', verificarToken, validarCamposRequeridos(['nombre']), controller.crear);
router.delete('/:id', verificarToken, controller.eliminar);

module.exports = router;