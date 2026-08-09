const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { errorHandler, notFound } = require('./api/middleware/errorHandler'); // ⭐ Actualizado
const { sanitizar } = require('./api/middleware/validator'); // ⭐ Nuevo
const apiRoutes = require('./api/main');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: si se configura ALLOWED_ORIGINS (lista separada por comas) se
// restringe a esos orígenes; si no está configurada, se mantiene el
// comportamiento permisivo anterior para no romper despliegues existentes
// (frontend y backend viven bajo el mismo dominio en producción, así que
// esto solo aplica a llamadas cross-origin: dev local, previews, etc).
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : null;

const corsOptions = allowedOrigins
  ? {
      origin: (origin, callback) => {
        // Sin header Origin (curl, Postman, server-to-server) o en la whitelist
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error('No permitido por CORS'));
      }
    }
  : {};

// Middlewares globales
app.use(cors(corsOptions));
app.use(express.json());
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
