const db = require("../../database/connection");
const XLSX = require("xlsx");

// =============================================
// GET /nuevos-negocios — Listar con filtros
// =============================================
const listar = async (req, res) => {
  try {
    const {
      estado_contacto,
      estado,
      zona,
      jefa_cartera,
      indicador,
      otic_actual,
      busqueda,
      page = 1,
      limit = 200,
    } = req.query;

    let where = "WHERE 1=1";
    const params = [];

    if (estado_contacto) {
      where += " AND n.estado_contacto = ?";
      params.push(estado_contacto);
    }
    if (estado) {
      where += " AND n.estado = ?";
      params.push(estado);
    }
    if (zona) {
      where += " AND n.zona = ?";
      params.push(zona);
    }
    if (jefa_cartera) {
      where += " AND n.jefa_cartera = ?";
      params.push(jefa_cartera);
    }
    if (indicador) {
      where += " AND n.indicador = ?";
      params.push(indicador);
    }
    if (otic_actual) {
      where += " AND n.otic_actual = ?";
      params.push(otic_actual);
    }
    if (busqueda) {
      where += " AND (n.holding LIKE ? OR n.razon_social LIKE ? OR n.contacto LIKE ? OR n.correo LIKE ? OR n.rut LIKE ?)";
      const b = `%${busqueda}%`;
      params.push(b, b, b, b, b);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await db.query(
      `SELECT n.* FROM nuevos_negocios n ${where} ORDER BY n.estado_contacto ASC, n.holding ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM nuevos_negocios n ${where}`,
      params
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error listando nuevos negocios:", error);
    res.status(500).json({ error: "Error al listar nuevos negocios" });
  }
};

// =============================================
// GET /nuevos-negocios/stats — KPIs
// =============================================
const stats = async (req, res) => {
  try {
    const [estadoContacto] = await db.query(`
      SELECT estado_contacto, COUNT(*) as count,
        SUM(monto_1_porciento) as monto_proyectado,
        SUM(aporte_ingresado) as aporte_ingresado
      FROM nuevos_negocios
      GROUP BY estado_contacto
    `);

    const [estadoDetalle] = await db.query(`
      SELECT estado, COUNT(*) as count
      FROM nuevos_negocios
      GROUP BY estado
    `);

    const [[totales]] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(monto_1_porciento) as monto_proyectado_total,
        SUM(aporte_ingresado) as aporte_ingresado_total,
        SUM(monto_administracion) as monto_administracion_total
      FROM nuevos_negocios
    `);

    res.json({
      por_estado_contacto: estadoContacto,
      por_estado: estadoDetalle,
      totales,
    });
  } catch (error) {
    console.error("Error obteniendo stats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};

// =============================================
// GET /nuevos-negocios/historial/:id
// =============================================
const historial = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM nuevos_negocios_historial WHERE negocio_id = ? ORDER BY created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo historial:", error);
    res.status(500).json({ error: "Error al obtener historial" });
  }
};

// =============================================
// GET /nuevos-negocios/:id — Detalle
// =============================================
const detalle = async (req, res) => {
  try {
    const { id } = req.params;
    const [[row]] = await db.query("SELECT * FROM nuevos_negocios WHERE id = ?", [id]);
    if (!row) return res.status(404).json({ error: "No encontrado" });
    res.json(row);
  } catch (error) {
    console.error("Error obteniendo detalle:", error);
    res.status(500).json({ error: "Error al obtener detalle" });
  }
};

// =============================================
// POST /nuevos-negocios — Crear
// =============================================
const crear = async (req, res) => {
  try {
    const {
      holding, estado_contacto, rut, razon_social, evento, indicador,
      asistio_evento, zona, monto_1_porciento, tasa_administracion,
      monto_administracion, otic_actual, mes_envio_propuesta, jefa_cartera,
      estado, aporte_ingresado, fecha_autoriza_propuesta, contacto,
      contacto_2, correo, cargo, celular_telefono, comentarios, fecha_reunion,
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO nuevos_negocios (
        holding, estado_contacto, rut, razon_social, evento, indicador,
        asistio_evento, zona, monto_1_porciento, tasa_administracion,
        monto_administracion, otic_actual, mes_envio_propuesta, jefa_cartera,
        estado, aporte_ingresado, fecha_autoriza_propuesta, contacto,
        contacto_2, correo, cargo, celular_telefono, comentarios, fecha_reunion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        holding || null, estado_contacto || 'PROSPECTO', rut || null,
        razon_social || null, evento || null, indicador || null,
        asistio_evento || 'No', zona || null,
        parseFloat(monto_1_porciento) || 0, parseFloat(tasa_administracion) || 0,
        parseFloat(monto_administracion) || 0, otic_actual || null,
        mes_envio_propuesta || null, jefa_cartera || null,
        estado || 'Prospecto', parseFloat(aporte_ingresado) || 0,
        fecha_autoriza_propuesta || null, contacto || null,
        contacto_2 || null, correo || null, cargo || null,
        celular_telefono || null, comentarios || null, fecha_reunion || null,
      ]
    );

    // Log de creación
    const usuario = req.user ? req.user.nombre || req.user.email : "Sistema";
    await db.query(
      `INSERT INTO nuevos_negocios_historial (negocio_id, campo_modificado, valor_anterior, valor_nuevo, usuario)
       VALUES (?, 'creacion', NULL, ?, ?)`,
      [result.insertId, `Registro creado: ${holding || razon_social || 'Sin nombre'}`, usuario]
    );

    const [[newRow]] = await db.query("SELECT * FROM nuevos_negocios WHERE id = ?", [result.insertId]);
    res.status(201).json(newRow);
  } catch (error) {
    console.error("Error creando negocio:", error);
    res.status(500).json({ error: "Error al crear registro" });
  }
};

// =============================================
// PUT /nuevos-negocios/:id — Actualizar
// =============================================
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query("SELECT * FROM nuevos_negocios WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "No encontrado" });

    const {
      holding, estado_contacto, rut, razon_social, evento, indicador,
      asistio_evento, zona, monto_1_porciento, tasa_administracion,
      monto_administracion, otic_actual, mes_envio_propuesta, jefa_cartera,
      estado, aporte_ingresado, fecha_autoriza_propuesta, contacto,
      contacto_2, correo, cargo, celular_telefono, comentarios, fecha_reunion,
    } = req.body;

    const usuario = req.user ? req.user.nombre || req.user.email : "Sistema";

    // Log cambios de estado
    const camposTrackeados = [
      { campo: 'estado_contacto', nuevo: estado_contacto, anterior: existing.estado_contacto },
      { campo: 'estado', nuevo: estado, anterior: existing.estado },
      { campo: 'jefa_cartera', nuevo: jefa_cartera, anterior: existing.jefa_cartera },
    ];

    for (const c of camposTrackeados) {
      if (c.nuevo !== undefined && c.nuevo !== c.anterior) {
        await db.query(
          `INSERT INTO nuevos_negocios_historial (negocio_id, campo_modificado, valor_anterior, valor_nuevo, usuario)
           VALUES (?, ?, ?, ?, ?)`,
          [id, c.campo, c.anterior || '', c.nuevo || '', usuario]
        );
      }
    }

    await db.query(
      `UPDATE nuevos_negocios SET
        holding = ?, estado_contacto = ?, rut = ?, razon_social = ?, evento = ?,
        indicador = ?, asistio_evento = ?, zona = ?, monto_1_porciento = ?,
        tasa_administracion = ?, monto_administracion = ?, otic_actual = ?,
        mes_envio_propuesta = ?, jefa_cartera = ?, estado = ?, aporte_ingresado = ?,
        fecha_autoriza_propuesta = ?, contacto = ?, contacto_2 = ?, correo = ?,
        cargo = ?, celular_telefono = ?, comentarios = ?, fecha_reunion = ?
      WHERE id = ?`,
      [
        holding ?? existing.holding, estado_contacto ?? existing.estado_contacto,
        rut ?? existing.rut, razon_social ?? existing.razon_social,
        evento ?? existing.evento, indicador ?? existing.indicador,
        asistio_evento ?? existing.asistio_evento, zona ?? existing.zona,
        parseFloat(monto_1_porciento) || existing.monto_1_porciento,
        parseFloat(tasa_administracion) || existing.tasa_administracion,
        parseFloat(monto_administracion) || existing.monto_administracion,
        otic_actual ?? existing.otic_actual,
        mes_envio_propuesta ?? existing.mes_envio_propuesta,
        jefa_cartera ?? existing.jefa_cartera,
        estado ?? existing.estado,
        parseFloat(aporte_ingresado) || existing.aporte_ingresado,
        fecha_autoriza_propuesta ?? existing.fecha_autoriza_propuesta,
        contacto ?? existing.contacto, contacto_2 ?? existing.contacto_2,
        correo ?? existing.correo, cargo ?? existing.cargo,
        celular_telefono ?? existing.celular_telefono,
        comentarios ?? existing.comentarios,
        fecha_reunion || existing.fecha_reunion,
        id,
      ]
    );

    const [[updated]] = await db.query("SELECT * FROM nuevos_negocios WHERE id = ?", [id]);
    res.json(updated);
  } catch (error) {
    console.error("Error actualizando negocio:", error);
    res.status(500).json({ error: "Error al actualizar registro" });
  }
};

// =============================================
// PATCH /nuevos-negocios/:id/estado — Cambio rápido de estado
// =============================================
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_contacto, estado } = req.body;
    const usuario = req.user ? req.user.nombre || req.user.email : "Sistema";

    const [[existing]] = await db.query("SELECT * FROM nuevos_negocios WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "No encontrado" });

    if (estado_contacto && estado_contacto !== existing.estado_contacto) {
      await db.query(
        `INSERT INTO nuevos_negocios_historial (negocio_id, campo_modificado, valor_anterior, valor_nuevo, usuario)
         VALUES (?, 'estado_contacto', ?, ?, ?)`,
        [id, existing.estado_contacto, estado_contacto, usuario]
      );
      await db.query("UPDATE nuevos_negocios SET estado_contacto = ? WHERE id = ?", [estado_contacto, id]);
    }

    if (estado && estado !== existing.estado) {
      await db.query(
        `INSERT INTO nuevos_negocios_historial (negocio_id, campo_modificado, valor_anterior, valor_nuevo, usuario)
         VALUES (?, 'estado', ?, ?, ?)`,
        [id, existing.estado, estado, usuario]
      );
      await db.query("UPDATE nuevos_negocios SET estado = ? WHERE id = ?", [estado, id]);
    }

    const [[updated]] = await db.query("SELECT * FROM nuevos_negocios WHERE id = ?", [id]);
    res.json(updated);
  } catch (error) {
    console.error("Error cambiando estado:", error);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
};

// =============================================
// DELETE /nuevos-negocios/:id — Eliminar
// =============================================
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query("SELECT * FROM nuevos_negocios WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "No encontrado" });

    await db.query("DELETE FROM nuevos_negocios WHERE id = ?", [id]);
    res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando negocio:", error);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
};

// =============================================
// GET /nuevos-negocios/export/excel — Descargar Excel
// =============================================
const exportExcel = async (req, res) => {
  try {
    const { estado_contacto, estado, zona, jefa_cartera, indicador, busqueda } = req.query;

    let where = "WHERE 1=1";
    const params = [];

    if (estado_contacto) { where += " AND estado_contacto = ?"; params.push(estado_contacto); }
    if (estado) { where += " AND estado = ?"; params.push(estado); }
    if (zona) { where += " AND zona = ?"; params.push(zona); }
    if (jefa_cartera) { where += " AND jefa_cartera = ?"; params.push(jefa_cartera); }
    if (indicador) { where += " AND indicador = ?"; params.push(indicador); }
    if (busqueda) {
      where += " AND (holding LIKE ? OR razon_social LIKE ? OR contacto LIKE ? OR correo LIKE ?)";
      const b = `%${busqueda}%`;
      params.push(b, b, b, b);
    }

    const [rows] = await db.query(
      `SELECT * FROM nuevos_negocios ${where} ORDER BY estado_contacto ASC, holding ASC`,
      params
    );

    // Crear workbook con la misma estructura del Excel original
    const wb = XLSX.utils.book_new();

    const wsData = [
      [
        "N°", "HOLDING", "Estado Contacto", "RUT", "Razón Social", "EVENTO",
        "Indicador", "Evento (Si/No)", "Zona", "Monto 1% u Aporte",
        "Tasa Propuesta Administración OTIC", "Monto Administración",
        "OTIC Actual", "Mes Envío Propuesta", "Jefa de Cartera Asignada",
        "Estado", "Aporte Ingresado", "Diferencia", "Fecha Autoriza Propuesta",
        "Contacto", "Contacto 2", "Correo", "Cargo", "Celular / Teléfono",
        "Comentarios (Acciones / Reuniones)", "Fecha Reunión",
      ],
    ];

    rows.forEach((row, idx) => {
      const diferencia = parseFloat(row.aporte_ingresado || 0) - parseFloat(row.monto_1_porciento || 0);
      wsData.push([
        idx + 1,
        row.holding || "",
        row.estado_contacto || "",
        row.rut || "",
        row.razon_social || "",
        row.evento || "",
        row.indicador || "",
        row.asistio_evento || "",
        row.zona || "",
        parseFloat(row.monto_1_porciento) || 0,
        parseFloat(row.tasa_administracion) || 0,
        parseFloat(row.monto_administracion) || 0,
        row.otic_actual || "",
        row.mes_envio_propuesta || "",
        row.jefa_cartera || "",
        row.estado || "",
        parseFloat(row.aporte_ingresado) || 0,
        diferencia,
        row.fecha_autoriza_propuesta || "",
        row.contacto || "",
        row.contacto_2 || "",
        row.correo || "",
        row.cargo || "",
        row.celular_telefono || "",
        row.comentarios || "",
        row.fecha_reunion ? new Date(row.fecha_reunion).toLocaleDateString("es-CL") : "",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ancho de columnas
    ws["!cols"] = [
      { wch: 5 },  // N°
      { wch: 25 }, // HOLDING
      { wch: 18 }, // Estado Contacto
      { wch: 14 }, // RUT
      { wch: 35 }, // Razón Social
      { wch: 18 }, // EVENTO
      { wch: 30 }, // Indicador
      { wch: 12 }, // Evento
      { wch: 12 }, // Zona
      { wch: 18 }, // Monto 1%
      { wch: 15 }, // Tasa
      { wch: 18 }, // Monto Adm
      { wch: 18 }, // OTIC
      { wch: 18 }, // Mes
      { wch: 22 }, // Jefa
      { wch: 30 }, // Estado
      { wch: 18 }, // Aporte
      { wch: 18 }, // Diferencia
      { wch: 20 }, // Fecha autoriza
      { wch: 25 }, // Contacto
      { wch: 25 }, // Contacto 2
      { wch: 35 }, // Correo
      { wch: 30 }, // Cargo
      { wch: 18 }, // Celular
      { wch: 40 }, // Comentarios
      { wch: 15 }, // Fecha Reunión
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Seguimiento 2026");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Seguimiento_Nuevos_Negocios_2026.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Error exportando Excel:", error);
    res.status(500).json({ error: "Error al exportar Excel" });
  }
};

// =============================================
// GET /nuevos-negocios/opciones — Valores para dropdowns
// =============================================
const opciones = async (req, res) => {
  try {
    const [estadosContacto] = await db.query("SELECT DISTINCT estado_contacto FROM nuevos_negocios WHERE estado_contacto IS NOT NULL AND estado_contacto != '' ORDER BY estado_contacto");
    const [estados] = await db.query("SELECT DISTINCT estado FROM nuevos_negocios WHERE estado IS NOT NULL AND estado != '' ORDER BY estado");
    const [zonas] = await db.query("SELECT DISTINCT zona FROM nuevos_negocios WHERE zona IS NOT NULL AND zona != '' ORDER BY zona");
    const [jefas] = await db.query("SELECT DISTINCT jefa_cartera FROM nuevos_negocios WHERE jefa_cartera IS NOT NULL AND jefa_cartera != '' ORDER BY jefa_cartera");
    const [indicadores] = await db.query("SELECT DISTINCT indicador FROM nuevos_negocios WHERE indicador IS NOT NULL AND indicador != '' ORDER BY indicador");
    const [otics] = await db.query("SELECT DISTINCT otic_actual FROM nuevos_negocios WHERE otic_actual IS NOT NULL AND otic_actual != '' ORDER BY otic_actual");

    res.json({
      estados_contacto: estadosContacto.map(r => r.estado_contacto),
      estados: estados.map(r => r.estado),
      zonas: zonas.map(r => r.zona),
      jefas_cartera: jefas.map(r => r.jefa_cartera),
      indicadores: indicadores.map(r => r.indicador),
      otics: otics.map(r => r.otic_actual),
    });
  } catch (error) {
    console.error("Error obteniendo opciones:", error);
    res.status(500).json({ error: "Error al obtener opciones" });
  }
};

// =============================================
// POST /nuevos-negocios/import — Carga Masiva
// =============================================
const importarMasivo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Debe subir un archivo Excel" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames.find(n => n === "2026") || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return res.status(400).json({ error: "No se encontró ninguna pestaña en el archivo Excel" });
    }

    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rawRows.length === 0) {
      return res.status(400).json({ error: "El archivo Excel está vacío" });
    }

    // Buscar cabecera
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rawRows.length); i++) {
      const row = rawRows[i].map(c => String(c).trim().toUpperCase());
      if (row.includes("RUT") || row.includes("RAZÓN SOCIAL") || row.includes("RAZON SOCIAL")) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return res.status(400).json({ error: "No se encontró la fila de cabecera con RUT o Razón Social" });
    }

    const headers = rawRows[headerRowIndex].map(h => String(h).trim());
    const dataRows = rawRows.slice(headerRowIndex + 1);

    const getValByHeader = (row, headerNames) => {
      for (const name of headerNames) {
        const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase() || h.replace(/\s+/g, ' ').trim().toLowerCase() === name.toLowerCase());
        if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
          return row[idx];
        }
      }
      return null;
    };

    const parseExcelDate = (val) => {
      if (!val) return null;
      if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        const tzOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + tzOffset);
        return adjustedDate.toISOString().split('T')[0];
      }
      const cleaned = String(val).trim();
      if (!cleaned || cleaned.toLowerCase() === 'no aplica' || cleaned === '-' || cleaned === '—') return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
      const parts = cleaned.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
      return null;
    };

    const cleanRut = (val) => {
      if (!val) return null;
      return String(val).trim().toUpperCase().replace(/[^0-9K-]/gi, '');
    };

    let creados = 0;
    let actualizados = 0;
    let ignorados = 0;

    const usuario = req.user ? req.user.nombre || req.user.email : "Sistema (Carga Masiva)";

    for (const row of dataRows) {
      if (row.length === 0 || row.every(c => c === "")) continue;

      const rut = getValByHeader(row, ["rut"]);
      const razon_social = getValByHeader(row, ["razón social", "razon social"]);
      const holding = getValByHeader(row, ["holding"]);

      // Si no hay RUT ni Razón Social ni Holding, ignoramos la fila
      if (!rut && !razon_social && !holding) {
        ignorados++;
        continue;
      }

      const estado_contacto = getValByHeader(row, ["estado contacto", "estado_contacto"]) || "PROSPECTO";
      const evento = getValByHeader(row, ["evento"]);
      const indicador = getValByHeader(row, ["indicador"]);
      const asistio_evento = getValByHeader(row, ["evento2", "asistio evento", "asistio_evento"]) || "No";
      const zona = getValByHeader(row, ["zona"]);
      const monto_1_porciento = parseFloat(getValByHeader(row, ["monto 1% u aporte", "monto 1% u aporte ", "monto_1_porciento", "monto 1%"])) || 0;
      const tasa_administracion = parseFloat(getValByHeader(row, ["tasa propuesta administración otic", "tasa propuesta administracion otic", "tasa_administracion", "tasa"])) || 0;
      const monto_administracion = parseFloat(getValByHeader(row, ["monto administración", "monto administracion", "monto_administracion"])) || 0;
      const otic_actual = getValByHeader(row, ["otic actual", "otic_actual"]);
      const mes_envio_propuesta = getValByHeader(row, ["mes envío propuesta", "mes envio propuesta", "mes_envio_propuesta"]);
      const jefa_cartera = getValByHeader(row, ["jefa de cartera asignada", "jefa de cartera asignada ", "jefa_cartera", "jefa cartera"]);
      const estado = getValByHeader(row, ["estado", "estado "]) || "Prospecto";
      const aporte_ingresado = parseFloat(getValByHeader(row, ["aporte ingresado", "aporte_ingresado"])) || 0;
      const fecha_autoriza_propuesta = getValByHeader(row, ["fecha autoriza propuesta", "fecha_autoriza_propuesta"]);
      const contacto = getValByHeader(row, ["contacto", "contacto "]);
      const contacto_2 = getValByHeader(row, ["contacto 2"]);
      const correo = getValByHeader(row, ["correo"]);
      const cargo = getValByHeader(row, ["cargo", "cargo "]);
      const celular_telefono = getValByHeader(row, ["celular / telefono", "celular / teléfono", "celular", "telefono", "celular_telefono"]);
      const comentarios = getValByHeader(row, ["comentarios (acciones / reuniones)", "comentarios"]);
      const fecha_reunion = parseExcelDate(getValByHeader(row, ["fecha reunión", "fecha reunion", "fecha_reunion"]));

      const rutLimpio = cleanRut(rut);
      let existingId = null;

      // Buscar por RUT si existe
      if (rutLimpio) {
        const [[foundRut]] = await db.query(
          "SELECT id FROM nuevos_negocios WHERE REPLACE(REPLACE(rut, '.', ''), '-', '') = REPLACE(REPLACE(?, '.', ''), '-', '') LIMIT 1",
          [rutLimpio]
        );
        if (foundRut) existingId = foundRut.id;
      }

      // Si no se encontró por RUT, buscar por Razón Social
      if (!existingId && razon_social) {
        const [[foundName]] = await db.query(
          "SELECT id FROM nuevos_negocios WHERE razon_social = ? LIMIT 1",
          [String(razon_social).trim()]
        );
        if (foundName) existingId = foundName.id;
      }

      if (existingId) {
        // Actualizar registro existente
        await db.query(
          `UPDATE nuevos_negocios SET
            holding = ?, estado_contacto = ?, rut = ?, razon_social = ?, evento = ?, indicador = ?,
            asistio_evento = ?, zona = ?, monto_1_porciento = ?, tasa_administracion = ?,
            monto_administracion = ?, otic_actual = ?, mes_envio_propuesta = ?, jefa_cartera = ?,
            estado = ?, aporte_ingresado = ?, fecha_autoriza_propuesta = ?, contacto = ?,
            contacto_2 = ?, correo = ?, cargo = ?, celular_telefono = ?, comentarios = ?, fecha_reunion = ?
           WHERE id = ?`,
          [
            holding || null, estado_contacto, rutLimpio || null, razon_social || null, evento || null, indicador || null,
            asistio_evento, zona || null, monto_1_porciento, tasa_administracion,
            monto_administracion, otic_actual || null, mes_envio_propuesta || null, jefa_cartera || null,
            estado, aporte_ingresado, fecha_autoriza_propuesta || null, contacto || null,
            contacto_2 || null, correo || null, cargo || null, celular_telefono || null, comentarios || null, fecha_reunion,
            existingId
          ]
        );

        await db.query(
          `INSERT INTO nuevos_negocios_historial (negocio_id, campo_modificado, valor_anterior, valor_nuevo, usuario)
           VALUES (?, 'carga_masiva', 'Existente', 'Registro actualizado mediante importación masiva', ?)`,
          [existingId, usuario]
        );

        actualizados++;
      } else {
        // Crear registro nuevo
        const [result] = await db.query(
          `INSERT INTO nuevos_negocios (
            holding, estado_contacto, rut, razon_social, evento, indicador,
            asistio_evento, zona, monto_1_porciento, tasa_administracion,
            monto_administracion, otic_actual, mes_envio_propuesta, jefa_cartera,
            estado, aporte_ingresado, fecha_autoriza_propuesta, contacto,
            contacto_2, correo, cargo, celular_telefono, comentarios, fecha_reunion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            holding || null, estado_contacto, rutLimpio || null, razon_social || null, evento || null, indicador || null,
            asistio_evento, zona || null, monto_1_porciento, tasa_administracion,
            monto_administracion, otic_actual || null, mes_envio_propuesta || null, jefa_cartera || null,
            estado, aporte_ingresado, fecha_autoriza_propuesta || null, contacto || null,
            contacto_2 || null, correo || null, cargo || null, celular_telefono || null, comentarios || null, fecha_reunion
          ]
        );

        await db.query(
          `INSERT INTO nuevos_negocios_historial (negocio_id, campo_modificado, valor_anterior, valor_nuevo, usuario)
           VALUES (?, 'carga_masiva', NULL, 'Registro creado mediante importación masiva', ?)`,
          [result.insertId, usuario]
        );

        creados++;
      }
    }

    res.json({ success: true, creados, actualizados, ignorados });
  } catch (error) {
    console.error("Error en importación masiva:", error);
    res.status(500).json({ error: "Error interno al procesar el archivo Excel" });
  }
};

module.exports = {
  listar,
  stats,
  historial,
  detalle,
  crear,
  actualizar,
  cambiarEstado,
  eliminar,
  exportExcel,
  opciones,
  importarMasivo,
};
