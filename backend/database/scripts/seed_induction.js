const bcrypt = require('bcrypt');

async function seedInductionData(connection) {
  console.log("🌱 Checking/seeding induction demo data...");
  
  // 1. Check if Jefatura Demo exists
  const [jefRows] = await connection.query("SELECT id FROM usuarios WHERE correo = 'demo.jefatura@proforma.cl'");
  let jefaturaId;
  const hashedPwd = await bcrypt.hash('Demo360*', 10);
  const defaultViews = JSON.stringify([
    "/registrar-reunion",
    "/agendar",
    "/crear-encuesta",
    "/dashboard-reuniones",
    "/dashboard-encuestas",
    "/seguimiento-empresas",
    "/editor-encuestas",
    "/gestion-empresas"
  ]);

  if (jefRows.length === 0) {
    console.log("Seeding Jefatura Demo...");
    const [jefRes] = await connection.query(
      `INSERT INTO usuarios (nombre, correo, permisos, contrasena, requiere_cambio_clave, zona_id, vistas_permitidas)
       VALUES (?, ?, 'jefatura', ?, 0, 1, ?)`,
      ['Jefatura de Inducción', 'demo.jefatura@proforma.cl', hashedPwd, defaultViews]
    );
    jefaturaId = jefRes.insertId;
  } else {
    jefaturaId = jefRows[0].id;
  }

  // 2. Check if Ejecutiva Demo exists
  const [execRows] = await connection.query("SELECT id FROM usuarios WHERE correo = 'demo.ejecutiva@proforma.cl'");
  let ejecutivaId;
  if (execRows.length === 0) {
    console.log("Seeding Ejecutiva Demo...");
    const [execRes] = await connection.query(
      `INSERT INTO usuarios (nombre, correo, permisos, jefatura_id, contrasena, requiere_cambio_clave, zona_id, vistas_permitidas)
       VALUES (?, ?, 'ejecutiva', ?, ?, 0, 1, ?)`,
      ['Ejecutiva de Inducción', 'demo.ejecutiva@proforma.cl', jefaturaId, hashedPwd, defaultViews]
    );
    ejecutivaId = execRes.insertId;
  } else {
    ejecutivaId = execRows[0].id;
  }

  // 3. Companies & linkages seeding helper
  const seedCompany = async (name, domains, contacts) => {
    const [compRows] = await connection.query("SELECT id FROM empresas WHERE nombre = ?", [name]);
    let companyId;
    if (compRows.length === 0) {
      console.log(`Seeding company ${name}...`);
      const [compRes] = await connection.query(
        "INSERT INTO empresas (nombre, jefatura_id, estado_seguimiento, zona_id) VALUES (?, ?, 'pendiente', 1)",
        [name, jefaturaId]
      );
      companyId = compRes.insertId;
    } else {
      companyId = compRows[0].id;
    }

    // Dominios
    for (const dom of domains) {
      await connection.query(
        "INSERT IGNORE INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)",
        [companyId, dom]
      );
    }

    // Contactos
    for (const c of contacts) {
      await connection.query(
        "INSERT IGNORE INTO empresa_contactos (empresa_id, correo, nombre) VALUES (?, ?, ?)",
        [companyId, c.correo, c.nombre]
      );
    }

    return companyId;
  };

  const alphaId = await seedCompany(
    'Empresa Demo Alpha SpA',
    ['@demoalpha.cl', '@alpha-group.com'],
    [
      { nombre: 'Juan Pérez', correo: 'juan.perez@demoalpha.cl' },
      { nombre: 'María González', correo: 'maria.gonzalez@alpha-group.com' }
    ]
  );

  const betaId = await seedCompany(
    'Tecnologías Beta Ltda',
    ['@tecnobeta.cl'],
    [{ nombre: 'Carlos Silva', correo: 'carlos.silva@tecnobeta.cl' }]
  );

  const gammaId = await seedCompany(
    'Servicios Globales Gamma S.A.',
    ['@globalgamma.com'],
    [{ nombre: 'Ana Martínez', correo: 'ana.martinez@globalgamma.com' }]
  );

  // 4. Seeding reuniones
  // Meeting 1: Completed meeting (Alpha SpA)
  const [reu1] = await connection.query("SELECT id FROM reuniones WHERE id_reunion = 'REU-DEMO-0001'");
  if (reu1.length === 0) {
    console.log("Seeding mock meeting REU-DEMO-0001 (Alpha SpA completed)...");
    await connection.query(
      `INSERT INTO reuniones (
        id_reunion, ejecutiva_id, enviado_a, enviado_por, participantes,
        tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos, motivo_reu, minuta, form_f,
        empresa_id, estado_envio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enviado')`,
      [
        'REU-DEMO-0001',
        ejecutivaId,
        'juan.perez@demoalpha.cl',
        'Juan Pérez',
        'Juan Pérez, Ejecutiva de Inducción',
        'Kickoff de Inducción',
        '2026-06-18',
        '10:00:00',
        'Microsoft Teams',
        'ninguno',
        'El cliente se muestra muy interesado en las métricas anuales del portal.',
        '### Temas Tratados\n1. Introducción al sistema.\n2. Explicación de indicadores de horas y saldos.',
        'NO',
        alphaId
      ]
    );
  }

  // Meeting 2: Draft meeting (Beta Ltda)
  const [reu2] = await connection.query("SELECT id FROM reuniones WHERE id_reunion = 'REU-DEMO-0002'");
  if (reu2.length === 0) {
    console.log("Seeding mock meeting REU-DEMO-0002 (Beta Ltda draft)...");
    await connection.query(
      `INSERT INTO reuniones (
        id_reunion, ejecutiva_id, enviado_a, enviado_por, participantes,
        tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos, motivo_reu, minuta, form_f,
        empresa_id, estado_envio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador')`,
      [
        'REU-DEMO-0002',
        ejecutivaId,
        'carlos.silva@tecnobeta.cl',
        'Carlos Silva',
        'Carlos Silva, Ejecutiva de Inducción',
        'Reunión de Coordinación',
        '2026-06-22',
        '15:30:00',
        'Microsoft Teams',
        'ninguno',
        'Reunión pendiente para documentar requerimientos iniciales.',
        '### Borrador de Minuta\n- Revisar excedentes disponibles.\n- Levantar listado de jefes de área.',
        'NO',
        betaId
      ]
    );
  } else {
    // Asegurar que el estado esté como 'borrador'
    await connection.query("UPDATE reuniones SET estado_envio = 'borrador' WHERE id_reunion = 'REU-DEMO-0002'");
  }

  // 5. Seeding Reunión Huérfana
  const [huerfana] = await connection.query("SELECT id FROM reuniones_huerfanas WHERE event_id = 'teams-event-demo-12345'");
  if (huerfana.length === 0) {
    console.log("Seeding mock huerfana meeting (Gamma S.A. suggestion)...");
    await connection.query(
      `INSERT INTO reuniones_huerfanas (usuario_id, event_id, asunto, fecha, hora, asistentes, estado, ical_uid)
       VALUES (?, 'teams-event-demo-12345', 'Inducción de Sistemas Gamma', '2026-06-21', '11:30', ?, 'pendiente', 'ical-demo-gamma')`,
      [ejecutivaId, 'ana.martinez@globalgamma.com, demo.ejecutiva@proforma.cl']
    );
  }

  console.log("🎉 Seeding of induction demo data completed successfully!");
}

module.exports = { seedInductionData };
