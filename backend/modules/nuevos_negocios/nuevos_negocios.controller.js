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
};
