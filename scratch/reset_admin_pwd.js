const db = require('../backend/database/connection');
const bcrypt = require('bcrypt');

async function resetAdmin() {
  try {
    const password = "AdminPassword2026!";
    const hashed = await bcrypt.hash(password, 10);
    
    const [admins] = await db.query("SELECT id, correo, nombre FROM usuarios WHERE permisos IN ('admin', 'ADMIN')");
    
    if (admins.length === 0) {
      console.log("No admin users found.");
      process.exit(1);
    }

    console.log(`Found ${admins.length} admin(s). Resetting password...`);

    for (const admin of admins) {
      await db.query("UPDATE usuarios SET contrasena = ?, requiere_cambio_clave = 1 WHERE id = ?", [hashed, admin.id]);
      console.log(`Reset password for: ${admin.correo} (${admin.nombre})`);
    }

    console.log(`\nNueva clave temporal para admin es: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetAdmin();
