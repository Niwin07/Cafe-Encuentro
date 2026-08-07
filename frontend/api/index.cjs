// Vercel toma todo lo que está en /api como función serverless.
// Usamos .cjs porque el package.json del frontend tiene "type": "module",
// y el backend (require/module.exports) es CommonJS — así conviven los dos sin tocar nada más.
module.exports = require('../../backend/index.js');
