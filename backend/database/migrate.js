const db = require("./connection");
const migratePasswords = require("./scripts/migrate_passwords");

async function runMigrations() {
  let connection;
  try {
    connection = await db.getConnection();
    
    // 1. Zonas table
    console.log("Migration: Checking/creating 'zonas' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS zonas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Default zones
    const defaultZonas = ["Matriz", "Zona Norte 1", "Zona Norte 2", "Concepción", "Puerto Montt", "Viña del Mar"];
    for (const zona of defaultZonas) {
      await connection.query('INSERT IGNORE INTO zonas (nombre) VALUES (?)', [zona]);
    }

    // 3. Columns in usuarios table (zona_id, gerencia_id, vistas_permitidas)
    const [userZonaCol] = await connection.query("SHOW COLUMNS FROM usuarios LIKE 'zona_id'");
    if (userZonaCol.length === 0) {
      console.log("Migration: Adding 'zona_id' column to 'usuarios'...");
      await connection.query('ALTER TABLE usuarios ADD COLUMN zona_id INT DEFAULT 1');
      await connection.query('ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_zona FOREIGN KEY (zona_id) REFERENCES zonas(id)');
    }

    const [userGerenciaCol] = await connection.query("SHOW COLUMNS FROM usuarios LIKE 'gerencia_id'");
    if (userGerenciaCol.length === 0) {
      console.log("Migration: Adding 'gerencia_id' column to 'usuarios'...");
      await connection.query('ALTER TABLE usuarios ADD COLUMN gerencia_id INT NULL');
      await connection.query('ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_gerencia FOREIGN KEY (gerencia_id) REFERENCES usuarios(id) ON DELETE SET NULL');
    }

    const [userVistasCol] = await connection.query("SHOW COLUMNS FROM usuarios LIKE 'vistas_permitidas'");
    if (userVistasCol.length === 0) {
      console.log("Migration: Adding 'vistas_permitidas' column to 'usuarios'...");
      await connection.query('ALTER TABLE usuarios ADD COLUMN vistas_permitidas TEXT NULL');
    }

    const [userReqCambioCol] = await connection.query("SHOW COLUMNS FROM usuarios LIKE 'requiere_cambio_clave'");
    if (userReqCambioCol.length === 0) {
      console.log("Migration: Adding 'requiere_cambio_clave' column to 'usuarios'...");
      await connection.query('ALTER TABLE usuarios ADD COLUMN requiere_cambio_clave TINYINT(1) DEFAULT 0');
    }

    // 4. Columns in empresas table (zona_id)
    const [empZonaCol] = await connection.query("SHOW COLUMNS FROM empresas LIKE 'zona_id'");
    if (empZonaCol.length === 0) {
      console.log("Migration: Adding 'zona_id' column to 'empresas'...");
      await connection.query('ALTER TABLE empresas ADD COLUMN zona_id INT DEFAULT 1');
      await connection.query('ALTER TABLE empresas ADD CONSTRAINT fk_empresas_zona FOREIGN KEY (zona_id) REFERENCES zonas(id)');
    }

    // 5. Intermedia table usuario_gerencias
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuario_gerencias (
        usuario_id INT NOT NULL,
        gerencia_id INT NOT NULL,
        PRIMARY KEY (usuario_id, gerencia_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (gerencia_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    // Migrate existing relationships to intermediate table
    const [existingJefaturas] = await connection.query(`
      SELECT id, gerencia_id FROM usuarios
      WHERE permisos = 'jefatura' AND gerencia_id IS NOT NULL
    `);
    for (const row of existingJefaturas) {
      await connection.query(`
        INSERT IGNORE INTO usuario_gerencias (usuario_id, gerencia_id)
        VALUES (?, ?)
      `, [row.id, row.gerencia_id]);
    }

    // 6. Column 'activo' in encuesta_catalogo_preguntas
    const [pregActivoCol] = await connection.query("SHOW COLUMNS FROM encuesta_catalogo_preguntas LIKE 'activo'");
    if (pregActivoCol.length === 0) {
      console.log("Migration: Adding 'activo' column to 'encuesta_catalogo_preguntas'...");
      await connection.query('ALTER TABLE encuesta_catalogo_preguntas ADD COLUMN activo TINYINT(1) DEFAULT 1');
    }

    // 7. Table 'empresa_seguimiento_log'
    console.log("Migration: Checking/creating 'empresa_seguimiento_log' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS empresa_seguimiento_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        estado VARCHAR(50) NOT NULL,
        fecha DATE NOT NULL,
        usuario_id INT NULL,
        reunion_id VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      )
    `);

    // Ensure reunion_id is large enough in case it was created with VARCHAR(20) before
    try {
      await connection.query('ALTER TABLE empresa_seguimiento_log MODIFY reunion_id VARCHAR(255) NULL');
    } catch (e) {
      console.log("Migration: Note: reunion_id modify skipped or failed:", e.message);
    }

    // Ensure asunto exists in log
    try {
      const [logCols] = await connection.query("SHOW COLUMNS FROM empresa_seguimiento_log LIKE 'asunto'");
      if (logCols.length === 0) {
        console.log("Migration: Adding 'asunto' column to 'empresa_seguimiento_log'...");
        await connection.query("ALTER TABLE empresa_seguimiento_log ADD COLUMN asunto VARCHAR(255) DEFAULT NULL");
      }
    } catch (e) {
      console.log("Migration: Note: log columns check failed:", e.message);
    }

    // Migrate existing logs to empresa_seguimiento_log
    const [solicitadas] = await connection.query(`
      SELECT id, fecha_solicitada FROM empresas 
      WHERE fecha_solicitada IS NOT NULL AND estado_seguimiento IN ('solicitada','concretada')
    `);
    for (const emp of solicitadas) {
      const [exists] = await connection.query(
        "SELECT id FROM empresa_seguimiento_log WHERE empresa_id = ? AND estado = 'solicitada'",
        [emp.id]
      );
      if (exists.length === 0) {
        await connection.query(
          "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha) VALUES (?, 'solicitada', ?)",
          [emp.id, emp.fecha_solicitada]
        );
      }
    }

    const [concretadas] = await connection.query(`
      SELECT id, fecha_concretada FROM empresas 
      WHERE fecha_concretada IS NOT NULL AND estado_seguimiento = 'concretada'
    `);
    for (const emp of concretadas) {
      const [exists] = await connection.query(
        "SELECT id FROM empresa_seguimiento_log WHERE empresa_id = ? AND estado = 'concretada'",
        [emp.id]
      );
      if (exists.length === 0) {
        await connection.query(
          "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha) VALUES (?, 'concretada', ?)",
          [emp.id, emp.fecha_concretada]
        );
      }
    }

    const [gestionadas] = await connection.query(`
      SELECT DISTINCT r.empresa_id, r.fecha_reu, r.id_reunion, r.ejecutiva_id
      FROM reuniones r
      WHERE r.estado_envio != 'pendiente' AND r.fecha_reu IS NOT NULL AND r.empresa_id IS NOT NULL
    `);
    for (const reu of gestionadas) {
      const [exists] = await connection.query(
        "SELECT id FROM empresa_seguimiento_log WHERE empresa_id = ? AND estado = 'gestionada' AND reunion_id = ?",
        [reu.empresa_id, reu.id_reunion]
      );
      if (exists.length === 0) {
        await connection.query(
          "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id) VALUES (?, 'gestionada', ?, ?, ?)",
          [reu.empresa_id, reu.fecha_reu, reu.ejecutiva_id, reu.id_reunion]
        );
      }
    }

    // 8. Columns in reuniones table
    console.log("Migration: Checking columns in 'reuniones' table...");
    const checkAndAddReunionColumn = async (colName, colDef) => {
      const [cols] = await connection.query(`SHOW COLUMNS FROM reuniones LIKE '${colName}'`);
      if (cols.length === 0) {
        console.log(`Migration: Adding '${colName}' column to 'reuniones'...`);
        await connection.query(`ALTER TABLE reuniones ADD COLUMN ${colName} ${colDef}`);
      }
    };

    await checkAndAddReunionColumn('estado_envio', "VARCHAR(20) DEFAULT 'enviado'");
    await checkAndAddReunionColumn('archivos_nombres', "TEXT NULL");
    await checkAndAddReunionColumn('programar_encuesta', "TINYINT(1) DEFAULT 0");
    await checkAndAddReunionColumn('encuesta_tipo', "VARCHAR(100) DEFAULT NULL");
    await checkAndAddReunionColumn('encuesta_programada_para', "DATETIME DEFAULT NULL");
    await checkAndAddReunionColumn('encuesta_estado_envio', "VARCHAR(20) DEFAULT 'pendiente'");
    await checkAndAddReunionColumn('encuesta_relacionada', "TINYINT(1) DEFAULT 0");
    await checkAndAddReunionColumn('encuesta_destinatario', "VARCHAR(255) DEFAULT NULL");
    await checkAndAddReunionColumn('asunto_teams', "VARCHAR(500) DEFAULT NULL");

    // 9. Tabla empresa_dominios
    console.log("Migration: Checking/creating 'empresa_dominios' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS empresa_dominios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        dominio VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_empresa_dominio (empresa_id, dominio),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      )
    `);

    // 10. Tabla reuniones_huerfanas
    console.log("Migration: Checking/creating 'reuniones_huerfanas' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reuniones_huerfanas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        event_id VARCHAR(255) NOT NULL UNIQUE,
        asunto VARCHAR(255) NOT NULL,
        fecha DATE NOT NULL,
        hora VARCHAR(10) NOT NULL,
        asistentes TEXT,
        estado VARCHAR(50) DEFAULT 'pendiente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    // 11. Tabla empresa_contactos
    console.log("Migration: Checking/creating 'empresa_contactos' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS empresa_contactos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        correo VARCHAR(255) NOT NULL,
        nombre VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_empresa_correo (empresa_id, correo),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      )
    `);

    // 11b. Columnas faltantes en reuniones_huerfanas (ical_uid fue agregada después de la creación inicial)
    try {
      const [hIcalCol] = await connection.query("SHOW COLUMNS FROM reuniones_huerfanas LIKE 'ical_uid'");
      if (hIcalCol.length === 0) {
        console.log("Migration: Adding 'ical_uid' column to 'reuniones_huerfanas'...");
        await connection.query("ALTER TABLE reuniones_huerfanas ADD COLUMN ical_uid VARCHAR(500) DEFAULT NULL");
      }
    } catch (e) {
      console.log("Migration: Note: ical_uid check in reuniones_huerfanas failed:", e.message);
    }

    // 11c. Columnas faltantes en reuniones (event_id, asunto_teams, ical_uid)
    await checkAndAddReunionColumn('event_id', "VARCHAR(255) DEFAULT NULL");
    await checkAndAddReunionColumn('asunto_teams', "VARCHAR(500) DEFAULT NULL");
    try {
      const [rIcalCol] = await connection.query("SHOW COLUMNS FROM reuniones LIKE 'ical_uid'");
      if (rIcalCol.length === 0) {
        console.log("Migration: Adding 'ical_uid' column to 'reuniones'...");
        await connection.query("ALTER TABLE reuniones ADD COLUMN ical_uid VARCHAR(500) DEFAULT NULL");
      }
    } catch (e) {
      console.log("Migration: Note: ical_uid check in reuniones failed:", e.message);
    }

    // 12. Migrar contraseñas a bcrypt
    await migratePasswords();

    // 13. Opcional: Resetear contraseñas de todos a 123 en desarrollo
    if (process.env.RESET_PASSWORDS_DEV === 'true') {
      console.log("Migration: RESET_PASSWORDS_DEV is active. Setting everyone's password to '123'...");
      const bcrypt = require('bcrypt');
      const hashed = await bcrypt.hash('123', 10);
      const [pwdResult] = await connection.query('UPDATE usuarios SET contrasena = ?', [hashed]);
      console.log(`Migration: Successfully reset passwords for ${pwdResult.affectedRows} users.`);
    }

    // 14. Sembrar datos para inducción / demostración de plataforma
    try {
      const { seedInductionData } = require("./scripts/seed_induction");
      await seedInductionData(connection);
    } catch (e) {
      console.error("Migration: Note: Seeding of induction data failed:", e.message);
    }

    console.log("Migration: All migrations verified and applied successfully!");
  } catch (error) {
    console.error("Migration: Error during database migration:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { runMigrations };
