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

    // 3. Columns in usuarios table
    const addColIfMissing = async (table, col, def) => {
      const [cols] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE '${col}'`);
      if (cols.length === 0) {
        console.log(`Migration: Adding '${col}' column to '${table}'...`);
        await connection.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      }
    };

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

    await addColIfMissing('usuarios', 'vistas_permitidas', 'TEXT NULL');
    await addColIfMissing('usuarios', 'requiere_cambio_clave', 'TINYINT(1) DEFAULT 0');
    await addColIfMissing('usuarios', 'sync_delta_token', 'TEXT NULL');
    await addColIfMissing('usuarios', 'ultima_sincronizacion', 'DATETIME NULL');
    await addColIfMissing('usuarios', 'preferencias', 'JSON NULL');

    // Insertar PROFORMA INTERNA si no existe
    const [empProforma] = await connection.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
    if (empProforma.length === 0) {
      console.log("Migration: Inserting 'PROFORMA INTERNA' company...");
      await connection.query("INSERT INTO empresas (nombre, jefatura_id) VALUES ('PROFORMA INTERNA', NULL)");
    }

    // 4. Columns in empresas table
    const [empZonaCol] = await connection.query("SHOW COLUMNS FROM empresas LIKE 'zona_id'");
    if (empZonaCol.length === 0) {
      console.log("Migration: Adding 'zona_id' column to 'empresas'...");
      await connection.query('ALTER TABLE empresas ADD COLUMN zona_id INT DEFAULT 1');
      await connection.query('ALTER TABLE empresas ADD CONSTRAINT fk_empresas_zona FOREIGN KEY (zona_id) REFERENCES zonas(id)');
    }

    // 5. Tabla usuario_gerencias
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuario_gerencias (
        usuario_id INT NOT NULL,
        gerencia_id INT NOT NULL,
        PRIMARY KEY (usuario_id, gerencia_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (gerencia_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    // Migrate existing jefaturas
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

    // 7. Tabla empresa_seguimiento_log
    console.log("Migration: Checking/creating 'empresa_seguimiento_log' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS empresa_seguimiento_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        estado VARCHAR(50) NOT NULL,
        fecha DATE NOT NULL,
        usuario_id INT NULL,
        reunion_id VARCHAR(500) NULL,
        asunto VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      )
    `);

    try {
      await connection.query('ALTER TABLE empresa_seguimiento_log MODIFY reunion_id VARCHAR(500) NULL');
    } catch (e) {
      // Ignore if already correct
    }

    try {
      const [logAsuntoCols] = await connection.query("SHOW COLUMNS FROM empresa_seguimiento_log LIKE 'asunto'");
      if (logAsuntoCols.length === 0) {
        await connection.query("ALTER TABLE empresa_seguimiento_log ADD COLUMN asunto VARCHAR(255) DEFAULT NULL");
      }
    } catch (e) {
      console.log("Migration: Note: log asunto check failed:", e.message);
    }

    // 8. Tabla empresa_dominios
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

    // 9. Tabla empresa_contactos
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

    // ============================================================
    // 10. NUEVA TABLA: teams_eventos (FUENTE DE LA VERDAD DESDE TEAMS)
    // ============================================================
    console.log("Migration: Checking/creating 'teams_eventos' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS teams_eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(500) NOT NULL,
        ical_uid VARCHAR(500) DEFAULT NULL,
        usuario_id INT NOT NULL,
        empresa_id INT DEFAULT NULL,
        asunto VARCHAR(500) NOT NULL,
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        hora_fin TIME DEFAULT NULL,
        estado ENUM('agendada','pasada','cancelada','ignorada') NOT NULL DEFAULT 'agendada',
        es_online TINYINT(1) DEFAULT 1,
        asistentes JSON DEFAULT NULL,
        join_url TEXT DEFAULT NULL,
        ultima_sync DATETIME DEFAULT NULL,
        organizador JSON DEFAULT NULL,
        body_preview TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_event_id (event_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
      )
    `);

    // Add new columns to existing teams_eventos if they don't exist
    await addColIfMissing('teams_eventos', 'organizador', 'JSON DEFAULT NULL');
    await addColIfMissing('teams_eventos', 'body_preview', 'TEXT DEFAULT NULL');

    // ============================================================
    // 11. NUEVA TABLA: minutas (antes llamada 'reuniones')
    // ============================================================
    console.log("Migration: Checking/creating 'minutas' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS minutas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_minuta VARCHAR(30) NOT NULL UNIQUE,
        teams_evento_id INT DEFAULT NULL,
        ejecutiva_id INT NOT NULL,
        empresa_id INT NOT NULL,
        tipo_reu VARCHAR(100) DEFAULT NULL,
        enviado_a TEXT DEFAULT NULL,
        enviado_por VARCHAR(255) DEFAULT NULL,
        participantes TEXT DEFAULT NULL,
        motivo_reu TEXT DEFAULT NULL,
        minuta TEXT DEFAULT NULL,
        form_f TEXT DEFAULT NULL,
        fecha_reu DATE NOT NULL,
        hora VARCHAR(10) NOT NULL,
        lugar VARCHAR(255) DEFAULT 'Teams',
        documentos_adjuntos TEXT DEFAULT NULL,
        estado_envio ENUM('borrador','enviado','no_aplica') NOT NULL DEFAULT 'borrador',
        archivos_nombres TEXT DEFAULT NULL,
        programar_encuesta TINYINT(1) DEFAULT 0,
        encuesta_tipo VARCHAR(100) DEFAULT NULL,
        encuesta_programada_para DATETIME DEFAULT NULL,
        encuesta_estado_envio VARCHAR(20) DEFAULT 'pendiente',
        encuesta_relacionada TINYINT(1) DEFAULT 0,
        encuesta_destinatario VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (teams_evento_id) REFERENCES teams_eventos(id) ON DELETE SET NULL,
        FOREIGN KEY (ejecutiva_id) REFERENCES usuarios(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
      )
    `);

    await addColIfMissing('minutas', 'texto_previo', 'TEXT DEFAULT NULL');
    await addColIfMissing('minutas', 'link_video', 'TEXT DEFAULT NULL');

    // ============================================================
    // 12. Tabla sync_log (control de sincronizaciones diarias)
    // ============================================================
    console.log("Migration: Checking/creating 'sync_log' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL DEFAULT 'diaria',
        ejecutado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resultado TEXT DEFAULT NULL
      )
    `);

    // ============================================================
    // BACKWARD COMPAT: Mantener tabla 'reuniones' por si hay referencias
    // pero ya NO es la fuente de datos del dashboard
    // ============================================================
    // La tabla reuniones antigua se deja intacta para no romper nada,
    // pero el sistema ya no la usa como fuente de verdad.

    // 13. Migrar contraseñas a bcrypt
    await migratePasswords();

    // 14. Opcional: Resetear contraseñas en desarrollo
    if (process.env.RESET_PASSWORDS_DEV === 'true') {
      console.log("Migration: RESET_PASSWORDS_DEV is active. Setting everyone's password to '123'...");
      const bcrypt = require('bcrypt');
      const hashed = await bcrypt.hash('123', 10);
      const [pwdResult] = await connection.query('UPDATE usuarios SET contrasena = ?', [hashed]);
      console.log(`Migration: Successfully reset passwords for ${pwdResult.affectedRows} users.`);
    }

    // 15. Sembrar datos de inducción
    try {
      const { seedInductionData } = require("./scripts/seed_induction");
      await seedInductionData(connection);
    } catch (e) {
      console.error("Migration: Note: Seeding of induction data failed:", e.message);
    }

    // ============================================================
    // 16. ENUM excluida en teams_eventos (reemplaza ignorada)
    // ============================================================
    try {
      const [enumRows] = await connection.query(`
        SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teams_eventos' AND COLUMN_NAME = 'estado'
      `);
      if (enumRows.length > 0 && !enumRows[0].COLUMN_TYPE.includes('excluida')) {
        console.log("Migration: Updating teams_eventos.estado ENUM to include 'excluida'...");
        await connection.query(`
          ALTER TABLE teams_eventos
          MODIFY COLUMN estado ENUM('agendada','pasada','cancelada','excluida') NOT NULL DEFAULT 'agendada'
        `);
      }
    } catch (e) {
      console.log("Migration: Note: teams_eventos estado ENUM update failed:", e.message);
    }

    // ============================================================
    // 17. minutas.empresa_id permite NULL (para reuniones sin empresa)
    // ============================================================
    try {
      const [nullableCheck] = await connection.query(`
        SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'minutas' AND COLUMN_NAME = 'empresa_id'
      `);
      if (nullableCheck.length > 0 && nullableCheck[0].IS_NULLABLE === 'NO') {
        console.log("Migration: Allowing NULL in minutas.empresa_id...");
        await connection.query(`
          ALTER TABLE minutas MODIFY COLUMN empresa_id INT NULL
        `);
      }
    } catch (e) {
      console.log("Migration: Note: minutas.empresa_id nullable update failed:", e.message);
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
