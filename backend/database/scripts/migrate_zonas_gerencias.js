require('dotenv').config({ path: '../../.env' });
const db = require('../connection');

async function runMigration() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    console.log("1. Creando tabla zonas...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS zonas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("2. Insertando zonas por defecto...");
    const zonas = ["Matriz", "Zona Norte 1", "Zona Norte 2", "Concepción", "Puerto Montt", "Viña del Mar"];
    for (const zona of zonas) {
      await connection.query('INSERT IGNORE INTO zonas (nombre) VALUES (?)', [zona]);
    }

    console.log("3. Actualizando tabla usuarios (añadiendo zona_id y gerencia_id)...");
    
    // Check if columns exist before adding
    const [userCols] = await connection.query("SHOW COLUMNS FROM usuarios LIKE 'zona_id'");
    if (userCols.length === 0) {
      await connection.query('ALTER TABLE usuarios ADD COLUMN zona_id INT DEFAULT 1');
      await connection.query('ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_zona FOREIGN KEY (zona_id) REFERENCES zonas(id)');
    }

    const [gerenciaCols] = await connection.query("SHOW COLUMNS FROM usuarios LIKE 'gerencia_id'");
    if (gerenciaCols.length === 0) {
      await connection.query('ALTER TABLE usuarios ADD COLUMN gerencia_id INT NULL');
      await connection.query('ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_gerencia FOREIGN KEY (gerencia_id) REFERENCES usuarios(id) ON DELETE SET NULL');
    }

    console.log("4. Actualizando tabla empresas (añadiendo zona_id)...");
    const [empCols] = await connection.query("SHOW COLUMNS FROM empresas LIKE 'zona_id'");
    if (empCols.length === 0) {
      await connection.query('ALTER TABLE empresas ADD COLUMN zona_id INT DEFAULT 1');
      await connection.query('ALTER TABLE empresas ADD CONSTRAINT fk_empresas_zona FOREIGN KEY (zona_id) REFERENCES zonas(id)');
    }

    await connection.commit();
    console.log("Migración completada exitosamente.");
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en migración:", error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

runMigration();
