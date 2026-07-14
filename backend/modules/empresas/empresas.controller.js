const db = require("../../database/connection");

exports.listarEmpresas = async (req, res) => {
  try {
    let { gerencia_id, jefatura_id } = req.query;
    
    // Auto-filtro de seguridad para no-admins
    if (req.usuario && req.usuario.permisos !== 'admin' && req.usuario.permisos !== 'ADMIN') {
      if (req.usuario.permisos === 'gerencia') {
        gerencia_id = req.usuario.id;
      } else if (req.usuario.permisos === 'jefatura') {
        jefatura_id = req.usuario.id;
      } else if (req.usuario.permisos === 'ejecutiva') {
        // Ejecutivas solo ven empresas de su jefatura
        jefatura_id = req.usuario.jefatura_id || -1; // -1 para forzar que no vea nada si no tiene jefatura
      }
    }

    let whereClause = "";
    const params = [];
    if (gerencia_id) {
      whereClause = ` WHERE (j.id IN (
        SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?
        UNION
        SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
          SELECT ug.usuario_id FROM usuario_gerencias ug 
          JOIN usuarios u ON ug.usuario_id = u.id 
          WHERE ug.gerencia_id = ? AND u.permisos = 'gerencia'
        )
      ) OR e.jefatura_id = ?)`;
      params.push(gerencia_id, gerencia_id, gerencia_id);
    } else if (jefatura_id) {
      whereClause = ` WHERE (e.jefatura_id = ? OR e.jefatura_id IN (
        SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = ?
      ))`;
      params.push(jefatura_id, jefatura_id);
    }
    const [rows] = await db.query(`
      SELECT e.*, j.nombre as jefatura_nombre, z.nombre as zona_nombre
      FROM empresas e 
      LEFT JOIN usuarios j ON e.jefatura_id = j.id
      LEFT JOIN zonas z ON e.zona_id = z.id
      ${whereClause}
      ORDER BY e.nombre ASC
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerEmpresasPorEjecutiva = async (req, res) => {
  try {
    const { id_ejecutiva } = req.params;
    const [rows] = await db.query(
      `SELECT emp.* 
       FROM empresas emp
       JOIN usuarios e ON (
         emp.jefatura_id = e.jefatura_id 
         OR emp.jefatura_id IN (
           SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = e.jefatura_id
         )
       )
       WHERE e.id = ?
       ORDER BY emp.nombre ASC`,
      [id_ejecutiva]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerEmpresasPorJefatura = async (req, res) => {
  try {
    const { id_jefatura } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM empresas 
       WHERE jefatura_id = ? OR jefatura_id IN (
         SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = ?
       ) 
       ORDER BY nombre ASC`,
      [id_jefatura, id_jefatura]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEmpresa = async (req, res) => {
  const { id } = req.params;
  const { nombre, jefatura_id, zona_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    await db.query("UPDATE empresas SET nombre = ?, jefatura_id = ?, zona_id = ? WHERE id = ?", [nombre, jefatura_id || null, zona_id || null, id]);
    res.json({ msg: "Actualizada" });
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEstadoEmpresa = async (req, res) => {
  const { id } = req.params;
  const { estado_seguimiento, fecha, usuario_id } = req.body;
  try {
    let query = "UPDATE empresas SET estado_seguimiento = ? WHERE id = ?";
    let params = [estado_seguimiento, id];

    if (estado_seguimiento === 'solicitada') {
      const fechaVal = fecha || new Date().toISOString().split('T')[0];
      query = "UPDATE empresas SET estado_seguimiento = ?, fecha_solicitada = ?, fecha_concretada = NULL WHERE id = ?";
      params = [estado_seguimiento, fechaVal, id];
      // Insert log entry
      await db.query(
        "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id) VALUES (?, 'solicitada', ?, ?)",
        [id, fechaVal, usuario_id || null]
      );
    } else if (estado_seguimiento === 'agendada') {
      const fechaVal = fecha || new Date().toISOString().split('T')[0];
      query = "UPDATE empresas SET estado_seguimiento = ?, fecha_solicitada = COALESCE(fecha_solicitada, ?), fecha_concretada = ? WHERE id = ?";
      params = [estado_seguimiento, fechaVal, fechaVal, id];
      // Insert log entry
      await db.query(
        "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id) VALUES (?, 'agendada', ?, ?)",
        [id, fechaVal, usuario_id || null]
      );
    } else if (estado_seguimiento === 'pendiente') {
      // Reset for new cycle — do NOT delete historical logs
      query = "UPDATE empresas SET estado_seguimiento = ?, fecha_solicitada = NULL, fecha_concretada = NULL WHERE id = ?";
      params = [estado_seguimiento, id];
    }

    await db.query(query, params);

    // Return updated empresa + historial
    const [[updatedEmp]] = await db.query("SELECT fecha_solicitada, fecha_concretada FROM empresas WHERE id = ?", [id]);
    const [historial] = await db.query(
      `SELECT log.*, u.nombre AS usuario_nombre 
       FROM empresa_seguimiento_log log
       LEFT JOIN usuarios u ON log.usuario_id = u.id
       WHERE log.empresa_id = ? 
       ORDER BY log.fecha DESC, log.created_at DESC`,
      [id]
    );
    res.json({ 
      msg: "Estado actualizado", 
      fecha_solicitada: updatedEmp ? updatedEmp.fecha_solicitada : null, 
      fecha_concretada: updatedEmp ? updatedEmp.fecha_concretada : null,
      historial
    });
  } catch (err) {
    console.error("Error actualizando estado empresa:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

// Obtener historial de seguimiento de una empresa
exports.obtenerHistorialSeguimiento = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT log.*, u.nombre AS usuario_nombre 
       FROM empresa_seguimiento_log log
       LEFT JOIN usuarios u ON log.usuario_id = u.id
       WHERE log.empresa_id = ? 
       ORDER BY log.fecha DESC, log.created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo historial:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

// Obtener todos los logs de seguimiento filtrados por período
// Query params: periodo=2026-05 (mes) o anio=2026 (año completo)
exports.obtenerLogsEmpresas = async (req, res) => {
  try {
    const { periodo, anio } = req.query;
    let whereClause = "";
    let params = [];

    if (periodo) {
      // periodo format: "2026-05" → filter by that month
      whereClause = "WHERE DATE_FORMAT(log.fecha, '%Y-%m') = ?";
      params = [periodo];
    } else if (anio) {
      // anio format: "2026" → filter by that year
      whereClause = "WHERE YEAR(log.fecha) = ?";
      params = [parseInt(anio)];
    }

    const [rows] = await db.query(
      `SELECT log.*, u.nombre AS usuario_nombre 
       FROM empresa_seguimiento_log log
       LEFT JOIN usuarios u ON log.usuario_id = u.id
       ${whereClause} 
       ORDER BY log.fecha DESC, log.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo logs:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearEmpresa = async (req, res) => {
  const { nombre, jefatura_id, zona_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    const [result] = await db.query(
      "INSERT INTO empresas (nombre, jefatura_id, zona_id, estado_seguimiento) VALUES (?, ?, ?, 'pendiente')",
      [nombre, jefatura_id || null, zona_id || null]
    );
    res.json({ id: result.insertId, msg: "Empresa creada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarEmpresa = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM empresas WHERE id = ?", [id]);
    res.json({ msg: "Empresa eliminada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.traspasoMasivo = async (req, res) => {
  const { source_jefatura_id, target_jefatura_id, empresa_ids } = req.body;
  if (!target_jefatura_id) {
    return res.status(400).json({ error: "Jefatura de destino requerida" });
  }
  try {
    if (empresa_ids && empresa_ids.length > 0) {
      // Traspaso de empresas seleccionadas
      await db.query(
        "UPDATE empresas SET jefatura_id = ? WHERE id IN (?)",
        [target_jefatura_id, empresa_ids]
      );
    } else if (source_jefatura_id) {
      // Traspaso de TODAS las empresas de una jefatura a otra
      await db.query(
        "UPDATE empresas SET jefatura_id = ? WHERE jefatura_id = ?",
        [target_jefatura_id, source_jefatura_id]
      );
    } else {
      return res.status(400).json({ error: "Debe especificar empresa_ids o source_jefatura_id" });
    }
    res.json({ msg: "Traspaso masivo realizado con éxito" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.cargaMasivaEmpresas = async (req, res) => {
  const { empresas } = req.body;
  if (!empresas || !Array.isArray(empresas) || empresas.length === 0) {
    return res.status(400).json({ error: "No se proporcionaron empresas para procesar." });
  }

  try {
    const [zonas] = await db.query("SELECT id, nombre FROM zonas");
    const [usuarios] = await db.query("SELECT id, nombre, correo FROM usuarios");
    const [empresasExistentes] = await db.query("SELECT nombre FROM empresas");
    
    const zonasMap = new Map();
    zonas.forEach(z => zonasMap.set(z.nombre.toLowerCase().trim(), z.id));
    
    const usuariosMap = new Map();
    usuarios.forEach(u => {
      usuariosMap.set(u.nombre.toLowerCase().trim(), u.id);
      usuariosMap.set(u.correo.toLowerCase().trim(), u.id);
    });

    const empresasSet = new Set(empresasExistentes.map(e => e.nombre.toLowerCase().trim()));

    const exitosos = [];
    const errores = [];

    for (const item of empresas) {
      const nombreEmpresa = item.empresa ? String(item.empresa).trim() : "";
      const ejecutiva = item.ejecutiva ? String(item.ejecutiva).trim() : "";
      const zona = item.zona_regional ? String(item.zona_regional).trim() : "";

      if (!nombreEmpresa) {
        errores.push({ fila: item, error: "Falta el nombre de la empresa" });
        continue;
      }
      
      if (empresasSet.has(nombreEmpresa.toLowerCase())) {
        errores.push({ fila: item, error: "La empresa ya existe en la base de datos" });
        continue;
      }

      let jefatura_id = null;
      if (ejecutiva) {
        if (usuariosMap.has(ejecutiva.toLowerCase())) {
          jefatura_id = usuariosMap.get(ejecutiva.toLowerCase());
        } else {
          errores.push({ fila: item, error: `No se encontró coincidencia para ejecutiva: ${ejecutiva}` });
          continue;
        }
      }

      let zona_id = null;
      if (zona) {
        if (zonasMap.has(zona.toLowerCase())) {
          zona_id = zonasMap.get(zona.toLowerCase());
        } else {
          errores.push({ fila: item, error: `No se encontró coincidencia para zona: ${zona}` });
          continue;
        }
      }

      exitosos.push({
        nombre: nombreEmpresa,
        jefatura_id,
        zona_id,
        estado_seguimiento: 'pendiente'
      });
      // Añadimos al Set para evitar duplicados en el mismo archivo Excel
      empresasSet.add(nombreEmpresa.toLowerCase());
    }

    // Insertar exitosos
    let insertados = 0;
    if (exitosos.length > 0) {
      const values = exitosos.map(e => [e.nombre, e.jefatura_id, e.zona_id, e.estado_seguimiento]);
      await db.query(
        "INSERT INTO empresas (nombre, jefatura_id, zona_id, estado_seguimiento) VALUES ?",
        [values]
      );
      insertados = exitosos.length;
    }

    res.json({
      msg: "Proceso completado",
      resumen: {
        totalProcesados: empresas.length,
        insertados,
        conErrores: errores.length
      },
      errores
    });

  } catch (err) {
    console.error("Error en carga masiva de empresas:", err);
    res.status(500).json({ error: "Error interno procesando la carga masiva" });
  }
};

exports.traspasoExcel = async (req, res) => {
  const { traspasos } = req.body;
  if (!traspasos || !Array.isArray(traspasos)) {
    return res.status(400).json({ error: "Datos de traspaso inválidos" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const t of traspasos) {
      const { empresa_id, target_jefatura_id } = t;
      await connection.query(
        "UPDATE empresas SET jefatura_id = ? WHERE id = ?",
        [target_jefatura_id || null, empresa_id]
      );
    }
    await connection.commit();
    res.json({ msg: "Traspaso por Excel completado con éxito" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: "Error en la BD al procesar el Excel" });
  } finally {
    connection.release();
  }
};

exports.obtenerUsuariosAsignados = async (req, res) => {
  const { id } = req.params;
  try {
    // Primero, obtener la jefatura de esta empresa
    const [[empresa]] = await db.query("SELECT jefatura_id FROM empresas WHERE id = ?", [id]);
    
    if (!empresa || !empresa.jefatura_id) {
      return res.json([]);
    }
    
    const jefaturaId = empresa.jefatura_id;
    
    // Obtener todos los usuarios permitidos (jefatura, sus ejecutivas, y sus gerencias)
    const [usuarios] = await db.query(`
      SELECT id, nombre, permisos, correo, jefatura_id
      FROM usuarios
      WHERE id = ? 
         OR (jefatura_id = ? AND permisos = 'ejecutiva')
         OR (id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = ?) AND permisos = 'gerencia')
      ORDER BY permisos DESC, nombre ASC
    `, [jefaturaId, jefaturaId, jefaturaId]);
    
    res.json(usuarios);
  } catch (err) {
    console.error("Error obteniendo usuarios asignados a la empresa:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerVinculaciones = async (req, res) => {
  try {
    const [empresas] = await db.query(`
      SELECT e.id, e.nombre, e.jefatura_id, j.nombre as jefatura_nombre, e.zona_id, z.nombre as zona_nombre
      FROM empresas e
      LEFT JOIN usuarios j ON e.jefatura_id = j.id
      LEFT JOIN zonas z ON e.zona_id = z.id
      ORDER BY e.nombre ASC
    `);

    const [dominios] = await db.query(`
      SELECT id, empresa_id, dominio FROM empresa_dominios
    `);

    const [contactos] = await db.query(`
      SELECT id, empresa_id, correo, nombre FROM empresa_contactos
    `);

    // Group by company
    const map = {};
    empresas.forEach(emp => {
      map[emp.id] = {
        ...emp,
        dominios: [],
        contactos: []
      };
    });

    dominios.forEach(dom => {
      if (map[dom.empresa_id]) {
        map[dom.empresa_id].dominios.push(dom.dominio);
      }
    });

    contactos.forEach(cont => {
      if (map[cont.empresa_id]) {
        map[cont.empresa_id].contactos.push({
          id: cont.id,
          nombre: cont.nombre,
          correo: cont.correo
        });
      }
    });

    res.json(Object.values(map));
  } catch (err) {
    console.error("Error obteniendo vinculaciones:", err);
    res.status(500).json({ error: "Error al obtener vinculaciones de la BD" });
  }
};

exports.actualizarVinculaciones = async (req, res) => {
  const { id } = req.params; // empresa_id
  const { jefatura_id, dominios, contactos, nombre, zona_id } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update company basic info
    const [empRows] = await connection.query("SELECT nombre, zona_id FROM empresas WHERE id = ?", [id]);
    if (empRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Empresa no encontrada" });
    }
    const currentEmp = empRows[0];
    const finalNombre = nombre || currentEmp.nombre;
    const finalZonaId = zona_id !== undefined ? zona_id : currentEmp.zona_id;

    await connection.query(
      "UPDATE empresas SET nombre = ?, jefatura_id = ?, zona_id = ? WHERE id = ?",
      [finalNombre, jefatura_id || null, finalZonaId || null, id]
    );

    // 2. Synchronize domains (empresa_dominios)
    if (Array.isArray(dominios)) {
      const cleanDominios = dominios
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0)
        .map(d => d.startsWith('@') ? d : '@' + d);

      const [existingDoms] = await connection.query("SELECT dominio FROM empresa_dominios WHERE empresa_id = ?", [id]);
      const existingDomSet = new Set(existingDoms.map(d => d.dominio));
      const cleanDomSet = new Set(cleanDominios);

      for (const dom of existingDomSet) {
        if (!cleanDomSet.has(dom)) {
          await connection.query("DELETE FROM empresa_dominios WHERE empresa_id = ? AND dominio = ?", [id, dom]);
        }
      }

      for (const dom of cleanDomSet) {
        if (!existingDomSet.has(dom)) {
          await connection.query("INSERT IGNORE INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)", [id, dom]);
        }
      }
    }

    // 3. Synchronize contacts (empresa_contactos)
    if (Array.isArray(contactos)) {
      const cleanContactos = contactos
        .map(c => ({
          id: c.id,
          nombre: c.nombre ? c.nombre.trim() : null,
          correo: c.correo ? c.correo.trim().toLowerCase() : ''
        }))
        .filter(c => c.correo.includes('@'));

      const [existingConts] = await connection.query("SELECT id, correo FROM empresa_contactos WHERE empresa_id = ?", [id]);
      const existingContMap = new Map(existingConts.map(c => [c.id, c.correo]));
      const newContIds = new Set(cleanContactos.map(c => c.id).filter(Boolean));

      for (const [extId, extCorreo] of existingContMap.entries()) {
        if (!newContIds.has(extId)) {
          await connection.query("DELETE FROM empresa_contactos WHERE id = ?", [extId]);
        }
      }

      for (const c of cleanContactos) {
        if (c.id && existingContMap.has(c.id)) {
          await connection.query(
            "UPDATE empresa_contactos SET nombre = ?, correo = ? WHERE id = ?",
            [c.nombre, c.correo, c.id]
          );
        } else {
          await connection.query(
            "INSERT INTO empresa_contactos (empresa_id, correo, nombre) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)",
            [id, c.correo, c.nombre]
          );
        }
      }
    }

    // 4. Buscar y vincular masivamente reuniones huérfanas que coincidan con estos dominios/correos
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
      const [meetings] = await connection.query(`
        SELECT id, asistentes
        FROM teams_eventos
        WHERE empresa_id IS NULL AND estado NOT IN ('cancelada', 'excluida')
      `);

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

          // Check if it's proforma
          const isProforma = proformaDomains.some(d => email.endsWith(d));
          if (isProforma) continue;

          // Check if it matches allowed domains or emails
          const emailDomain = '@' + email.split('@')[1];
          const matchesDomain = allowedDomains.has(emailDomain);
          const matchesEmail = allowedEmails.has(email);

          if (matchesDomain || matchesEmail) {
            hasTargetCompanyAttendee = true;
          } else {
            // There is an attendee from a different external domain/email
            hasInvalidExternalAttendee = true;
            break;
          }
        }

        // If it contains target company attendees, and no other third-party company attendees
        if (hasTargetCompanyAttendee && !hasInvalidExternalAttendee) {
          await connection.query("UPDATE teams_eventos SET empresa_id = ? WHERE id = ?", [id, meeting.id]);
        }
      }
    }

    await connection.commit();
    res.json({ success: true, message: "Vinculaciones actualizadas con éxito" });
  } catch (err) {
    await connection.rollback();
    console.error("Error actualizando vinculaciones:", err);
    res.status(500).json({ error: "Error interno al actualizar vinculaciones" });
  } finally {
    connection.release();
  }
};
