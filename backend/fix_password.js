// backend/fix_password.js
// Restablece (o crea) la contraseña del usuario "admin".
//
// Uso:  node fix_password.js "<contraseña-nueva>"
//   o:  ADMIN_PASSWORD="<contraseña-nueva>" node fix_password.js
//
// Antes la contraseña ('123456') estaba escrita en este archivo y commiteada
// en el repositorio: cualquiera con acceso al código conocía la clave de admin.
const bcrypt = require('bcrypt');
const pool = require('./conexion');

async function arreglarAdmin() {
  const passwordPlano = process.argv[2] || process.env.ADMIN_PASSWORD;

  if (!passwordPlano || passwordPlano.length < 8) {
    console.error('❌ Indicá una contraseña de al menos 8 caracteres: node fix_password.js "<contraseña>"');
    process.exit(1);
  }

  try {
    const hashReal = await bcrypt.hash(passwordPlano, 10);

    const [result] = await pool.query(
      'UPDATE cajeras SET password_hash = ? WHERE usuario = ?',
      [hashReal, 'admin']
    );

    if (result.affectedRows > 0) {
      console.log('✅ La contraseña de "admin" fue actualizada.');
    } else {
      console.log('🛠️ No existía el usuario "admin": se crea.');
      await pool.query(
        'INSERT INTO cajeras (nombre, usuario, password_hash) VALUES (?, ?, ?)',
        ['Admin', 'admin', hashReal]
      );
      console.log('✅ Usuario admin creado.');
    }
  } catch (error) {
    console.error('❌ Ocurrió un error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

arreglarAdmin();
