const nuevosNegociosRepository = require("../../database/repositories/nuevos_negocios.repository");
const XLSX = require("xlsx");

const updateEmpresaJefatura = async (jefa_cartera, rut, razon_social) => {
  await nuevosNegociosRepository.updateEmpresaJefatura(jefa_cartera, rut, razon_social);
};

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

    const filtros = { estado_contacto, estado, zona, jefa_cartera, indicador, otic_actual, busqueda };
    const { rows, total } = await nuevosNegociosRepository.listar(filtros, page, limit);

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error listando nuevos negocios:", error);
    res.status(500).json({ error: "Error al listar nuevos negocios" });
  }
};

const stats = async (req, res) => {
  try {
    const { estadoContacto, estadoDetalle, totales } = await nuevosNegociosRepository.getStats();
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

const historial = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await nuevosNegociosRepository.getHistorial(id);
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo historial:", error);
    res.status(500).json({ error: "Error al obtener historial" });
  }
};

const detalle = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await nuevosNegociosRepository.getDetalle(id);
    if (!row) return res.status(404).json({ error: "No encontrado" });
    res.json(row);
  } catch (error) {
    console.error("Error obteniendo detalle:", error);
    res.status(500).json({ error: "Error al obtener detalle" });
  }
};

const crear = async (req, res) => {
  try {
    const {
      holding, estado_contacto, rut, razon_social, evento, indicador,
      asistio_evento, zona, monto_1_porciento, tasa_administracion,
      monto_administracion, otic_actual, mes_envio_propuesta, jefa_cartera,
      estado, aporte_ingresado, fecha_autoriza_propuesta, contacto,
      contacto_2, correo, cargo, celular_telefono, comentarios, fecha_reunion,
    } = req.body;

    const data = {
      holding: holding || null, 
      estado_contacto: estado_contacto || 'PROSPECTO', 
      rut: rut || null,
      razon_social: razon_social || null, 
      evento: evento || null, 
      indicador: indicador || null,
      asistio_evento: asistio_evento || 'No', 
      zona: zona || null,
      monto_1_porciento: parseFloat(monto_1_porciento) || 0, 
      tasa_administracion: parseFloat(tasa_administracion) || 0,
      monto_administracion: parseFloat(monto_administracion) || 0, 
      otic_actual: otic_actual || null,
      mes_envio_propuesta: mes_envio_propuesta || null, 
      jefa_cartera: jefa_cartera || null,
      estado: estado || 'Prospecto', 
      aporte_ingresado: parseFloat(aporte_ingresado) || 0,
      fecha_autoriza_propuesta: fecha_autoriza_propuesta || null, 
      contacto: contacto || null,
      contacto_2: contacto_2 || null, 
      correo: correo || null, 
      cargo: cargo || null,
      celular_telefono: celular_telefono || null, 
      comentarios: comentarios || null, 
      fecha_reunion: fecha_reunion || null,
    };

    const usuario = req.user ? req.user.nombre || req.user.email : "Sistema";
    const logMessage = `Registro creado: ${holding || razon_social || 'Sin nombre'}`;

    const newRow = await nuevosNegociosRepository.insertNegocio(data, logMessage, usuario);

    await updateEmpresaJefatura(newRow.jefa_cartera, newRow.rut, newRow.razon_social);

    res.status(201).json(newRow);
  } catch (error) {
    console.error("Error creando negocio:", error);
    res.status(500).json({ error: "Error al crear registro" });
  }
};

const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await nuevosNegociosRepository.getDetalle(id);
    if (!existing) return res.status(404).json({ error: "No encontrado" });

    const {
      holding, estado_contacto, rut, razon_social, evento, indicador,
      asistio_evento, zona, monto_1_porciento, tasa_administracion,
      monto_administracion, otic_actual, mes_envio_propuesta, jefa_cartera,
      estado, aporte_ingresado, fecha_autoriza_propuesta, contacto,
      contacto_2, correo, cargo, celular_telefono, comentarios, fecha_reunion,
    } = req.body;

    const usuario = req.user ? req.user.nombre || req.user.email : "Sistema";

    const camposTrackeados = [
      { campo: 'estado_contacto', nuevo: estado_contacto, anterior: existing.estado_contacto },
      { campo: 'estado', nuevo: estado, anterior: existing.estado },
      { campo: 'jefa_cartera', nuevo: jefa_cartera, anterior: existing.jefa_cartera },
    ];

    for (const c of camposTrackeados) {
      if (c.nuevo !== undefined && c.nuevo !== c.anterior) {
        await nuevosNegociosRepository.insertHistorial(id, c.campo, c.anterior, c.nuevo, usuario);
      }
    }

    const updateData = {
      holding: holding ?? existing.holding, 
      estado_contacto: estado_contacto ?? existing.estado_contacto,
      rut: rut ?? existing.rut, 
      razon_social: razon_social ?? existing.razon_social,
      evento: evento ?? existing.evento, 
      indicador: indicador ?? existing.indicador,
      asistio_evento: asistio_evento ?? existing.asistio_evento, 
      zona: zona ?? existing.zona,
      monto_1_porciento: parseFloat(monto_1_porciento) || existing.monto_1_porciento,
      tasa_administracion: parseFloat(tasa_administracion) || existing.tasa_administracion,
      monto_administracion: parseFloat(monto_administracion) || existing.monto_administracion,
      otic_actual: otic_actual ?? existing.otic_actual,
      mes_envio_propuesta: mes_envio_propuesta ?? existing.mes_envio_propuesta,
      jefa_cartera: jefa_cartera ?? existing.jefa_cartera,
      estado: estado ?? existing.estado,
      aporte_ingresado: parseFloat(aporte_ingresado) || existing.aporte_ingresado,
      fecha_autoriza_propuesta: fecha_autoriza_propuesta ?? existing.fecha_autoriza_propuesta,
      contacto: contacto ?? existing.contacto, 
      contacto_2: contacto_2 ?? existing.contacto_2,
      correo: correo ?? existing.correo, 
      cargo: cargo ?? existing.cargo,
      celular_telefono: celular_telefono ?? existing.celular_telefono,
      comentarios: comentarios ?? existing.comentarios,
      fecha_reunion: fecha_reunion || existing.fecha_reunion,
    };

    await nuevosNegociosRepository.updateNegocio(id, updateData);

    const updated = await nuevosNegociosRepository.getDetalle(id);

    if (jefa_cartera !== undefined && jefa_cartera !== existing.jefa_cartera) {
      await updateEmpresaJefatura(updated.jefa_cartera, updated.rut, updated.razon_social);
    }

    res.json(updated);
  } catch (error) {
    console.error("Error actualizando negocio:", error);
    res.status(500).json({ error: "Error al actualizar registro" });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_contacto, estado } = req.body;
    const usuario = req.user ? req.user.nombre || req.user.email : "Sistema";

    const existing = await nuevosNegociosRepository.getDetalle(id);
    if (!existing) return res.status(404).json({ error: "No encontrado" });

    if (estado_contacto && estado_contacto !== existing.estado_contacto) {
      await nuevosNegociosRepository.insertHistorial(id, 'estado_contacto', existing.estado_contacto, estado_contacto, usuario);
      await nuevosNegociosRepository.updateNegocio(id, { estado_contacto });
    }

    if (estado && estado !== existing.estado) {
      await nuevosNegociosRepository.insertHistorial(id, 'estado', existing.estado, estado, usuario);
      await nuevosNegociosRepository.updateNegocio(id, { estado });
    }

    const updated = await nuevosNegociosRepository.getDetalle(id);
    res.json(updated);
  } catch (error) {
    console.error("Error cambiando estado:", error);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
};

const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await nuevosNegociosRepository.getDetalle(id);
    if (!existing) return res.status(404).json({ error: "No encontrado" });

    await nuevosNegociosRepository.deleteNegocio(id);
    res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando negocio:", error);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
};

const exportExcel = async (req, res) => {
  try {
    const { estado_contacto, estado, zona, jefa_cartera, indicador, busqueda } = req.query;

    const rows = await nuevosNegociosRepository.getAllForExport({
      estado_contacto, estado, zona, jefa_cartera, indicador, busqueda
    });

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

    ws["!cols"] = [
      { wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 35 }, { wch: 18 },
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 18 },
      { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 35 }, { wch: 30 }, { wch: 18 },
      { wch: 40 }, { wch: 15 },
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

const opciones = async (req, res) => {
  try {
    const data = await nuevosNegociosRepository.getOpciones();
    res.json(data);
  } catch (error) {
    console.error("Error obteniendo opciones:", error);
    res.status(500).json({ error: "Error al obtener opciones" });
  }
};

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

      if (rutLimpio) {
        const foundRut = await nuevosNegociosRepository.findNegocioByRut(rutLimpio);
        if (foundRut) existingId = foundRut.id;
      }

      if (!existingId && razon_social) {
        const foundName = await nuevosNegociosRepository.findNegocioByRazonSocial(String(razon_social).trim());
        if (foundName) existingId = foundName.id;
      }

      const upsertData = {
        holding: holding || null, 
        estado_contacto, 
        rut: rutLimpio || null, 
        razon_social: razon_social || null, 
        evento: evento || null, 
        indicador: indicador || null,
        asistio_evento, 
        zona: zona || null, 
        monto_1_porciento, 
        tasa_administracion,
        monto_administracion, 
        otic_actual: otic_actual || null, 
        mes_envio_propuesta: mes_envio_propuesta || null, 
        jefa_cartera: jefa_cartera || null,
        estado, 
        aporte_ingresado, 
        fecha_autoriza_propuesta: fecha_autoriza_propuesta || null, 
        contacto: contacto || null,
        contacto_2: contacto_2 || null, 
        correo: correo || null, 
        cargo: cargo || null, 
        celular_telefono: celular_telefono || null, 
        comentarios: comentarios || null, 
        fecha_reunion
      };

      if (existingId) {
        await nuevosNegociosRepository.updateNegocio(existingId, upsertData);
        await nuevosNegociosRepository.insertHistorial(existingId, 'carga_masiva', 'Existente', 'Registro actualizado mediante importación masiva', usuario);
        actualizados++;
      } else {
        const newRow = await nuevosNegociosRepository.insertNegocio(upsertData, 'Registro creado mediante importación masiva', usuario);
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
