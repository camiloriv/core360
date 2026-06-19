const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/connection');

async function run() {
  const connection = await db.getConnection();
  try {
    console.log("🔐 Generando hash para la contraseña '123'...");
    const hashedPwd = await bcrypt.hash('123', 10);

    console.log("🔄 Actualizando todas las contraseñas de los usuarios locales...");
    const [result] = await connection.query(`UPDATE usuarios SET contrasena = ?`, [hashedPwd]);
    
    console.log(`✅ ¡Éxito! Se actualizaron ${result.affectedRows} usuarios.`);
    console.log("Todas las contraseñas de los usuarios han sido reseteadas a: 123");
    
  } catch (error) {
    console.error("❌ Error actualizando las contraseñas:", error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

run();
