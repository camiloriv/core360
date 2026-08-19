const { sql, poolPromise } = require('../mssql');

const getEmpresasWithFilters = async (gerencia_id, jefatura_id) => {
  const pool = await poolPromise;
  let q = `
    SELECT e.*, j.nombre as jefatura_nombre, z.nombre as zona_nombre
    FROM empresas e
    LEFT JOIN usuarios j ON e.jefatura_id = j.id
    LEFT JOIN zonas z ON e.zona_id = z.id
    WHERE 1=1
  `;
  const req = pool.request();

  if (gerencia_id) {
    q += `
      AND (
        j.id IN (
          SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = @gerencia_id
          UNION
          SELECT ug2.usuario_id FROM usuario_gerencias ug2
          WHERE ug2.gerencia_id IN (
            SELECT ug.usuario_id FROM usuario_gerencias ug
            JOIN usuarios u ON ug.usuario_id = u.id
            WHERE ug.gerencia_id = @gerencia_id AND u.permisos = 'gerencia'
          )
        )
        OR e.jefatura_id = @gerencia_id
      )
    `;
    req.input('gerencia_id', sql.Int, gerencia_id);
  } else if (jefatura_id) {
    q += `
      AND (
        e.jefatura_id = @jefatura_id
        OR e.jefatura_id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = @jefatura_id)
      )
    `;
    req.input('jefatura_id', sql.Int, jefatura_id);
  }
  q += ` ORDER BY e.nombre ASC`;
  const result = await req.query(q);
  return result.recordset;
};

const getEmpresasPorEjecutiva = async (id_ejecutiva) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id_ejecutiva', sql.Int, id_ejecutiva)
    .query(`
      SELECT emp.*
      FROM empresas emp
      JOIN usuarios e ON (
        emp.jefatura_id = e.jefatura_id
        OR emp.jefatura_id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = e.jefatura_id)
      )
      WHERE e.id = @id_ejecutiva
      ORDER BY emp.nombre ASC
    `);
  return result.recordset;
};

const getEmpresasPorJefatura = async (id_jefatura) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id_jefatura', sql.Int, id_jefatura)
    .query(`
      SELECT * FROM empresas
      WHERE jefatura_id = @id_jefatura
      OR jefatura_id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = @id_jefatura)
      ORDER BY nombre ASC
    `);
  return result.recordset;
};

const updateEmpresa = async (id, data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  
  let q = `UPDATE empresas SET ${keys.map((k, i) => `${k} = @p${i}`).join(', ')} WHERE id = @id`;
  const req = pool.request().input('id', sql.Int, id);
  Object.values(data).forEach((v, i) => req.input(`p${i}`, v));
  
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const insertEmpresaSeguimientoLog = async (data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  let q = `INSERT INTO empresa_seguimiento_log (${keys.join(', ')}) VALUES (${keys.map((_, i) => `@p${i}`).join(', ')})`;
  const req = pool.request();
  values.forEach((v, i) => req.input(`p${i}`, v));
  
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const getEmpresaFechaSeguimiento = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT fecha_solicitada, fecha_concretada FROM empresas WHERE id = @id');
  return result.recordset[0];
};

const getHistorialSeguimiento = async (empresa_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('empresa_id', sql.Int, empresa_id)
    .query(`
      SELECT log.*, u.nombre as usuario_nombre
      FROM empresa_seguimiento_log log
      LEFT JOIN usuarios u ON log.usuario_id = u.id
      WHERE log.empresa_id = @empresa_id
      ORDER BY log.fecha DESC, log.created_at DESC
    `);
  return result.recordset;
};

const deleteSeguimientoLog = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM empresa_seguimiento_log WHERE id = @id');
  return result.rowsAffected[0];
};

const updateLogSeguimientoByReunion = async (reunionId, data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  
  let q = `UPDATE empresa_seguimiento_log SET ${keys.map((k, i) => `${k} = @p${i}`).join(', ')} WHERE reunion_id = @reunion_id`;
  const req = pool.request().input('reunion_id', sql.Int, reunionId);
  Object.values(data).forEach((v, i) => req.input(`p${i}`, v));
  
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const updateLogSeguimientoByIds = async (ids, data) => {
  const pool = await poolPromise;
  if (!ids || ids.length === 0) return 0;
  
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  
  // Create IN clause parameter list
  const inParams = ids.map((_, i) => `@id${i}`).join(', ');
  
  let q = `UPDATE empresa_seguimiento_log SET ${keys.map((k, i) => `${k} = @p${i}`).join(', ')} WHERE id IN (${inParams})`;
  const req = pool.request();
  Object.values(data).forEach((v, i) => req.input(`p${i}`, v));
  ids.forEach((id, i) => req.input(`id${i}`, sql.Int, id));
  
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const getLogsEmpresasFilter = async (periodo, anio) => {
  const pool = await poolPromise;
  let q = `
    SELECT log.*, u.nombre as usuario_nombre
    FROM empresa_seguimiento_log log
    LEFT JOIN usuarios u ON log.usuario_id = u.id
    WHERE 1=1
  `;
  const req = pool.request();

  if (periodo) {
    q += " AND FORMAT(log.fecha, 'yyyy-MM') = @periodo";
    req.input('periodo', sql.VarChar, periodo);
  } else if (anio) {
    q += " AND YEAR(log.fecha) = @anio";
    req.input('anio', sql.Int, parseInt(anio));
  }
  
  q += " ORDER BY log.fecha DESC, log.created_at DESC";
  
  const result = await req.query(q);
  return result.recordset;
};

const insertEmpresa = async (data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  let q = `INSERT INTO empresas (${keys.join(', ')}) OUTPUT INSERTED.id VALUES (${keys.map((_, i) => `@p${i}`).join(', ')})`;
  const req = pool.request();
  values.forEach((v, i) => req.input(`p${i}`, v));
  
  const result = await req.query(q);
  return result.recordset[0]?.id;
};

const deleteEmpresa = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM empresas WHERE id = @id');
  return result.rowsAffected[0];
};

const updateEmpresasJefatura = async (target_jefatura_id, source_jefatura_id, empresa_ids) => {
  const pool = await poolPromise;
  let q = 'UPDATE empresas SET jefatura_id = @target_jefatura_id WHERE 1=1';
  const req = pool.request().input('target_jefatura_id', sql.Int, target_jefatura_id);
  
  if (empresa_ids && empresa_ids.length > 0) {
    const inParams = empresa_ids.map((_, i) => `@id${i}`).join(', ');
    q += ` AND id IN (${inParams})`;
    empresa_ids.forEach((id, i) => req.input(`id${i}`, sql.Int, id));
  } else if (source_jefatura_id) {
    q += ' AND jefatura_id = @source_jefatura_id';
    req.input('source_jefatura_id', sql.Int, source_jefatura_id);
  }
  
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const getZonasAll = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT id, nombre FROM zonas');
  return result.recordset;
};

const getUsuariosBasic = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT id, nombre, correo FROM usuarios');
  return result.recordset;
};

const getEmpresasNombres = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT nombre FROM empresas');
  return result.recordset;
};

const insertEmpresasBatch = async (values) => {
  if (!values || values.length === 0) return;
  const pool = await poolPromise;
  
  // Bulk insert using multiple VALUES or TVP. We will use multiple values query.
  const keys = Object.keys(values[0]);
  let q = `INSERT INTO empresas (${keys.join(', ')}) VALUES `;
  const req = pool.request();
  
  const valueSets = [];
  let paramIndex = 0;
  for (const obj of values) {
    const paramsForObj = [];
    for (const key of keys) {
      const pName = `p${paramIndex++}`;
      paramsForObj.push(`@${pName}`);
      req.input(pName, obj[key]);
    }
    valueSets.push(`(${paramsForObj.join(', ')})`);
  }
  
  q += valueSets.join(', ');
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const getJefaturaEmpresa = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT jefatura_id FROM empresas WHERE id = @id');
  return result.recordset[0];
};

const getUsuariosAsignados = async (jefaturaId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('jefaturaId', sql.Int, jefaturaId)
    .query(`
      SELECT id, nombre, permisos, correo, jefatura_id
      FROM usuarios
      WHERE id = @jefaturaId
      OR (jefatura_id = @jefaturaId AND permisos = 'ejecutiva')
      OR (id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = @jefaturaId) AND permisos = 'gerencia')
      ORDER BY permisos DESC, nombre ASC
    `);
  return result.recordset;
};

const getVinculacionesEmpresas = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT e.id, e.nombre, e.jefatura_id, j.nombre as jefatura_nombre, e.zona_id, z.nombre as zona_nombre
    FROM empresas e
    LEFT JOIN usuarios j ON e.jefatura_id = j.id
    LEFT JOIN zonas z ON e.zona_id = z.id
    ORDER BY e.nombre ASC
  `);
  return result.recordset;
};

const getEmpresaDominios = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT id, empresa_id, dominio FROM empresa_dominios');
  return result.recordset;
};

const getEmpresaContactos = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT id, empresa_id, correo, nombre FROM empresa_contactos');
  return result.recordset;
};

const traspasoExcel = async (traspasos) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    for (const t of traspasos) {
      const { empresa_id, target_jefatura_id } = t;
      await new sql.Request(transaction)
        .input('jefatura_id', sql.Int, target_jefatura_id || null)
        .input('id', sql.Int, empresa_id)
        .query("UPDATE empresas SET jefatura_id = @jefatura_id WHERE id = @id");
    }
    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

const actualizarVinculaciones = async (id, jefatura_id, dominios, contactos, nombre, zona_id) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  
  try {
    const currentEmpRes = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .query("SELECT TOP 1 nombre, zona_id FROM empresas WHERE id = @id");
    const currentEmp = currentEmpRes.recordset[0];
    
    if (!currentEmp) {
      throw new Error("Empresa no encontrada");
    }
    
    const finalNombre = nombre || currentEmp.nombre;
    const finalZonaId = zona_id !== undefined ? zona_id : currentEmp.zona_id;

    await new sql.Request(transaction)
      .input('nombre', sql.VarChar, finalNombre)
      .input('jefatura_id', sql.Int, jefatura_id || null)
      .input('zona_id', sql.Int, finalZonaId || null)
      .input('id', sql.Int, id)
      .query("UPDATE empresas SET nombre = @nombre, jefatura_id = @jefatura_id, zona_id = @zona_id WHERE id = @id");

    if (Array.isArray(dominios)) {
      const cleanDominios = dominios
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0)
        .map(d => d.startsWith('@') ? d : '@' + d);

      const existingDomsRes = await new sql.Request(transaction)
        .input('empresa_id', sql.Int, id)
        .query("SELECT dominio FROM empresa_dominios WHERE empresa_id = @empresa_id");
      const existingDoms = existingDomsRes.recordset;
      
      const existingDomSet = new Set(existingDoms.map(d => d.dominio));
      const cleanDomSet = new Set(cleanDominios);

      for (const dom of existingDomSet) {
        if (!cleanDomSet.has(dom)) {
          await new sql.Request(transaction)
            .input('empresa_id', sql.Int, id)
            .input('dominio', sql.VarChar, dom)
            .query("DELETE FROM empresa_dominios WHERE empresa_id = @empresa_id AND dominio = @dominio");
        }
      }

      for (const dom of cleanDomSet) {
        if (!existingDomSet.has(dom)) {
          await new sql.Request(transaction)
            .input('empresa_id', sql.Int, id)
            .input('dominio', sql.VarChar, dom)
            .query("INSERT INTO empresa_dominios (empresa_id, dominio) VALUES (@empresa_id, @dominio)");
        }
      }
    }

    if (Array.isArray(contactos)) {
      const cleanContactos = contactos
        .map(c => ({
          id: c.id,
          nombre: c.nombre ? c.nombre.trim() : null,
          correo: c.correo ? c.correo.trim().toLowerCase() : ''
        }))
        .filter(c => c.correo.includes('@'));

      const existingContsRes = await new sql.Request(transaction)
        .input('empresa_id', sql.Int, id)
        .query("SELECT id, correo FROM empresa_contactos WHERE empresa_id = @empresa_id");
      const existingConts = existingContsRes.recordset;
      
      const existingContMap = new Map(existingConts.map(c => [c.id, c.correo]));
      const newContIds = new Set(cleanContactos.map(c => c.id).filter(Boolean));

      for (const [extId, extCorreo] of existingContMap.entries()) {
        if (!newContIds.has(extId)) {
          await new sql.Request(transaction)
            .input('id', sql.Int, extId)
            .query("DELETE FROM empresa_contactos WHERE id = @id");
        }
      }

      for (const c of cleanContactos) {
        if (c.id && existingContMap.has(c.id)) {
          await new sql.Request(transaction)
            .input('nombre', sql.VarChar, c.nombre)
            .input('correo', sql.VarChar, c.correo)
            .input('id', sql.Int, c.id)
            .query("UPDATE empresa_contactos SET nombre = @nombre, correo = @correo WHERE id = @id");
        } else {
           const existsRes = await new sql.Request(transaction)
             .input('correo', sql.VarChar, c.correo)
             .query("SELECT TOP 1 id FROM empresa_contactos WHERE correo = @correo");
           if (existsRes.recordset.length > 0) {
             await new sql.Request(transaction)
               .input('nombre', sql.VarChar, c.nombre)
               .input('empresa_id', sql.Int, id)
               .input('id', sql.Int, existsRes.recordset[0].id)
               .query("UPDATE empresa_contactos SET nombre = @nombre, empresa_id = @empresa_id WHERE id = @id");
           } else {
             await new sql.Request(transaction)
               .input('empresa_id', sql.Int, id)
               .input('nombre', sql.VarChar, c.nombre)
               .input('correo', sql.VarChar, c.correo)
               .query("INSERT INTO empresa_contactos (empresa_id, correo, nombre) VALUES (@empresa_id, @correo, @nombre)");
           }
        }
      }
    }

    const allowedDomains = new Set();
    const allowedEmails = new Set();

    if (Array.isArray(dominios)) {
      dominios
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0)
        .forEach(d => allowedDomains.add(d.startsWith('@') ? d : '@' + d));
    }
    if (Array.isArray(contactos)) {
      contactos
        .map(c => c.correo ? c.correo.trim().toLowerCase() : '')
        .filter(email => email.includes('@'))
        .forEach(email => allowedEmails.add(email));
    }

    if (allowedDomains.size > 0 || allowedEmails.size > 0) {
      const meetingsRes = await new sql.Request(transaction)
        .query("SELECT id, asistentes FROM teams_eventos WHERE empresa_id IS NULL AND estado NOT IN ('cancelada', 'excluida')");
      const meetings = meetingsRes.recordset;

      const proformaDomains = ['@proforma.cl', '@oticproforma.cl'];

      for (const meeting of meetings) {
        let attendeesList = [];
        try {
          attendeesList = typeof meeting.asistentes === 'string' ? JSON.parse(meeting.asistentes) : (meeting.asistentes || []);
        } catch (e) {
          continue;
        }

        if (!Array.isArray(attendeesList) || attendeesList.length === 0) continue;

        let hasTargetCompanyAttendee = false;
        let hasInvalidExternalAttendee = false;

        for (const att of attendeesList) {
          const email = (att.email || '').trim().toLowerCase();
          if (!email) continue;

          const isProforma = proformaDomains.some(d => email.endsWith(d));
          if (isProforma) continue;

          const emailDomain = '@' + email.split('@')[1];
          const matchesDomain = allowedDomains.has(emailDomain);
          const matchesEmail = allowedEmails.has(email);

          if (matchesDomain || matchesEmail) {
            hasTargetCompanyAttendee = true;
          } else {
            hasInvalidExternalAttendee = true;
            break;
          }
        }

        if (hasTargetCompanyAttendee && !hasInvalidExternalAttendee) {
          await new sql.Request(transaction).input('id', sql.Int, meeting.id).input('empresa_id', sql.Int, id).query("UPDATE teams_eventos SET empresa_id = @empresa_id WHERE id = @id");
        }
      }
    }
    
    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

module.exports = {
  getEmpresasWithFilters,
  getEmpresasPorEjecutiva,
  getEmpresasPorJefatura,
  updateEmpresa,
  insertEmpresaSeguimientoLog,
  getEmpresaFechaSeguimiento,
  getHistorialSeguimiento,
  deleteSeguimientoLog,
  updateLogSeguimientoByReunion,
  updateLogSeguimientoByIds,
  getLogsEmpresasFilter,
  insertEmpresa,
  deleteEmpresa,
  updateEmpresasJefatura,
  getZonasAll,
  getUsuariosBasic,
  getEmpresasNombres,
  insertEmpresasBatch,
  getJefaturaEmpresa,
  getUsuariosAsignados,
  getVinculacionesEmpresas,
  getEmpresaDominios,
  getEmpresaContactos,
  traspasoExcel,
  actualizarVinculaciones
};
