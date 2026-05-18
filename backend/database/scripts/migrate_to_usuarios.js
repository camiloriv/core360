const db = require('../connection');

async function runMigration() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    console.log("1. Creando tabla usuarios...");
    await connection.query('DROP TABLE IF EXISTS usuarios');
    await connection.query(`
      CREATE TABLE usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        correo VARCHAR(255),
        contrasena VARCHAR(255) NOT NULL DEFAULT '123456',
        cargos VARCHAR(255),
        permisos VARCHAR(100) DEFAULT 'ejecutiva',
        jefatura_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Obtenemos los datos actuales
    const [jefaturas] = await connection.query('SELECT * FROM jefaturas');
    const [ejecutivas] = await connection.query('SELECT e.*, c.nombre as cargo_nombre FROM ejecutivas e LEFT JOIN ejecutiva_cargos c ON e.cargo_id = c.id');

    console.log("2. Migrando jefaturas...");
    const jefaturaIdMap = {}; // old -> new
    for (const jef of jefaturas) {
      const [res] = await connection.query(
        'INSERT INTO usuarios (nombre, correo, contrasena, permisos, cargos) VALUES (?, ?, ?, ?, ?)',
        [jef.nombre, jef.correo, '123456', 'jefatura', 'Jefatura']
      );
      jefaturaIdMap[jef.id] = res.insertId;
    }

    console.log("3. Migrando ejecutivas...");
    const ejecutivaIdMap = {}; // old -> new
    for (const ej of ejecutivas) {
      const newJefaturaId = ej.jefatura_id ? jefaturaIdMap[ej.jefatura_id] : null;
      const [res] = await connection.query(
        'INSERT INTO usuarios (nombre, correo, contrasena, permisos, cargos, jefatura_id) VALUES (?, ?, ?, ?, ?, ?)',
        [ej.nombre, ej.correo, '123456', 'ejecutiva', ej.cargo_nombre || 'Ejecutiva', newJefaturaId]
      );
      ejecutivaIdMap[ej.id] = res.insertId;
    }

    console.log("4. Actualizando llaves foráneas en empresas, reuniones, encuestas...");

    // Empresas (tienen jefatura_id)
    try {
      await connection.query('ALTER TABLE empresas DROP FOREIGN KEY fk_empresa_jefatura');
    } catch(e) {}
    
    const [empresas] = await connection.query('SELECT id, jefatura_id FROM empresas WHERE jefatura_id IS NOT NULL');
    for (const emp of empresas) {
      if (jefaturaIdMap[emp.jefatura_id]) {
        await connection.query('UPDATE empresas SET jefatura_id = ? WHERE id = ?', [jefaturaIdMap[emp.jefatura_id], emp.id]);
      }
    }

    // Reuniones (tienen ejecutiva_id)
    try {
      await connection.query('ALTER TABLE reuniones DROP FOREIGN KEY fk_reunion_ejecutiva');
    } catch(e) {}
    try {
      await connection.query('ALTER TABLE reuniones DROP FOREIGN KEY reuniones_ibfk_1');
    } catch(e) {}

    const [reuniones] = await connection.query('SELECT id, ejecutiva_id FROM reuniones');
    for (const r of reuniones) {
      const nEjId = r.ejecutiva_id ? (ejecutivaIdMap[r.ejecutiva_id] || null) : null;
      await connection.query('UPDATE reuniones SET ejecutiva_id = ? WHERE id = ?', [nEjId, r.id]);
    }

    // Encuestas (tienen ejecutiva_id)
    try {
      await connection.query('ALTER TABLE encuestas DROP FOREIGN KEY encuestas_ibfk_3'); // or whatever it is called
    } catch(e) {}
    const [encuestas] = await connection.query('SELECT id, ejecutiva_id FROM encuestas WHERE ejecutiva_id IS NOT NULL');
    for (const enc of encuestas) {
      const nEjId = enc.ejecutiva_id ? (ejecutivaIdMap[enc.ejecutiva_id] || null) : null;
      await connection.query('UPDATE encuestas SET ejecutiva_id = ? WHERE id = ?', [nEjId, enc.id]);
    }

    console.log("5. Renombrando tablas antiguas por seguridad...");
    try { await connection.query('RENAME TABLE jefaturas TO old_jefaturas'); } catch(e) {}
    try { await connection.query('RENAME TABLE ejecutivas TO old_ejecutivas'); } catch(e) {}

    await connection.commit();
    console.log("Migración completada exitosamente.");
  } catch (error) {
    await connection.rollback();
    console.error("Error en migración:", error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

runMigration();
