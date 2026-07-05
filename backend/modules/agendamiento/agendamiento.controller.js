require("dotenv").config();
const db = require("../../database/connection");

// ============================================================
// GRAPH API: Token management
// ============================================================
let graphToken = null;
let tokenExpiresAt = null;

const getGraphToken = async () => {
    if (graphToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
        return graphToken;
    }

    const response = await fetch(
        `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.AZURE_CLIENT_ID,
                client_secret: process.env.AZURE_CLIENT_SECRET,
                scope: "https://graph.microsoft.com/.default",
                grant_type: "client_credentials"
            })
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error fetching token from Azure AD: ${errText}`);
    }

    const data = await response.json();
    graphToken = data.access_token;
    tokenExpiresAt = new Date(new Date().getTime() + (data.expires_in - 300) * 1000);
    return graphToken;
};

// ============================================================
// HELPERS
// ============================================================
const formatDate = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    return dateTimeStr.split('T')[0];
};

const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return '00:00';
    const timePart = dateTimeStr.split('T')[1] || '';
    return timePart.substring(0, 5);
};

const resolveDisplayName = async (email, dbName = '') => {
    if (!email) return '';
    email = email.trim().toLowerCase();

    try {
        const [userRows] = await db.query("SELECT nombre FROM usuarios WHERE LOWER(correo) = ?", [email]);
        if (userRows.length > 0 && userRows[0].nombre) return userRows[0].nombre;
    } catch (e) { /* ignore */ }

    try {
        const [contactRows] = await db.query(
            "SELECT nombre FROM empresa_contactos WHERE LOWER(correo) = ? AND nombre IS NOT NULL AND nombre != '' LIMIT 1",
            [email]
        );
        if (contactRows.length > 0 && contactRows[0].nombre) return contactRows[0].nombre;
    } catch (e) { /* ignore */ }

    if (dbName && !dbName.includes('@')) return dbName;

    const username = email.split('@')[0];
    return username.split(/[\._-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

// ============================================================
// POST /agendamiento — Crear reunión en Teams y registrar en teams_eventos
// ============================================================
const crearReunionTeams = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        if (!usuarioCorreo) {
            return res.status(400).json({ error: "El usuario no tiene correo configurado en su perfil." });
        }

        const { empresa_id, destinatarios, asistentes_internos, fecha, hora, duracion, asunto, detalle, modalidad, direccion } = req.body;

        const startDateTimeStr = `${fecha}T${hora}:00`;

        const year = parseInt(fecha.split('-')[0]);
        const month = parseInt(fecha.split('-')[1]) - 1;
        const day = parseInt(fecha.split('-')[2]);
        const hour = parseInt(hora.split(':')[0]);
        const minute = parseInt(hora.split(':')[1]);

        const endObj = new Date(year, month, day, hour, minute + parseInt(duracion || 60));
        const endDateTimeStr = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, "0")}-${String(endObj.getDate()).padStart(2, "0")}T${String(endObj.getHours()).padStart(2, "0")}:${String(endObj.getMinutes()).padStart(2, "0")}:00`;
        const horaFin = `${String(endObj.getHours()).padStart(2, "0")}:${String(endObj.getMinutes()).padStart(2, "0")}`;

        const attendees = [];
        if (destinatarios) {
            destinatarios.split(',').forEach(email => {
                if (email.trim()) attendees.push({ emailAddress: { address: email.trim() }, type: "required" });
            });
        }
        if (asistentes_internos) {
            asistentes_internos.split(',').forEach(email => {
                if (email.trim()) attendees.push({ emailAddress: { address: email.trim() }, type: "optional" });
            });
        }

        const isPresencial = modalidad === "Presencial";
        const finalSubject = isPresencial ? `${asunto} [Presencial]` : asunto;

        const eventPayload = {
            subject: finalSubject,
            body: { contentType: "HTML", content: detalle || "Reunión generada desde CORE 360" },
            start: { dateTime: startDateTimeStr, timeZone: "America/Santiago" },
            end: { dateTime: endDateTimeStr, timeZone: "America/Santiago" },
            attendees
        };

        if (isPresencial) {
            eventPayload.location = { displayName: direccion ? `Presencial: ${direccion}` : "Presencial" };
        } else {
            eventPayload.isOnlineMeeting = true;
            eventPayload.onlineMeetingProvider = "teamsForBusiness";
        }

        const accessToken = await getGraphToken();
        const endpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/events`;

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(eventPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Graph API Error: ${errorText}`);
        }

        const data = await response.json();

        // Registrar en teams_eventos (fuente de la verdad)
        const allAttendees = attendees.map(a => ({ email: a.emailAddress.address, name: a.emailAddress.name || '' }));
        const asistentesJson = JSON.stringify(allAttendees);

        const empresaIdVal = empresa_id ? parseInt(empresa_id) : null;

        await db.query(`
            INSERT INTO teams_eventos 
                (event_id, ical_uid, usuario_id, empresa_id, asunto, fecha, hora, hora_fin, estado, es_online, asistentes, join_url, ultima_sync)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'agendada', ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                empresa_id = VALUES(empresa_id),
                asunto = VALUES(asunto),
                fecha = VALUES(fecha),
                hora = VALUES(hora),
                hora_fin = VALUES(hora_fin),
                estado = 'agendada',
                es_online = VALUES(es_online),
                asistentes = VALUES(asistentes),
                join_url = VALUES(join_url),
                ultima_sync = NOW()
        `, [
            data.id, req.usuario.id, empresaIdVal, finalSubject,
            fecha, hora, horaFin,
            isPresencial ? 0 : 1,
            asistentesJson,
            data.onlineMeeting?.joinUrl || null
        ]);

        // Aprendizaje de contactos: registrar si el dominio coincide con la empresa
        if (empresa_id && destinatarios) {
            const correos = destinatarios.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
            
            // Obtener los dominios registrados para esta empresa
            const [dominiosEmpresa] = await db.query("SELECT dominio FROM empresa_dominios WHERE empresa_id = ?", [empresa_id]);
            const dominiosList = dominiosEmpresa.map(d => d.dominio.toLowerCase().trim());

            for (const email of correos) {
                if (email.includes('@')) {
                    const dom = '@' + email.split('@')[1];
                    // Si el dominio coincide con alguno de la empresa, agregar el contacto
                    if (dominiosList.includes(dom)) {
                        const [existing] = await db.query("SELECT id FROM empresa_contactos WHERE empresa_id = ? AND correo = ?", [empresa_id, email]);
                        if (existing.length === 0) {
                            await db.query("INSERT INTO empresa_contactos (empresa_id, correo, nombre) VALUES (?, ?, NULL)", [empresa_id, email]);
                        }
                    }
                }
            }
        }

        // Registrar en empresa_seguimiento_log si tiene empresa
        if (empresa_id) {
            await db.query(
                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'agendada', ?, ?, ?, ?)",
                [empresa_id, fecha, req.usuario.id, data.id, finalSubject]
            );
            await db.query(
                "UPDATE empresas SET estado_seguimiento = 'agendada', fecha_concretada = ? WHERE id = ?",
                [fecha, empresa_id]
            );
        }

        return res.status(200).json({
            success: true,
            message: isPresencial ? "Reunión agendada en tu calendario" : "Reunión agendada en Teams",
            joinUrl: data.onlineMeeting?.joinUrl || null,
            eventId: data.id
        });

    } catch (error) {
        console.error("Error en crearReunionTeams:", error);
        res.status(500).json({ error: "Error interno al comunicarse con Microsoft Graph." });
    }
};

// ============================================================
// DELETE/CANCEL — Anular reunión en Teams y marcar en teams_eventos
// ============================================================
const anularReunionTeams = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        const { eventId, empresa_id, motivo } = req.body;

        if (!usuarioCorreo || !eventId) {
            return res.status(400).json({ error: "Faltan parámetros." });
        }

        const accessToken = await getGraphToken();
        const endpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/events/${eventId}`;

        const response = await fetch(endpoint, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${accessToken}` }
        });

        if (!response.ok && response.status !== 404) {
            const errorText = await response.text();
            throw new Error(`Graph API Error: ${errorText}`);
        }

        // Marcar como cancelada en teams_eventos
        await db.query("UPDATE teams_eventos SET estado = 'cancelada' WHERE event_id = ?", [eventId]);

        // También marcar la minuta relacionada como no_aplica (si hay una borrador)
        const [teEvt] = await db.query("SELECT id FROM teams_eventos WHERE event_id = ?", [eventId]);
        if (teEvt.length > 0) {
            await db.query(
                "UPDATE minutas SET estado_envio = 'no_aplica' WHERE teams_evento_id = ? AND estado_envio = 'borrador'",
                [teEvt[0].id]
            );
        }

        // Determinar empresa_id desde teams_eventos si no vino en body
        let empId = empresa_id;
        if (!empId && teEvt.length > 0) {
            const [teData] = await db.query("SELECT empresa_id FROM teams_eventos WHERE event_id = ?", [eventId]);
            if (teData.length > 0) empId = teData[0].empresa_id;
        }

        if (empId) {
            const [prevLog] = await db.query(
                "SELECT asunto FROM empresa_seguimiento_log WHERE reunion_id = ? AND asunto IS NOT NULL LIMIT 1",
                [eventId]
            );
            const asuntoOriginal = prevLog.length > 0 ? prevLog[0].asunto : null;
            let asuntoCancelacion = asuntoOriginal ? `Cancelada: ${asuntoOriginal}` : "Reunión cancelada en Teams";
            
            if (motivo && motivo.trim().length > 0) {
                asuntoCancelacion += ` - Motivo: ${motivo.trim()}`;
            }

            const fechaVal = new Date().toISOString().split('T')[0];

            await db.query(
                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'cancelada', ?, ?, ?, ?)",
                [empId, fechaVal, req.usuario.id, eventId, asuntoCancelacion]
            );
            await db.query("UPDATE empresas SET estado_seguimiento = 'pendiente' WHERE id = ?", [empId]);
        }

        return res.status(200).json({ success: true, message: "Reunión anulada." });
    } catch (error) {
        console.error("Error en anularReunionTeams:", error);
        res.status(500).json({ error: "Error interno al anular la reunión." });
    }
};

// ============================================================
// POST /agendamiento/marcar-reagendada — Registrar intención de reagendar
// ============================================================
const marcarReagendada = async (req, res) => {
    try {
        const { eventId, motivo } = req.body;
        if (!eventId) {
            return res.status(400).json({ error: "Faltan parámetros." });
        }

        // Determinar empresa_id desde teams_eventos
        const [teData] = await db.query("SELECT empresa_id FROM teams_eventos WHERE event_id = ?", [eventId]);
        if (teData.length === 0 || !teData[0].empresa_id) {
            return res.status(400).json({ error: "No se puede registrar motivo en una reunión sin empresa vinculada." });
        }
        
        const empId = teData[0].empresa_id;

        const [prevLog] = await db.query(
            "SELECT asunto FROM empresa_seguimiento_log WHERE reunion_id = ? AND asunto IS NOT NULL LIMIT 1",
            [eventId]
        );
        const asuntoOriginal = prevLog.length > 0 ? prevLog[0].asunto : null;
        let asuntoReagendada = asuntoOriginal ? `Reagendada: ${asuntoOriginal}` : "Reunión reagendada";
        
        if (motivo && motivo.trim().length > 0) {
            asuntoReagendada += ` - Motivo: ${motivo.trim()}`;
        }

        const fechaVal = new Date().toISOString().split('T')[0];

        await db.query(
            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'reagendada', ?, ?, ?, ?)",
            [empId, fechaVal, req.usuario.id, eventId, asuntoReagendada]
        );
        
        // Mantener el estado de seguimiento pendiente
        await db.query("UPDATE empresas SET estado_seguimiento = 'pendiente' WHERE id = ?", [empId]);

        return res.status(200).json({ success: true, message: "Motivo registrado con éxito." });
    } catch (error) {
        console.error("Error en marcarReagendada:", error);
        res.status(500).json({ error: "Error interno al registrar reagendamiento." });
    }
};

// ============================================================
// GET /agendamiento/calendario — Vista de calendario
// ============================================================
const obtenerEventosCalendario = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        const { start, end } = req.query;

        if (!usuarioCorreo) return res.status(400).json({ error: "Usuario sin correo configurado." });
        if (!start || !end) return res.status(400).json({ error: "Se requieren los parámetros start y end." });

        const accessToken = await getGraphToken();
        const endpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/calendarView?startDateTime=${start}&endDateTime=${end}&$top=1000`;

        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Prefer": "outlook.timezone=\"UTC\""
            }
        });

        if (!response.ok) {
            if (response.status === 404 || response.status === 403) {
                return res.status(200).json({ events: [] });
            }
            const errorText = await response.text();
            throw new Error(`Graph API Error: ${errorText}`);
        }

        const data = await response.json();
        const events = data.value.map(item => {
            const attendees = item.attendees || [];
            const parsedAttendees = attendees.map(a => {
                const email = (a.emailAddress?.address || '').toLowerCase().trim();
                const name = a.emailAddress?.name || '';
                return email ? { name, email, response: a.status?.response || 'none', type: a.type || 'required' } : null;
            }).filter(Boolean);

            const organizerEmail = (item.organizer?.emailAddress?.address || '').toLowerCase().trim();
            const organizerName = item.organizer?.emailAddress?.name || '';
            const organizador = organizerEmail ? { name: organizerName, email: organizerEmail } : null;

            return {
                id: item.id,
                title: item.subject,
                start: item.start.dateTime + "Z",
                end: item.end.dateTime + "Z",
                isOnlineMeeting: item.isOnlineMeeting,
                joinUrl: item.onlineMeeting?.joinUrl,
                asistentes: parsedAttendees,
                organizador: organizador,
                bodyPreview: item.bodyPreview || ''
            };
        });

        res.status(200).json({ events });
    } catch (error) {
        console.error("Error en obtenerEventosCalendario:", error);
        res.status(200).json({ events: [] });
    }
};

// ============================================================
// POST /agendamiento/sync-past — Sincronización con Microsoft Graph
// Escribe en teams_eventos (nueva fuente de la verdad)
// ============================================================
const syncEventosPasados = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        const usuarioId = req.usuario.id;

        if (!usuarioCorreo) {
            return res.status(400).json({ error: "Usuario sin correo." });
        }

        const now = new Date();
        const start = "2026-01-01T00:00:00.000Z";
        const end = new Date(now.getFullYear() + 1, 0, 1).toISOString();

        const accessToken = await getGraphToken();

        const [usuarioRows] = await db.query("SELECT sync_delta_token, ultima_sincronizacion FROM usuarios WHERE id = ?", [usuarioId]);
        const deltaToken = usuarioRows[0]?.sync_delta_token;

        let endpoint = "";
        let isDeltaRequest = false;

        if (deltaToken) {
            endpoint = deltaToken;
            isDeltaRequest = true;
        } else {
            endpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/calendarView/delta?startDateTime=${start}&endDateTime=${end}`;
        }

        let allRawEvents = [];
        let currentEndpoint = endpoint;
        let finalDeltaToken = null;

        while (currentEndpoint) {
            const response = await fetch(currentEndpoint, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Prefer": "outlook.timezone=\"America/Santiago\""
                }
            });

            if (!response.ok) {
                if (response.status === 410) {
                    // Token expirado → forzar sync completo
                    await db.query("UPDATE usuarios SET sync_delta_token = NULL WHERE id = ?", [usuarioId]);
                }
                if (!res.headersSent) {
                    return res.status(200).json({ success: true, message: "No se pudo sincronizar o el token expiró. Se intentará de nuevo.", procesados: 0 });
                }
                return;
            }

            const data = await response.json();
            if (data.value && data.value.length > 0) allRawEvents.push(...data.value);

            if (data['@odata.nextLink']) {
                currentEndpoint = data['@odata.nextLink'];
            } else if (data['@odata.deltaLink']) {
                finalDeltaToken = data['@odata.deltaLink'];
                currentEndpoint = null;
            } else {
                currentEndpoint = null;
            }
        }

        if (finalDeltaToken) {
            await db.query("UPDATE usuarios SET sync_delta_token = ?, ultima_sincronizacion = NOW() WHERE id = ?", [finalDeltaToken, usuarioId]);
        } else {
            await db.query("UPDATE usuarios SET ultima_sincronizacion = NOW() WHERE id = ?", [usuarioId]);
        }

        // Cargar dominios conocidos para matching
        const [dominiosDocs] = await db.query("SELECT empresa_id, dominio FROM empresa_dominios");

        // Obtener ID de PROFORMA INTERNA
        const [proformaEmp] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA' LIMIT 1");
        const proformaEmpId = proformaEmp.length > 0 ? proformaEmp[0].id : null;

        const todayStr = now.toISOString().split('T')[0];
        let procesados = 0;

        for (const event of allRawEvents) {
            try {
                const eventKey = event.id;

                // === EVENTO ELIMINADO (delta @removed) ===
                if (event['@removed']) {
                    await db.query("UPDATE teams_eventos SET estado = 'cancelada' WHERE event_id = ?", [eventKey]);
                    // Marcar minuta borrador relacionada como no_aplica
                    const [te] = await db.query("SELECT id, empresa_id FROM teams_eventos WHERE event_id = ?", [eventKey]);
                    if (te.length > 0) {
                        await db.query("UPDATE minutas SET estado_envio = 'no_aplica' WHERE teams_evento_id = ? AND estado_envio = 'borrador'", [te[0].id]);
                        if (te[0].empresa_id) {
                            await db.query(
                                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'cancelada', ?, ?, ?, 'Eliminada desde Outlook')",
                                [te[0].empresa_id, todayStr, usuarioId, eventKey]
                            );
                        }
                    }
                    procesados++;
                    continue;
                }

                const fecha = formatDate(event.start.dateTime);
                const hora = formatTime(event.start.dateTime);
                const horaFin = formatTime(event.end.dateTime);
                const isEventPast = new Date(event.end.dateTime + "Z") < now;
                const isCancelled = event.isCancelled || false;

                // Forzar límite: ignorar cualquier evento antes del 1 de enero de 2026
                if (new Date(event.start.dateTime) < new Date("2026-01-01T00:00:00Z")) {
                    continue;
                }

                if (isCancelled) {
                    await db.query("UPDATE teams_eventos SET estado = 'cancelada' WHERE event_id = ?", [eventKey]);
                    const [te] = await db.query("SELECT id, empresa_id FROM teams_eventos WHERE event_id = ?", [eventKey]);
                    if (te.length > 0) {
                        await db.query("UPDATE minutas SET estado_envio = 'no_aplica' WHERE teams_evento_id = ? AND estado_envio = 'borrador'", [te[0].id]);
                    }
                    continue;
                }

                // Determinar tipo de evento
                const subjectLower = (event.subject || '').toLowerCase();
                const locationName = (event.location && event.location.displayName) ? event.location.displayName.toLowerCase() : '';
                const isPresencial = subjectLower.includes('presencial') || locationName.includes('presencial');
                const hasOnlineLink = event.isOnlineMeeting || (event.onlineMeeting && event.onlineMeeting.joinUrl);

                // Solo procesar reuniones Teams (online o presencial marcado)
                if (!hasOnlineLink && !isPresencial) continue;

                // Resolver asistentes
                const attendees = event.attendees || [];
                const parsedAttendees = await Promise.all(attendees.map(async (a) => {
                    const email = (a.emailAddress.address || '').toLowerCase().trim();
                    if (!email) return null;
                    const name = await resolveDisplayName(email, a.emailAddress.name || '');
                    return { 
                        name, 
                        email, 
                        response: a.status?.response || 'none',
                        type: a.type || 'required' 
                    };
                }));
                const filteredAttendees = parsedAttendees.filter(Boolean);
                const emails = filteredAttendees.map(a => a.email);
                
                // Resolver organizador
                const organizerEmail = (event.organizer?.emailAddress?.address || '').toLowerCase().trim();
                const organizerName = event.organizer?.emailAddress?.name || '';
                const organizador = organizerEmail ? { name: organizerName, email: organizerEmail } : null;

                // Extraer preview del cuerpo
                const bodyPreview = event.bodyPreview || '';

                if (emails.length === 0) {
                    // Sin asistentes → ignorar
                    await upsertTeamsEvento({
                        event, fecha, hora, horaFin, usuarioId,
                        empresa_id: null, estado: 'excluida',
                        filteredAttendees, isPresencial, isEventPast, organizador, bodyPreview
                    });
                    continue;
                }



                // === MATCHING POR DOMINIO ===
                const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];
                const externalDomains = new Set();

                for (const email of emails) {
                    if (email.includes('@')) {
                        const dom = email.split('@')[1].toLowerCase();
                        if (!dominiosGenericos.includes(dom)) {
                            externalDomains.add('@' + dom);
                        }
                    }
                }

                let matchedEmpresaId = null;
                if (externalDomains.size === 1) {
                    const domain = [...externalDomains][0];
                    const match = dominiosDocs.find(d => d.dominio === domain);
                    if (match) matchedEmpresaId = match.empresa_id;
                }

                // También intentar matching por correo exacto
                if (!matchedEmpresaId) {
                    for (const email of emails) {
                        if (!email.endsWith('@proforma.cl')) {
                            const [contactMatch] = await db.query(
                                "SELECT empresa_id FROM empresa_contactos WHERE correo = ? LIMIT 1",
                                [email]
                            );
                            if (contactMatch.length > 0) {
                                matchedEmpresaId = contactMatch[0].empresa_id;
                                break;
                            }
                        }
                    }
                }

                // Si todos los asistentes y el organizador son internos (proforma.cl o oticproforma.cl), es una reunión Proforma Interna
                const PROFORMA_DOMAINS = ['@proforma.cl', '@oticproforma.cl'];
                const allEmailsForProformaCheck = [...emails];
                if (organizerEmail) allEmailsForProformaCheck.push(organizerEmail);

                const isPurelyProforma = allEmailsForProformaCheck.length > 0 && allEmailsForProformaCheck.every(email => 
                    PROFORMA_DOMAINS.some(d => email.toLowerCase().endsWith(d))
                );

                if (isPurelyProforma && proformaEmpId) {
                    matchedEmpresaId = proformaEmpId;
                }

                const estado = isEventPast ? 'pasada' : 'agendada';

                await upsertTeamsEvento({
                    event, fecha, hora, horaFin, usuarioId,
                    empresa_id: matchedEmpresaId, estado,
                    filteredAttendees, isPresencial, isEventPast, organizador, bodyPreview
                });

                // Si tiene empresa y es agendada, registrar en log
                if (matchedEmpresaId && !isEventPast) {
                    const [existing] = await db.query(
                        "SELECT id FROM empresa_seguimiento_log WHERE reunion_id = ? AND estado = 'agendada'",
                        [event.id]
                    );
                    if (existing.length === 0) {
                        await db.query(
                            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'agendada', ?, ?, ?, ?)",
                            [matchedEmpresaId, fecha, usuarioId, event.id, event.subject || 'Sin asunto']
                        );
                        await db.query(
                            "UPDATE empresas SET estado_seguimiento = 'agendada', fecha_concretada = ? WHERE id = ?",
                            [fecha, matchedEmpresaId]
                        );
                    }
                }

                procesados++;
            } catch (eventError) {
                console.error(`Error procesando evento ${event.id}:`, eventError);
            }
        }

        if (!res.headersSent) {
            res.status(200).json({ success: true, procesados });
        }
    } catch (error) {
        console.error("Error en syncEventosPasados:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Error interno en sincronización." });
        }
    }
};

/**
 * Función auxiliar: upsert en teams_eventos
 * Crea o actualiza el registro de un evento de Teams
 */
const upsertTeamsEvento = async ({ event, fecha, hora, horaFin, usuarioId, empresa_id, estado, filteredAttendees, isPresencial, isEventPast, organizador, bodyPreview }) => {
    const asistentesJson = JSON.stringify(filteredAttendees);
    const organizadorJson = organizador ? JSON.stringify(organizador) : null;
    const joinUrl = event.onlineMeeting?.joinUrl || null;
    const es_online = isPresencial ? 0 : 1;

    // Verificar si ya existe
    const [existing] = await db.query("SELECT id, estado FROM teams_eventos WHERE event_id = ?", [event.id]);

    if (existing.length > 0) {
        // Ya existe → actualizar fecha/hora/estado si cambió
        const existingEstado = existing[0].estado;
        // No revertir una cancelación manual
        const nuevoEstado = (existingEstado === 'cancelada') ? 'cancelada' : estado;

        // Detectar reagendamiento: si la fecha cambió y tiene empresa
        const [prevData] = await db.query("SELECT fecha, empresa_id, asunto FROM teams_eventos WHERE event_id = ?", [event.id]);
        if (prevData.length > 0 && prevData[0].fecha) {
            const oldFecha = new Date(prevData[0].fecha).toISOString().split('T')[0];
            const newFecha = fecha;
            if (oldFecha !== newFecha && prevData[0].empresa_id) {
                await db.query(
                    "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'reagendada', ?, ?, ?, ?)",
                    [prevData[0].empresa_id, newFecha, usuarioId, event.id, `Reagendada: ${prevData[0].asunto || 'Sin asunto'} (antes: ${oldFecha})`]
                );
            }
        }

        await db.query(`
            UPDATE teams_eventos 
            SET fecha = ?, hora = ?, hora_fin = ?, asistentes = ?, join_url = ?, es_online = ?, ultima_sync = NOW(), estado = ?, organizador = ?, body_preview = ?
            WHERE event_id = ?
        `, [fecha, hora, horaFin, asistentesJson, joinUrl, es_online, nuevoEstado, organizadorJson, bodyPreview, event.id]);

        // Detectar reunión concretada: pasó de agendada a pasada
        if (existingEstado === 'agendada' && nuevoEstado === 'pasada') {
            const resolvedEmpresaId = prevData?.[0]?.empresa_id || empresa_id;
            if (resolvedEmpresaId) {
                const [existingConcretada] = await db.query(
                    "SELECT id FROM empresa_seguimiento_log WHERE reunion_id = ? AND estado = 'concretada'",
                    [event.id]
                );
                if (existingConcretada.length === 0) {
                    await db.query(
                        "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'concretada', ?, ?, ?, ?)",
                        [resolvedEmpresaId, fecha, usuarioId, event.id, prevData?.[0]?.asunto || event.subject || 'Reunión concretada']
                    );
                    await db.query(
                        "UPDATE empresas SET estado_seguimiento = 'gestionada', fecha_concretada = COALESCE(fecha_concretada, ?) WHERE id = ?",
                        [fecha, resolvedEmpresaId]
                    );
                }
            }
        }
    } else {
        // No existe → crear
        await db.query(`
            INSERT INTO teams_eventos 
            (event_id, ical_uid, usuario_id, empresa_id, asunto, fecha, hora, hora_fin, estado, asistentes, join_url, es_online, ultima_sync, organizador, body_preview)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
        `, [
            event.id,
            event.iCalUId || null,
            usuarioId,
            empresa_id,
            event.subject || 'Sin asunto',
            fecha,
            hora,
            horaFin,
            estado,
            asistentesJson,
            joinUrl,
            es_online,
            organizadorJson,
            bodyPreview
        ]);
    }
};

// ============================================================
// GET /agendamiento/sync-status
// ============================================================
const getSyncStatus = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const [rows] = await db.query("SELECT ultima_sincronizacion FROM usuarios WHERE id = ?", [usuarioId]);
        res.status(200).json({ ultima_sincronizacion: rows[0]?.ultima_sincronizacion || null });
    } catch (error) {
        console.error("Error en getSyncStatus:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

// ============================================================
// GET /agendamiento/teams-eventos — Listar eventos de Teams del usuario
// (para la vista de vinculación de empresa)
// ============================================================
const getTeamsEventos = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const rol = req.usuario.permisos;

        let whereExtra = "";
        let params = [usuarioId];

        if (rol === 'ejecutiva') {
            // Solo sus propios eventos o donde es invitado
            whereExtra = "AND (te.usuario_id = ? OR te.asistentes LIKE (SELECT CONCAT('%', correo, '%') FROM usuarios WHERE id = ?))";
            params.push(usuarioId);
        } else if (rol === 'jefatura') {
            whereExtra = `AND (te.usuario_id = ? OR te.usuario_id IN (SELECT id FROM usuarios WHERE jefatura_id = ?))`;
            params.push(usuarioId);
        } else {
            // admin, gerencia → todos
            whereExtra = "AND 1=1";
            params = [];
        }

        const [rows] = await db.query(`
            SELECT 
                te.id, te.event_id, te.asunto, te.fecha, te.hora, te.hora_fin,
                te.estado, te.es_online, te.asistentes, te.join_url, te.ultima_sync,
                te.organizador, te.body_preview,
                te.empresa_id,
                emp.nombre AS empresa_nombre,
                u.nombre AS usuario_nombre,
                m.id AS minuta_id, m.id_minuta, m.estado_envio AS minuta_estado
            FROM teams_eventos te
            LEFT JOIN empresas emp ON te.empresa_id = emp.id
            LEFT JOIN usuarios u ON te.usuario_id = u.id
            LEFT JOIN minutas m ON m.teams_evento_id = te.id
            WHERE te.estado NOT IN ('cancelada', 'excluida')
            ${whereExtra}
            ORDER BY te.fecha DESC, te.hora DESC
        `, params);

        res.json(rows);
    } catch (error) {
        console.error("Error en getTeamsEventos:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

// ============================================================
// POST /agendamiento/teams-eventos/:id/vincular — Vincular empresa a evento
// ============================================================
const vincularEmpresaAEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresa_id, dominios } = req.body;

        if (!empresa_id) return res.status(400).json({ error: "empresa_id es requerido." });

        // Obtener el evento
        const [rows] = await db.query("SELECT * FROM teams_eventos WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado." });

        const evento = rows[0];

        // Actualizar empresa en teams_eventos
        await db.query("UPDATE teams_eventos SET empresa_id = ? WHERE id = ?", [empresa_id, id]);

        // Aprender dominios y contactos
        let attendeesList = [];
        if (evento.asistentes) {
            if (typeof evento.asistentes === 'object') {
                attendeesList = evento.asistentes;
            } else {
                try { attendeesList = JSON.parse(evento.asistentes); } catch (e) {}
            }
        }

        const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];

        for (const item of attendeesList) {
            const email = (typeof item === 'string' ? item : item.email || '').trim().toLowerCase();
            const name = typeof item === 'object' ? (item.name || null) : null;

            if (email && email.includes('@')) {
                const dom = '@' + email.split('@')[1];
                
                // Evitar guardar correos internos de Proforma
                if (dom !== '@proforma.cl' && dom !== '@oticproforma.cl') {
                    // Guardar el contacto siempre (independiente de si su dominio es genérico o no)
                    const [existing] = await db.query("SELECT id, nombre FROM empresa_contactos WHERE empresa_id = ? AND correo = ?", [empresa_id, email]);
                    if (existing.length === 0) {
                        await db.query("INSERT INTO empresa_contactos (empresa_id, correo, nombre) VALUES (?, ?, ?)", [empresa_id, email, name]);
                    } else if (name && !existing[0].nombre) {
                        await db.query("UPDATE empresa_contactos SET nombre = ? WHERE id = ?", [name, existing[0].id]);
                    }

                    // Guardar el dominio de la empresa solo si no es genérico
                    if (!dominiosGenericos.includes(dom.substring(1))) {
                        const shouldSaveDomain = !dominios || dominios.includes(dom);
                        if (shouldSaveDomain) {
                            await db.query("INSERT IGNORE INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)", [empresa_id, dom]);
                        }
                    }
                }
            }
        }

        // Auto-vincular otros eventos pendientes (retro-match)
        const [dominiosDocs] = await db.query("SELECT dominio FROM empresa_dominios WHERE empresa_id = ?", [empresa_id]);
        const [contactosDocs] = await db.query("SELECT correo FROM empresa_contactos WHERE empresa_id = ?", [empresa_id]);
        const knownDomains = new Set(dominiosDocs.map(d => d.dominio));
        const knownEmails = new Set(contactosDocs.map(c => c.correo));

        const [sinEmpresa] = await db.query(`
            SELECT te.* 
            FROM teams_eventos te
            LEFT JOIN minutas m ON m.teams_evento_id = te.id
            WHERE te.empresa_id IS NULL 
              AND te.estado NOT IN ('cancelada', 'excluida') 
              AND m.id IS NULL 
              AND te.id != ?
        `, [id]);

        let autoVinculados = 0;
        for (const evt of sinEmpresa) {
            let evtAttendees = [];
            if (evt.asistentes) {
                if (typeof evt.asistentes === 'object') {
                    evtAttendees = evt.asistentes;
                } else {
                    try { evtAttendees = JSON.parse(evt.asistentes); } catch (e) {}
                }
            }

            const externalDomains = new Set();
            let matched = false;

            for (const item of evtAttendees) {
                const email = (typeof item === 'string' ? item : item.email || '').trim().toLowerCase();
                if (!email) continue;
                
                if (email.includes('@')) {
                    const dom = '@' + email.split('@')[1];
                    
                    // Si no es un correo interno de Proforma
                    if (dom !== '@proforma.cl' && dom !== '@oticproforma.cl') {
                        // Coincidencia exacta por contacto/email registrado
                        if (knownEmails.has(email)) {
                            matched = true;
                        }

                        // Agregar a dominios externos y validar dominio corporativo registrado
                        if (!dominiosGenericos.includes(dom.substring(1))) {
                            externalDomains.add(dom);
                            if (knownDomains.has(dom)) {
                                matched = true;
                            }
                        }
                    }
                }
            }

            // Auto-vincular si coincide dominio o email, y hay como máximo 1 dominio corporativo externo (evita reuniones masivas)
            if (matched && externalDomains.size <= 1) {
                await db.query("UPDATE teams_eventos SET empresa_id = ? WHERE id = ?", [empresa_id, evt.id]);
                autoVinculados++;
            }
        }

        // Registrar en empresa_seguimiento_log
        const [existingLog] = await db.query(
            "SELECT id FROM empresa_seguimiento_log WHERE reunion_id = ? AND estado = 'agendada'",
            [evento.event_id]
        );
        if (existingLog.length === 0) {
            await db.query(
                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'agendada', ?, ?, ?, ?)",
                [empresa_id, evento.fecha, req.usuario.id, evento.event_id, evento.asunto]
            );
        }

        let message = "Evento vinculado exitosamente.";
        if (autoVinculados > 0) message += ` Se auto-vincularon ${autoVinculados} eventos adicionales.`;

        res.json({ success: true, message });
    } catch (error) {
        console.error("Error en vincularEmpresaAEvento:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

// ============================================================
// POST /agendamiento/teams-eventos/:id/desvincular — Quitar empresa de un evento
// ============================================================
const desvincularEmpresaDeEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const { dominios } = req.body;

        const [rows] = await db.query("SELECT empresa_id FROM teams_eventos WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado." });

        const empresa_id = rows[0].empresa_id;

        // Eliminar dominios si se indicaron
        if (dominios && Array.isArray(dominios) && empresa_id) {
            for (const dom of dominios) {
                await db.query("DELETE FROM empresa_dominios WHERE empresa_id = ? AND dominio = ?", [empresa_id, dom]);
            }
        }

        // Si hay una minuta borrador vinculada, eliminarla
        await db.query("DELETE FROM minutas WHERE teams_evento_id = ? AND estado_envio = 'borrador'", [id]);

        // Quitar empresa del evento
        await db.query("UPDATE teams_eventos SET empresa_id = NULL WHERE id = ?", [id]);

        res.json({ success: true, message: "Empresa desvinculada del evento." });
    } catch (error) {
        console.error("Error en desvincularEmpresaDeEvento:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

// ============================================================
// GET /agendamiento/debug (mantener para compatibilidad)
// ============================================================
const debugProforma = async (req, res) => {
    try {
        const [emp] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
        const [users] = await db.query("SELECT id, correo, sync_delta_token, ultima_sincronizacion FROM usuarios LIMIT 5");
        const [teEvts] = await db.query("SELECT id, event_id, asunto, fecha, hora, estado, empresa_id FROM teams_eventos ORDER BY fecha DESC LIMIT 30");
        res.json({
            proforma_interna: emp,
            users,
            teams_eventos: teEvts
        });
    } catch (e) {
        res.json({ error: e.message });
    }
};

// ============================================================
// POST /agendamiento/teams-eventos/:id/marcar-excluida
// Marca una reunion como excluida (efecto global, sin empresa)
// ============================================================
const marcarExcluida = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener datos del evento antes de actualizar
        const [rows] = await db.query("SELECT * FROM teams_eventos WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado." });

        const evento = rows[0];

        // Actualizar a excluida (sin filtrar por usuario → efecto global)
        await db.query("UPDATE teams_eventos SET estado = 'excluida' WHERE id = ?", [id]);

        // Si tenía empresa, registrar en log
        if (evento.empresa_id) {
            await db.query(
                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'no_aplica', ?, ?, ?, ?)",
                [evento.empresa_id, evento.fecha, req.usuario.id, evento.event_id, evento.asunto || 'Reunión excluida']
            );
        }

        res.json({ success: true, message: "Reunión marcada como excluida." });
    } catch (error) {
        console.error("Error en marcarExcluida:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

// ============================================================
// POST /agendamiento/teams-eventos/:id/marcar-proforma
// Asigna la empresa PROFORMA INTERNA al evento (efecto global)
// ============================================================
const marcarProforma = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener ID de PROFORMA INTERNA
        const [proformaRows] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA' LIMIT 1");
        if (proformaRows.length === 0) {
            return res.status(500).json({ error: "No se encontró la empresa PROFORMA INTERNA en la BD." });
        }
        const proformaId = proformaRows[0].id;

        // Verificar que el evento existe
        const [rows] = await db.query("SELECT * FROM teams_eventos WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado." });

        // Actualizar empresa_id a PROFORMA INTERNA (sin filtrar por usuario → efecto global)
        await db.query("UPDATE teams_eventos SET empresa_id = ?, estado = 'pasada' WHERE id = ?", [proformaId, id]);

        res.json({ success: true, message: "Reunión asignada a Proforma Interna.", proforma_id: proformaId });
    } catch (error) {
        console.error("Error en marcarProforma:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

module.exports = {
    crearReunionTeams,
    obtenerEventosCalendario,
    anularReunionTeams,
    syncEventosPasados,
    getSyncStatus,
    getTeamsEventos,
    vincularEmpresaAEvento,
    desvincularEmpresaDeEvento,
    debugProforma,
    marcarExcluida,
    marcarProforma,
    marcarReagendada
};
