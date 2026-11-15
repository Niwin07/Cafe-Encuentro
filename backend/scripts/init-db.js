// Crea/verifica las tablas en la base configurada en .env (DATABASE_URL o DB_*).
// Uso: npm run db:init
const pool = require('../conexion');

(async () => {
  try {
    const [rows] = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('✅ Base lista. Tablas:', rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('❌ No se pudo inicializar la base:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
