const rateLimit = require('express-rate-limit');

/**
 * Limitador de intentos de login: mitiga fuerza bruta sobre credenciales.
 * Nota: en despliegues serverless (Vercel) cada instancia tiene su propio
 * contador en memoria, así que esto es una mitigación de mejor esfuerzo,
 * no una garantía dura — para eso haría falta un store compartido (Redis).
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos',
    mensaje: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.'
  }
});

module.exports = { loginLimiter };
