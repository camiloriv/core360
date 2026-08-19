const queryRepo = require("../../database/repositories/reuniones.query.repository");
const minutasRepo = require("../../database/repositories/minutas.repository");
const ccRepo = require("../../database/repositories/reuniones.cc.repository");
const { enviarCorreo } = require("../../services/email/email.service");
const { registrarAudit } = require("../../services/audit/audit.service");

// ============================================================
// GET /reuniones — Listar reuniones (teams_eventos + minutas)
// ============================================================
exports.listarReuniones = async (req, res) => {
    const { usuario_id, rol } = req.query;

    try {
        // --- HOTFIX ESTADO PASADA ---
        const now = new Date();
        const chileDateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
        const y = chileDateParts.find(p => p.type === 'year').value;
        const m = chileDateParts.find(p => p.type === 'month').value;
        const d = chileDateParts.find(p => p.type === 'day').value;
        const currentDateChile = `${y}-${m}-${d}`;
        const currentTimeChile = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);

        await queryRepo.updateEstadosPasadas(currentDateChile, currentTimeChile);
        // --- FIN HOTFIX ---

        const result = await queryRepo.getReunionesListado(usuario_id, rol);
        res.json(result);
    } catch (err) {
        console.error("Error en listarReuniones:", err);
        return res.status(500).json({ error: "Error en la BD" });
    }
};

// ============================================================
// GET /reuniones/resumen — KPIs del dashboard
// ============================================================
exports.obtenerStats = async (req, res) => {
    const { usuario_id, rol } = req.query;

    try {
        const stats = await queryRepo.getStats(usuario_id, rol);
        res.json(stats);
    } catch (err) {
        console.error("Error en obtenerStats:", err);
        res.status(500).json({ error: "Error obteniendo estadísticas" });
    }
};

// ============================================================
// POST /reuniones — Crear / enviar minuta
// ============================================================
exports.crearReunion = async (req, res) => {
    const {
        ejecutiva_id, enviado_a, enviado_por, participantes,
        tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos,
        motivo_reu, minuta, form_f, empresa_id: raw_empresa_id,
        programar_encuesta, encuesta_tipo, encuesta_programada_para, encuesta_destinatario,
        teams_evento_id,
        asunto_correo,
        texto_previo,
        link_video,
        es_borrador,
        es_retroactiva
    } = req.body;

    const archivos = req.files || [];
    const archivosNombres = JSON.stringify(archivos.map(f => f.filename));

    // Validar tamaño total
    const totalSize = archivos.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
        return res.status(400).json({ error: "El tamaño total de los archivos adjuntos supera el límite de 20MB." });
    }

    const empresa_id = (raw_empresa_id && raw_empresa_id !== "null" && raw_empresa_id !== "") ? parseInt(raw_empresa_id, 10) : null;

    if (!ejecutiva_id || !fecha_reu || !hora) {
        return res.status(400).json({ error: "Campos obligatorios faltantes" });
    }

    try {
        const isRetroactiva = es_retroactiva === 'true' || es_retroactiva === true;
        const isSurveyProgrammed = !isRetroactiva && (programar_encuesta === "true" || programar_encuesta === true);

        // Resolver teams_evento_id
        let teId = teams_evento_id ? parseInt(teams_evento_id) : null;
        if (!teId && req.body.event_id) {
            const teRow = await minutasRepo.findTeamsEventoByEventId(req.body.event_id);
            if (teRow) teId = teRow.id;
        }

        const isDraft = !isRetroactiva && (es_borrador === 'true' || es_borrador === true);
        const estado_final_minuta = isRetroactiva ? 'enviado' : (isDraft ? 'borrador' : 'enviado');

        const reqIdReunion = req.body.id_reunion;
        let isUpdate = false;
        let final_id_minuta = null;
        let final_archivos_nombres = archivosNombres;

        let retainedOldFiles = [];
        let hasRetainedFiles = false;
        if (req.body.archivos_nombres) {
            try {
                retainedOldFiles = JSON.parse(req.body.archivos_nombres);
                if (!Array.isArray(retainedOldFiles)) retainedOldFiles = [];
                hasRetainedFiles = true;
            } catch (e) {}
        }

        // Buscar minuta existente por id_minuta
        if (reqIdReunion && reqIdReunion.startsWith('REU-')) {
            const existing = await minutasRepo.findMinutaByIdMinuta(reqIdReunion);
            if (existing) {
                isUpdate = true;
                final_id_minuta = existing.id_minuta;
                try {
                    const dbOldFiles = existing.archivos_nombres ? JSON.parse(existing.archivos_nombres) : [];
                    const oldFilesToKeep = hasRetainedFiles ? retainedOldFiles : dbOldFiles;
                    const newFiles = archivos.map(f => f.filename);
                    final_archivos_nombres = JSON.stringify([...oldFilesToKeep, ...newFiles]);
                } catch (e) {
                    console.error("Error parseando archivos antiguos", e);
                }
            }
        }

        // Buscar minuta existente por teams_evento_id
        if (!isUpdate && teId) {
            const existingTe = await minutasRepo.findMinutaByTeamsEventoId(teId);
            if (existingTe) {
                isUpdate = true;
                final_id_minuta = existingTe.id_minuta;
                try {
                    const dbOldFiles = existingTe.archivos_nombres ? JSON.parse(existingTe.archivos_nombres) : [];
                    const oldFilesToKeep = hasRetainedFiles ? retainedOldFiles : dbOldFiles;
                    const newFiles = archivos.map(f => f.filename);
                    final_archivos_nombres = JSON.stringify([...oldFilesToKeep, ...newFiles]);
                } catch (e) {
                    console.error("Error parseando archivos antiguos", e);
                }
            }
        }

        if (!final_id_minuta) {
            final_id_minuta = teId ? `REU-${teId}` : await minutasRepo.generarIdMinuta();
        }

        // Datos comunes para INSERT/UPDATE
        const minutaData = {
            teams_evento_id: teId,
            ejecutiva_id,
            empresa_id,
            tipo_reu,
            enviado_a,
            enviado_por,
            participantes,
            motivo_reu,
            minuta,
            form_f,
            fecha_reu,
            hora,
            lugar: lugar || 'Teams',
            documentos_adjuntos,
            estado_envio: estado_final_minuta,
            archivos_nombres: final_archivos_nombres,
            programar_encuesta: isSurveyProgrammed ? 1 : 0,
            encuesta_tipo: isSurveyProgrammed ? encuesta_tipo : null,
            encuesta_programada_para: isSurveyProgrammed ? encuesta_programada_para : null,
            encuesta_estado_envio: isDraft || req.body.solo_guardar ? 'borrador_pendiente' : (isSurveyProgrammed ? 'pendiente' : 'enviado'),
            encuesta_relacionada: req.body.encuesta_relacionada === true || req.body.encuesta_relacionada === 'true' ? 1 : 0,
            encuesta_destinatario: isSurveyProgrammed ? encuesta_destinatario : null,
            texto_previo: texto_previo || null,
            link_video: link_video || null,
            es_retroactiva: isRetroactiva ? 1 : 0
        };

        if (isUpdate) {
            await minutasRepo.updateMinuta(final_id_minuta, minutaData);
        } else {
            await minutasRepo.insertMinuta({ id_minuta: final_id_minuta, ...minutaData });
        }

        // Si viene de un evento Teams, marcar como 'pasada'
        if (teId) {
            await minutasRepo.updateTeamsEventoEstado(teId, 'pasada');
        }

        // Registrar seguimiento de empresa
        if (empresa_id) {
            await minutasRepo.updateEmpresaSeguimiento(empresa_id, fecha_reu);
            await minutasRepo.insertSeguimientoLog(empresa_id, fecha_reu, ejecutiva_id, final_id_minuta, motivo_reu);
        }

        // Auto-aprendizaje de dominios/contactos
        if (enviado_a && empresa_id) {
            try {
                let correos = [];
                if (typeof enviado_a === 'string') {
                    correos = enviado_a.startsWith('[') ? JSON.parse(enviado_a) : enviado_a.split(',').map(e => e.trim());
                } else if (Array.isArray(enviado_a)) {
                    correos = enviado_a;
                }

                const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];

                for (const correo of correos) {
                    if (correo && correo.includes('@')) {
                        const domSinArroba = correo.split('@')[1].toLowerCase();
                        if (!dominiosGenericos.includes(domSinArroba)) {
                            await minutasRepo.autoAprenderContacto(empresa_id, correo);
                        }
                    }
                }
            } catch (errDom) {
                console.error("Error aprendiendo dominios:", errDom);
            }
        }

        // Preparar envío de correo
        const data = await ccRepo.getMinutaConContexto(final_id_minuta);

        if (data) {
            const attachments = archivos.map(file => {
                let decodedName = file.originalname;
                try {
                    decodedName = Buffer.from(file.originalname, "latin1").toString("utf8");
                } catch (e) {
                    console.error("Error decodificando nombre de adjunto:", e);
                }
                return { filename: decodedName, path: file.path };
            });

            // Adjuntar archivos previos que se mantuvieron
            if (hasRetainedFiles) {
                const fs = require('fs');
                const path = require('path');
                const uploadsDir = path.join(__dirname, '../../uploads');
                let allFiles = [];
                if (fs.existsSync(uploadsDir)) {
                    allFiles = fs.readdirSync(uploadsDir);
                }

                retainedOldFiles.forEach(oldFile => {
                    let filePath = path.join(uploadsDir, oldFile);
                    let found = fs.existsSync(filePath);
                    let actualFileName = oldFile;

                    if (!found) {
                        const match = allFiles.find(f => f.endsWith("-" + oldFile) || f === oldFile);
                        if (match) {
                            filePath = path.join(uploadsDir, match);
                            found = true;
                            actualFileName = match;
                        }
                    }

                    if (found) {
                        const parts = actualFileName.split("-");
                        const originalName = parts.slice(2).join("-") || actualFileName;
                        attachments.push({
                            filename: originalName,
                            path: filePath
                        });
                    }
                });
            }

            // Resolver nombre real del usuario logueado para firma
            let enviadoPorReal = data.enviado_por;
            const enviadoPorIdBody = req.body.enviado_por_id || req.usuario?.id;
            if (enviadoPorIdBody) {
                try {
                    const nombre = await ccRepo.getUsuarioNombre(enviadoPorIdBody);
                    if (nombre) enviadoPorReal = nombre;
                } catch (e) {
                    console.error("Error resolviendo nombre de usuario para firma:", e.message);
                }
            }

            try {
                const enviado_por_correo = req.body.enviado_por_correo;
                const enviado_por_id = req.body.enviado_por_id;

                const correosCc = req.body.correos_cc !== undefined
                    ? req.body.correos_cc
                    : (empresa_id
                        ? await ccRepo.calcularDefaultCc(data.empresa_id, data.ejecutiva_id, enviado_por_correo, enviado_por_id)
                        : (data.ejecutiva_correo || ''));

                const asuntoCorreo = asunto_correo
                    ? asunto_correo
                    : (data.empresa_nombre
                        ? `Minuta de reunión ${data.tipo_reu} - ${data.empresa_nombre} - ${data.id_minuta}`
                        : `${data.motivo_reu || 'Minuta de Reunión'} - ${data.id_minuta}`);

                const correoToFinal = isDraft ? (req.usuario?.correo || data.ejecutiva_correo || '') : data.enviado_a;
                const correosCcFinal = isDraft ? '' : correosCc;
                const asuntoCorreoFinal = isDraft ? `[BORRADOR] ${asuntoCorreo}` : asuntoCorreo;

                const isSoloGuardar = req.body.solo_guardar === 'true' || req.body.solo_guardar === true;

                if (!isSoloGuardar && !isRetroactiva) {
                    enviarCorreo({
                        to: correoToFinal,
                        cc: correosCcFinal,
                        userEmail: req.usuario?.correo,
                        subject: asuntoCorreoFinal,
                        data: {
                            id_reunion: data.id_minuta,
                            participantes: data.participantes,
                            empresa: data.empresa_nombre || '',
                            ejecutiva: data.ejecutiva_nombre,
                            fecha_reu: data.fecha_reu,
                            hora: data.hora,
                            lugar: data.lugar,
                            motivo_reu: data.motivo_reu,
                            minuta: data.minuta,
                            enviado_por: enviadoPorReal,
                            documentos_adjuntos: data.documentos_adjuntos,
                            texto_previo: data.texto_previo,
                            link_video: data.link_video
                        },
                        attachments
                    }).catch(error => {
                        console.error("Error enviando correo:", error);
                    });
                }

                // Registrar en audit log
                registrarAudit({
                    accion: isRetroactiva ? 'minuta_retroactiva' : (isSoloGuardar ? 'minuta_guardada' : (isDraft ? 'minuta_borrador' : (isUpdate ? 'minuta_actualizada' : 'minuta_enviada'))),
                    entidad: 'minuta',
                    entidad_id: final_id_minuta,
                    usuario_id: req.usuario?.id || parseInt(enviado_por_id),
                    usuario_nombre: enviadoPorReal || req.usuario?.nombre,
                    ejecutiva_id: parseInt(ejecutiva_id),
                    ejecutiva_nombre: data.ejecutiva_nombre,
                    empresa_id: empresa_id ? parseInt(empresa_id) : null,
                    empresa_nombre: data.empresa_nombre || null,
                    detalles: {
                        enviado_por_formulario: data.enviado_por,
                        enviado_por_resuelto: enviadoPorReal,
                        firma_usada: enviadoPorReal || data.ejecutiva_nombre,
                        destinatarios: correoToFinal,
                        cc: correosCcFinal,
                        tipo_reu: data.tipo_reu,
                        estado: estado_final_minuta,
                        solo_guardar: isSoloGuardar
                    },
                    ip_address: req.ip || req.connection?.remoteAddress
                });
            } catch (error) {
                console.error("Error al preparar envío de correo:", error);
            }
        }

        const isSoloGuardar = req.body.solo_guardar === 'true' || req.body.solo_guardar === true;

        res.status(200).json({
            message: isUpdate ? "Minuta actualizada exitosamente" : "Reunión creada exitosamente",
            id_reunion: final_id_minuta,
            archivos_nombres: final_archivos_nombres
        });

    } catch (error) {
        console.error("Error al crear minuta:", error);
        return res.status(500).json({ error: "Error interno al crear la minuta" });
    }
};

// ============================================================
// GET /reuniones/destinatarios
// ============================================================
exports.obtenerDestinatarios = async (req, res) => {
    const { empresa_id } = req.query;
    if (!empresa_id) return res.status(400).json({ error: "empresa_id es requerido" });

    try {
        const correos = await queryRepo.getDestinatarios(empresa_id);
        res.json(correos);
    } catch (err) {
        console.error("Error en obtenerDestinatarios:", err);
        res.status(500).json({ error: "Error en la BD" });
    }
};

// ============================================================
// GET /reuniones/tipos
// ============================================================
exports.obtenerTiposReunion = async (req, res) => {
    try {
        const tipos = await queryRepo.getTiposReunion();
        res.json(tipos);
    } catch (err) {
        console.error("Error en obtenerTiposReunion:", err);
        res.status(500).json({ error: "Error en la BD" });
    }
};

// ============================================================
// GET /reuniones/default-cc
// ============================================================
exports.obtenerDefaultCc = async (req, res) => {
    const { empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id } = req.query;

    try {
        const cc = await ccRepo.calcularDefaultCc(empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id);
        res.json({ cc });
    } catch (err) {
        console.error("Error en obtenerDefaultCc:", err);
        res.status(500).json({ error: "Error obteniendo CC" });
    }
};

// ============================================================
// GET /reuniones/test-smtp
// ============================================================
exports.testSmtp = async (req, res) => {
    const targetEmail = req.query.email || "camilorivera.bravo@gmail.com";
    const transporter = require("../../config/mailer");
    const diagnostic = {
        config: {
            tenantId: process.env.AZURE_TENANT_ID ? "Configured" : "Missing",
            clientId: process.env.AZURE_CLIENT_ID ? "Configured" : "Missing",
            user: process.env.SMTP_USER,
            redirect_to: process.env.REDIRECT_EMAILS_TO || "None"
        },
        verify: null, send: null, error: null
    };

    try {
        await transporter.verify();
        diagnostic.verify = "SUCCESS";
    } catch (err) {
        diagnostic.verify = "FAILED";
        diagnostic.error = `Verify error: ${err.message || err}`;
        return res.json(diagnostic);
    }

    try {
        const sent = await enviarCorreo({
            to: targetEmail,
            userEmail: req.usuario?.correo,
            subject: "Test de Diagnóstico SMTP - Core360",
            data: {
                id_reunion: "TEST-1234",
                participantes: "Usuario de Prueba",
                empresa: "Empresa Demo",
                ejecutiva: "Ejecutiva de Prueba",
                fecha_reu: new Date().toISOString().split('T')[0],
                hora: "12:00",
                lugar: "Microsoft Teams",
                motivo_reu: "Prueba de Diagnóstico",
                minuta: "<h3>Minuta de prueba</h3><p>Esto es un test del sistema de correos.</p>",
                enviado_por: "Sistema de Diagnóstico",
                documentos_adjuntos: "Ninguno"
            },
            attachments: []
        });
        diagnostic.send = sent ? "SUCCESS" : "FAILED (enviarCorreo returned false)";
    } catch (err) {
        diagnostic.send = "FAILED";
        diagnostic.error = `Send error: ${err.message || err}`;
    }

    res.json(diagnostic);
};

// ============================================================
// PUT /reuniones/:id/no-aplica — Marcar evento/minuta como no aplica
// ============================================================
exports.marcarNoAplica = async (req, res) => {
    const { id } = req.params;
    const { noAplica } = req.body;

    try {
        // Intentar como id_minuta primero
        const minutaRow = await minutasRepo.getMinutaConTeamsEvento(id);

        if (minutaRow) {
            const nuevoEstado = noAplica ? 'no_aplica' : 'borrador';
            await minutasRepo.updateMinutaEstadoEnvio(id, nuevoEstado);

            if (noAplica && minutaRow.teams_evento_id) {
                const teRow = await minutasRepo.getTeamsEventoById(minutaRow.teams_evento_id);
                if (teRow && teRow.empresa_id) {
                    await minutasRepo.insertSeguimientoNoAplica(
                        teRow.empresa_id, teRow.fecha, req.usuario.id, teRow.event_id, teRow.asunto || 'Reunión No Aplica'
                    );
                }
            }

            registrarAudit({
                accion: noAplica ? 'minuta_no_aplica' : 'minuta_revertida',
                entidad: 'minuta',
                entidad_id: id,
                usuario_id: req.usuario?.id,
                usuario_nombre: req.usuario?.nombre,
                detalles: { noAplica, teams_evento_id: minutaRow.teams_evento_id },
                ip_address: req.ip || req.connection?.remoteAddress
            });

            return res.json({ success: true, message: "Estado de minuta actualizado" });
        }

        // Intentar como teams_evento_id (número)
        const teId = parseInt(id);
        if (!isNaN(teId)) {
            if (noAplica) {
                const teRow = await minutasRepo.getTeamsEventoById(teId);
                if (teRow) {
                    const idMinuta = `REU-${teId}`;
                    await minutasRepo.insertMinutaNoAplica(
                        idMinuta, teId, req.usuario.id,
                        teRow.usuario_id || req.usuario.id,
                        teRow.fecha, teRow.hora, teRow.empresa_id
                    );

                    if (teRow.empresa_id) {
                        await minutasRepo.insertSeguimientoNoAplica(
                            teRow.empresa_id, teRow.fecha, req.usuario.id, teRow.event_id, teRow.asunto || 'Reunión No Aplica'
                        );
                    }

                    registrarAudit({
                        accion: 'reunion_no_aplica',
                        entidad: 'reunion',
                        entidad_id: String(teId),
                        usuario_id: req.usuario?.id,
                        usuario_nombre: req.usuario?.nombre,
                        empresa_id: teRow.empresa_id,
                        detalles: { asunto: teRow.asunto, event_id: teRow.event_id },
                        ip_address: req.ip || req.connection?.remoteAddress
                    });
                }
            } else {
                await minutasRepo.updateTeamsEventoEstado(teId, 'pasada');
            }

            return res.json({ success: true, message: "Estado de reunión actualizado (se conservó en los KPIs)" });
        }

        return res.status(404).json({ error: "Registro no encontrado" });
    } catch (err) {
        console.error("Error en marcarNoAplica:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// ============================================================
// GET /reuniones/detail/:id_reunion — Obtener una reunión por id_reunion
// ============================================================
exports.obtenerReunionPorId = async (req, res) => {
    const { id_reunion } = req.params;

    try {
        const result = await queryRepo.getReunionById(id_reunion);
        if (!result) {
            return res.status(404).json({ error: "Reunión no encontrada" });
        }
        res.json(result);
    } catch (err) {
        console.error("Error en obtenerReunionPorId:", err);
        return res.status(500).json({ error: "Error en la BD" });
    }
};

// ============================================================
// POST /reuniones/resolver-participantes
// ============================================================
exports.resolverParticipantes = async (req, res) => {
    const { empresa_id, asistentes } = req.body;

    if (!empresa_id || !Array.isArray(asistentes)) {
        return res.status(400).json({ error: "Datos incompletos" });
    }

    try {
        const nombresParticipantes = [];

        for (const participante of asistentes) {
            const email = (participante.email || participante.correo || "").trim();
            let nombreTeams = (participante.name || participante.nombre || "").trim();

            if (!email) continue;

            const nombre = await minutasRepo.resolverParticipante(empresa_id, email, nombreTeams);
            nombresParticipantes.push(nombre);
        }

        res.json({ participantesStr: nombresParticipantes.join(", ") });
    } catch (err) {
        console.error("Error en resolverParticipantes:", err);
        res.status(500).json({ error: "Error en la BD al resolver participantes" });
    }
};

// ============================================================
// PUT /reuniones/:id/comentario — Guardar un comentario rápido
// ============================================================
exports.guardarComentario = async (req, res) => {
    const { id } = req.params;
    const { comentario } = req.body;

    try {
        // Intentar como id_minuta primero
        const minutaRow = await minutasRepo.getMinutaConTeamsEvento(id);

        if (minutaRow) {
            await minutasRepo.updateComentarioMinuta(id, comentario);
            
            registrarAudit({
                accion: 'minuta_comentario',
                entidad: 'minuta',
                entidad_id: id,
                usuario_id: req.usuario?.id,
                usuario_nombre: req.usuario?.nombre,
                detalles: { comentario, teams_evento_id: minutaRow.teams_evento_id },
                ip_address: req.ip || req.connection?.remoteAddress
            });

            return res.json({ success: true, message: "Comentario guardado" });
        }

        // Si no existe, es un teams_evento_id
        const teId = parseInt(id);
        if (!isNaN(teId)) {
            const teRow = await minutasRepo.getTeamsEventoById(teId);
            if (teRow) {
                const idMinuta = `REU-${teId}`;
                await minutasRepo.insertComentarioMinuta(
                    idMinuta, teId, comentario, req.usuario.id,
                    teRow.usuario_id || req.usuario.id,
                    teRow.fecha, teRow.hora, teRow.empresa_id
                );

                registrarAudit({
                    accion: 'reunion_comentario',
                    entidad: 'reunion',
                    entidad_id: String(teId),
                    usuario_id: req.usuario?.id,
                    usuario_nombre: req.usuario?.nombre,
                    empresa_id: teRow.empresa_id,
                    detalles: { comentario, asunto: teRow.asunto, event_id: teRow.event_id },
                    ip_address: req.ip || req.connection?.remoteAddress
                });
                
                return res.json({ success: true, message: "Comentario guardado" });
            }
        }
        
        return res.status(404).json({ error: "Reunión no encontrada" });
    } catch (error) {
        console.error("Error en guardarComentario:", error);
        res.status(500).json({ error: "Error al guardar comentario" });
    }
};
