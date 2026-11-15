/**
 * Conexión a PostgreSQL (Aiven) con una capa de compatibilidad estilo mysql2.
 *
 * Los modelos fueron escritos para mysql2/promise. Para no reescribir todo, este
 * módulo expone la misma interfaz que usaban:
 *   - pool.query(sql, params)      → [rows, fields] (en INSERT/UPDATE/DELETE, rows es
 *                                    un objeto con insertId y affectedRows)
 *   - pool.getConnection()         → conexión con query/beginTransaction/commit/rollback/release
 *   - placeholders "?"             → se convierten a $1, $2, ...
 *   - códigos de error de Postgres → se traducen a los códigos ER_* que esperan los handlers
 *
 * Además, la primera vez que se usa la base en cada instancia se ejecuta sql/schema.js
 * (idempotente: CREATE TABLE IF NOT EXISTS), así una base vacía queda lista sola.
 */
const { Pool, types } = require('pg');
require('dotenv').config();

// mysql2 devolvía COUNT(*) como número. En pg BIGINT y NUMERIC llegan como string:
// los parseamos para que el front reciba números (precio, total, conteos, etc.).
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));   // INT8 / BIGINT
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));   // NUMERIC

const zonaHoraria = process.env.DB_TIMEZONE || 'America/Argentina/Buenos_Aires';

const configBase = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/, '') }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432
    };

/**
 * SSL (Aiven lo exige):
 * - Con DB_CA_CERT (el "CA certificate" de Aiven en formato PEM; se puede pegar
 *   en una línea con \n) se valida el certificado del servidor (evita MITM).
 * - Sin DB_CA_CERT se mantiene el comportamiento anterior (sin validar).
 * - DB_SSL=false solo para una base local.
 */
const construirSSL = () => {
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.DB_CA_CERT) {
    return { ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
};

const pgPool = new Pool({
  ...configBase,
  max: 3, // en serverless cada instancia abre su propio pool
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ssl: construirSSL(),
  options: `-c TimeZone=${zonaHoraria}`
});

pgPool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

// ---------------------------------------------------------------------------
// Traducción de SQL estilo MySQL → PostgreSQL
// ---------------------------------------------------------------------------

/** Reemplaza los "?" por $1, $2... respetando strings entre comillas simples. */
const convertirPlaceholders = (sql) => {
  let indice = 0;
  let resultado = '';
  let enString = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'") enString = !enString;
    if (c === '?' && !enString) {
      indice++;
      resultado += '$' + indice;
    } else {
      resultado += c;
    }
  }
  return resultado;
};

/** Expande parámetros que son arrays (ej: "IN (?)" o bulk "VALUES ?") como hacía mysql2. */
const expandirArrays = (sql, params) => {
  if (!params.some(Array.isArray)) return { sql, params };
  const nuevosParams = [];
  let i = 0;
  let enString = false;
  let nuevoSql = '';
  for (const c of sql) {
    if (c === "'") enString = !enString;
    if (c === '?' && !enString) {
      const p = params[i++];
      if (Array.isArray(p) && p.length > 0 && Array.isArray(p[0])) {
        // [[a,b],[c,d]] → (?, ?), (?, ?)
        nuevoSql += p.map((fila) => {
          nuevosParams.push(...fila);
          return '(' + fila.map(() => '?').join(', ') + ')';
        }).join(', ');
      } else if (Array.isArray(p)) {
        nuevosParams.push(...p);
        nuevoSql += p.map(() => '?').join(', ');
      } else {
        nuevosParams.push(p);
        nuevoSql += '?';
      }
    } else {
      nuevoSql += c;
    }
  }
  return { sql: nuevoSql, params: nuevosParams };
};

const esInsert = (sql) => /^\s*INSERT\s/i.test(sql);
const esEscritura = (sql) => /^\s*(INSERT|UPDATE|DELETE)\s/i.test(sql);

/** Traduce errores de Postgres a los códigos de MySQL que ya maneja la app. */
const traducirError = (err) => {
  if (!err || !err.code) return err;
  const mapa = {
    '23505': 'ER_DUP_ENTRY',
    '42703': 'ER_BAD_FIELD_ERROR',
    '42601': 'ER_PARSE_ERROR'
  };
  if (err.code === '23503') {
    // FK: o se borra algo referenciado, o se referencia algo inexistente
    err.code = /still referenced/i.test(err.detail || '')
      ? 'ER_ROW_IS_REFERENCED_2'
      : 'ER_NO_REFERENCED_ROW_2';
  } else if (mapa[err.code]) {
    err.pgCode = err.code;
    err.code = mapa[err.code];
  }
  err.sqlMessage = err.sqlMessage || err.message;
  return err;
};

/** Ejecuta una consulta con la interfaz de mysql2 sobre un cliente/pool de pg. */
const ejecutar = async (cliente, sql, params = []) => {
  const expandido = expandirArrays(sql, params || []);
  let texto = convertirPlaceholders(expandido.sql);

  if (esInsert(texto) && !/\bRETURNING\b/i.test(texto)) {
    texto += ' RETURNING *';
  }

  let res;
  try {
    res = await cliente.query(texto, expandido.params);
  } catch (err) {
    throw traducirError(err);
  }

  if (esEscritura(texto)) {
    const primera = res.rows && res.rows[0];
    return [{
      insertId: primera && primera.id !== undefined ? primera.id : undefined,
      affectedRows: res.rowCount,
      rows: res.rows
    }, res.fields];
  }
  return [res.rows, res.fields];
};

// ---------------------------------------------------------------------------
// Inicialización automática del esquema (una vez por instancia)
// ---------------------------------------------------------------------------
let esquemaListo = null;

/**
 * Si la base no tiene ninguna cajera, crea "admin" con la contraseña de
 * ADMIN_PASSWORD. Antes el esquema insertaba admin / 123456 con un hash fijo
 * publicado en el repositorio.
 */
const crearAdminInicial = async () => {
  const { rows } = await pgPool.query('SELECT 1 FROM cajeras LIMIT 1');
  if (rows.length > 0) return;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    console.warn('⚠️ No hay cajeras: definí ADMIN_PASSWORD (mín. 8 caracteres) o corré "node fix_password.js <clave>"');
    return;
  }
  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash(password, 10);
  await pgPool.query(
    "INSERT INTO cajeras (nombre, usuario, password_hash, activo) VALUES ('Admin', 'admin', $1, TRUE) ON CONFLICT (usuario) DO NOTHING",
    [hash]
  );
  console.log('✅ Usuario admin inicial creado desde ADMIN_PASSWORD');
};
const asegurarEsquema = () => {
  if (process.env.DB_AUTO_SCHEMA === 'false') return Promise.resolve();
  if (!esquemaListo) {
    const schemaSql = require('./sql/schema');
    esquemaListo = pgPool.query(schemaSql)
      .then(crearAdminInicial)
      .then(() => console.log('✅ Esquema de PostgreSQL verificado'))
      .catch((err) => {
        esquemaListo = null; // reintentar en el próximo request
        console.error('❌ Error inicializando el esquema:', err.message);
        throw err;
      });
  }
  return esquemaListo;
};

// ---------------------------------------------------------------------------
// API pública compatible con mysql2/promise
// ---------------------------------------------------------------------------
const pool = {
  async query(sql, params) {
    await asegurarEsquema();
    return ejecutar(pgPool, sql, params);
  },

  // alias usado por algunas librerías/código mysql2
  async execute(sql, params) {
    return pool.query(sql, params);
  },

  async getConnection() {
    await asegurarEsquema();
    const cliente = await pgPool.connect();
    let liberada = false;
    return {
      query: (sql, params) => ejecutar(cliente, sql, params),
      execute: (sql, params) => ejecutar(cliente, sql, params),
      beginTransaction: () => cliente.query('BEGIN'),
      commit: () => cliente.query('COMMIT'),
      rollback: () => cliente.query('ROLLBACK').catch(() => {}),
      release: () => {
        // el código original a veces llama release() dos veces (catch + finally)
        if (liberada) return;
        liberada = true;
        cliente.release();
      }
    };
  },

  end: () => pgPool.end(),
  pgPool
};

module.exports = pool;
