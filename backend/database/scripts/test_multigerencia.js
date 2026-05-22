require('dotenv').config({ path: '../../.env' });
const db = require('../connection');

async function testQuery() {
  try {
    const [rows] = await db.query(`
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
      WHERE u.permisos = 'jefatura'
      ORDER BY u.nombre ASC
    `);

    console.log("=== JEFATURAS EN LA BASE DE DATOS ===");
    rows.forEach(u => {
      console.log(`\nID: ${u.id} | Nombre: ${u.nombre}`);
      console.log(`  Gerencia Fallback (usuarios.gerencia_id): ${u.gerencia_id}`);
      console.log(`  Gerencias Asociadas (usuario_gerencias): ${u.gerencia_ids || "Ninguna"}`);
      console.log(`  Nombres de Gerencias: ${u.gerencia_nombre || "Ninguno"}`);
    });

  } catch (error) {
    console.error("Error en el test:", error);
  } finally {
    process.exit(0);
  }
}

testQuery();
