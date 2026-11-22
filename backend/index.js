const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { errorHandler, notFound } = require('./api/middleware/errorHandler'); // ⭐ Actualizado
const { sanitizar } = require('./api/middleware/validator'); // ⭐ Nuevo
const apiRoutes = require('./api/main');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globales
app.use(cors());
// La subida de fotos de productos (POST /api/productos/:id/imagen) manda la
// imagen en base64: necesita un límite mayor (Vercel acepta hasta 4,5 MB por
// request). El resto de la API conserva el límite por defecto de 100 KB.
const jsonFotos = express.json({ limit: '4mb' });
const jsonGeneral = express.json();
app.use((req, res, next) =>
  (/^\/api\/productos\/[^/]+\/imagen$/.test(req.path) ? jsonFotos : jsonGeneral)(req, res, next)
);
app.use(express.urlencoded({ extended: true }));
app.use(sanitizar); // ⭐ Sanitizar todos los datos de entrada

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    mensaje: '🍕 API Café El Encuentro',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      productos: '/api/productos',
      pedidos: '/api/pedidos',
      categorias: '/api/categorias',
      destinos: '/api/destinos',
      acompanamientos: '/api/acompanamientos'
    }
  });
});

// Registrar todas las rutas bajo /api
app.use('/api', apiRoutes);

// Middleware para rutas no encontradas (debe ir antes del errorHandler)
app.use(notFound); // ⭐ Nuevo

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Iniciar servidor (solo en local — en Vercel no hace falta, Vercel invoca el handler directo)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
