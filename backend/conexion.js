const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * SSL:
 * - Por defecto se mantiene SSL activo (Aiven lo exige).
 * - Si se define DB_CA_CERT (contenido PEM del "CA certificate" de Aiven, con
 *   saltos de línea reales o escapados como \n) se valida el certificado del
 *   servidor y se evita un ataque man-in-the-middle.
 * - Sin DB_CA_CERT se conserva el comportamiento anterior (rejectUnauthorized: false)
 *   para no romper despliegues existentes.
 * - DB_SSL=false lo desactiva (solo para una base local de desarrollo/test).
 */
const construirSSL = () => {
  if (process.env.DB_SSL === 'false') return undefined;
  if (process.env.DB_CA_CERT) {
    return { ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 3, // Bajado de 10: en serverless cada instancia abre su propio pool
  queueLimit: 0,
  ssl: construirSSL()
});

// Verificar conexión
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a MySQL exitosa');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
  });

module.exports = pool;
