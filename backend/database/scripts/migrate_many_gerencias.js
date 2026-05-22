require('dotenv').config({ path: '../../.env' });
const db = require('../connection');

async function runMigration() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    console.log("1. Creando tabla intermedia usuario_gerencias...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuario_gerencias (
        usuario_id INT NOT NULL,
        gerencia_id INT NOT NULL,
        PRIMARY KEY (usuario_id, gerencia_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (gerencia_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    console.log("2. Migrando relaciones de gerencia existentes para jefaturas...");
    const [existing] = await connection.query(`
      SELECT id, gerencia_id FROM usuarios
      WHERE permisos = 'jefatura' AND gerencia_id IS NOT NULL
    `);

    console.log(`Encontradas ${existing.length} jefaturas con gerencia asignada.`);
    
    let migratedCount = 0;
    for (const row of existing) {
      await connection.query(`
        INSERT IGNORE INTO usuario_gerencias (usuario_id, gerencia_id)
        VALUES (?, ?)
      `, [row.id, row.gerencia_id]);
      migratedCount++;
    }

    await connection.commit();
    console.log(`Migración completada exitosamente. ${migratedCount} relaciones migradas.`);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en migración:", error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

runMigration();
