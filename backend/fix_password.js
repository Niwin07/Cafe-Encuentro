// backend/fix_password.js
const bcrypt = require('bcrypt');
const pool = require('./conexion'); // Tu conexión a MySQL

async function arreglarAdmin() {
  try {
    const passwordPlano = '123456';
    console.log('🔒 Generando hash para:', passwordPlano);

    // 1. Generar el hash real usando tu librería instalada
    const hashReal = await bcrypt.hash(passwordPlano, 10);
    console.log('🔑 Nuevo Hash generado:', hashReal);

    // 2. Actualizar el usuario 'admin' en la base de datos
    const [result] = await pool.query(
      'UPDATE cajeras SET password_hash = ? WHERE usuario = ?',
      [hashReal, 'admin']
    );

    if (result.affectedRows > 0) {
      console.log('✅ ¡Éxito! La contraseña de "admin" ha sido actualizada.');
    } else {
      console.log('❌ Error: No se encontró el usuario "admin". ¿Corriste el SQL inicial?');
      // Si no existe, lo creamos
      console.log('🛠️ Intentando crear el usuario admin...');
      await pool.query(
        'INSERT INTO cajeras (nombre, usuario, password_hash) VALUES (?, ?, ?)',
        ['Admin', 'admin', hashReal]
      );
      console.log('✅ Usuario Admin creado exitosamente.');
    }

  } catch (error) {
    console.error('❌ Ocurrió un error:', error);
  } finally {
    process.exit();
  }
}

arreglarAdmin();