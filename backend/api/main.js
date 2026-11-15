const express = require('express');
const router = express.Router();

// Importar rutas de cada módulo
const authRoutes = require('./auth/auth.routes');
const productosRoutes = require('./productos/productos.routes');
const pedidosRoutes = require('./pedidos/pedidos.routes');
const categoriasRoutes = require('./categorias/categorias.routes');
const destinosRoutes = require('./destinos/destinos.routes');
const acompanamientosRoutes = require('./acompanamientos/acompanamientos.routes');
// 👇 1. IMPORTAR RUTAS DE REGISTROS
const registrosRoutes = require('./registros/registros.routes'); 
const keepaliveRoutes = require('./keepalive/keepalive.routes');

// Registrar rutas
router.use('/auth', authRoutes);
router.use('/productos', productosRoutes);
router.use('/pedidos', pedidosRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/destinos', destinosRoutes);
router.use('/acompanamientos', acompanamientosRoutes);
// 👇 2. USAR LA RUTA
router.use('/registros', registrosRoutes); 
// Mantiene activa la base en Aiven (lo llama un cron)
router.use('/keepalive', keepaliveRoutes);

module.exports = router;