const db = require('./database/connection');

async function createAdmin() {
  try {
    const sql = `INSERT INTO usuarios (nombre, correo, contrasena, permisos, cargos) VALUES ('Administrador General', 'admin@proforma.cl', 'admin123', 'admin', 'Administrador General')`;
    await db.query(sql);
    console.log("Admin creado exitosamente.");
  } catch (error) {
    console.error("Error al crear admin:", error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
