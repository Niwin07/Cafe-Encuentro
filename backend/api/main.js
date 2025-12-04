const express = require('express');
const router = express.Router();

// Importar rutas de cada módulo
const authRoutes = require('./auth/auth.routes');
const productosRoutes = require('./productos/productos.routes');
const pedidosRoutes = require('./pedidos/pedidos.routes');
const categoriasRoutes = require('./categorias/categorias.routes');
const destinosRoutes = require('./destinos/destinos.routes');
const acompanamientosRoutes = require('./acompanamientos/acompanamientos.routes');

// Registrar rutas
router.use('/auth', authRoutes);
router.use('/productos', productosRoutes);
router.use('/pedidos', pedidosRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/destinos', destinosRoutes);
router.use('/acompanamientos', acompanamientosRoutes);

module.exports = router;