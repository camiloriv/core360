require('dotenv').config({ path: '../../.env' });
const db = require('../connection');

async function runTest() {
  try {
    console.log("1. Insertando asociación adicional para Beatriz Silva (ID 1) con Arturo Álvarez (ID 22)...");
    await db.query("INSERT IGNORE INTO usuario_gerencias (usuario_id, gerencia_id) VALUES (1, 22)");

    console.log("2. Consultando Beatriz Silva en la base de datos...");
    const [[beatriz]] = await db.query(`
      SELECT u.id, u.nombre, u.correo, u.permisos, u.cargos, u.jefatura_id, u.gerencia_id, u.zona_id,
             COALESCE(
               (SELECT GROUP_CONCAT(g2.nombre SEPARATOR ', ')
                FROM usuario_gerencias ug
                JOIN usuarios g2 ON ug.gerencia_id = g2.id
                WHERE ug.usuario_id = u.id),
               g.nombre
             ) as gerencia_nombre,
             (
               SELECT GROUP_CONCAT(ug.gerencia_id)
               FROM usuario_gerencias ug
               WHERE ug.usuario_id = u.id
             ) as gerencia_ids
      FROM usuarios u 
      LEFT JOIN usuarios g ON u.gerencia_id = g.id
      WHERE u.id = 1
    `);

    console.log("\n=== DATOS OBTENIDOS ===");
    console.log(`Nombre: ${beatriz.nombre}`);
    console.log(`Fallback gerencia_id (usuarios): ${beatriz.gerencia_id}`);
    console.log(`Asignaciones de gerencia_ids: ${beatriz.gerencia_ids}`);
    console.log(`Nombres de gerencias asociadas: ${beatriz.gerencia_nombre}`);

    console.log("\n3. Reestableciendo la asociación a sólo Lilian Ortega (ID 15) para limpieza...");
    await db.query("DELETE FROM usuario_gerencias WHERE usuario_id = 1 AND gerencia_id = 22");
    console.log("Limpieza completada.");

  } catch (error) {
    console.error("Error en test:", error);
  } finally {
    process.exit(0);
  }
}

runTest();
