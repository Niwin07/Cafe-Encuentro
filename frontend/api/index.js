// Vercel toma todo lo que está en /api como función serverless.
// El package.json de esta carpeta fuerza "commonjs" (el del frontend tiene
// "type": "module"), así este require/module.exports funciona sin tocar
// nada más. Vercel no detectaba .cjs como función zero-config, por eso .js.
module.exports = require('../../backend/index.js');
