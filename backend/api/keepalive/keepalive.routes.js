/**
 * Keep-alive de la base de datos.
 *
 * Aiven apaga los servicios del plan gratuito cuando no tienen actividad.
 * Este endpoint hace una escritura real en la base (UPSERT en la tabla keepalive)
 * y lo llaman periódicamente:
 *   - el Cron Job de Vercel (frontend/vercel.json → "crons"), una vez por día
 *   - el workflow de GitHub Actions .github/workflows/keepalive.yml (respaldo)
 *
 * Si se define CRON_SECRET, se exige "Authorization: Bearer <CRON_SECRET>"
 * (Vercel lo envía automáticamente en sus cron jobs).
 */
const express = require('express');
const pool = require('../../conexion');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const secreto = process.env.CRON_SECRET;
    if (secreto && req.headers.authorization !== `Bearer ${secreto}`) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const [resultado] = await pool.query(
      `INSERT INTO keepalive (id, ultimo_ping, origen, total_pings)
       VALUES (1, NOW(), ?, 1)
       ON CONFLICT (id) DO UPDATE
         SET ultimo_ping = NOW(), origen = EXCLUDED.origen,
             total_pings = keepalive.total_pings + 1`,
      [String(req.headers['user-agent'] || 'desconocido').slice(0, 100)]
    );

    const fila = resultado.rows[0];
    res.json({ ok: true, ultimo_ping: fila.ultimo_ping, total_pings: fila.total_pings });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
