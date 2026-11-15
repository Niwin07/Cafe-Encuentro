const pool = require('../../conexion');

/**
 * Ejecuta `fn(connection)` dentro de una transacción.
 * - Hace commit si `fn` termina bien y rollback si lanza.
 * - Libera la conexión UNA sola vez (en el finally). Liberarla dos veces
 *   deja la misma conexión duplicada en la lista de libres del pool de mysql2,
 *   y dos requests concurrentes terminan compartiendo conexión/transacción.
 */
const conTransaccion = async (fn) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const resultado = await fn(connection);
    await connection.commit();
    return resultado;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('❌ Error en rollback:', rollbackError.message);
    }
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Error de negocio controlado: el errorHandler lo responde con su status
 * y con { error, mensaje } (el frontend muestra `mensaje`).
 */
const errorNegocio = (status, mensaje, titulo) => {
  const error = new Error(mensaje);
  error.tipo = 'NEGOCIO';
  error.status = status;
  if (titulo) error.titulo = titulo;
  return error;
};

/**
 * Devuelve el ID de un destino por nombre (con fallback a los IDs históricos
 * 1 = Cocina, 2 = Cafetería). Antes estaba duplicado en dos controllers.
 */
const obtenerIdDestinoPorNombre = async (nombre) => {
  const fallback = nombre === 'Cocina' ? 1 : 2;
  try {
    const [rows] = await pool.query('SELECT id FROM destinos WHERE nombre LIKE ? LIMIT 1', [`%${nombre}%`]);
    return rows.length > 0 ? rows[0].id : fallback;
  } catch (error) {
    console.error('❌ Error buscando destino:', error.message);
    return fallback;
  }
};

module.exports = { conTransaccion, errorNegocio, obtenerIdDestinoPorNombre };
