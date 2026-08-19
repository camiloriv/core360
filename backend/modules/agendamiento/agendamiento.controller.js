require("dotenv").config();
const agendamientoRepository = require("../../database/repositories/agendamiento.repository");

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
        const userNombre = await agendamientoRepository.getUsuarioNombreByCorreo(email);
        if (userNombre && userNombre.nombre) return userNombre.nombre;
    } catch (e) { /* ignore */ }

    try {
        const contactNombre = await agendamientoRepository.getContactoNombreByCorreo(email);
        if (contactNombre && contactNombre.nombre) return contactNombre.nombre;
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

        // Registrar en teams_eventos
        const allAttendees = attendees.map(a => ({ email: a.emailAddress.address, name: a.emailAddress.name || '' }));
        const asistentesJson = JSON.stringify(allAttendees);
        const empresaIdVal = empresa_id ? parseInt(empresa_id) : null;

        await agendamientoRepository.upsertTeamsEventoQuery({
            event_id: data.id,
            usuario_id: req.usuario.id,
            empresa_id: empresaIdVal,
            asunto: finalSubject,
            fecha,
            hora,
            hora_fin: horaFin,
            es_online: isPresencial ? 0 : 1,
            asistentes: asistentesJson,
            join_url: data.onlineMeeting?.joinUrl || null
        });

        if (empresa_id && destinatarios) {
            const correos = destinatarios.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
            const dominiosDocs = await agendamientoRepository.getEmpresaDominiosByEmpresaId(empresa_id);
            const dominiosList = dominiosDocs.map(d => d.dominio.toLowerCase().trim());

            for (const email of correos) {
                if (email.includes('@')) {
                    const dom = '@' + email.split('@')[1];
                    if (dominiosList.includes(dom)) {
                        const existing = await agendamientoRepository.getEmpresaContactoByCorreo(empresa_id, email);
                        if (!existing) {
                            await agendamientoRepository.insertEmpresaContacto(empresa_id, email, null);
                        }
                    }
                }
            }
        }

        if (empresa_id) {
            await agendamientoRepository.insertEmpresaSeguimientoLog({
                empresa_id, estado: 'agendada', fecha, usuario_id: req.usuario.id, reunion_id: data.id, asunto: finalSubject
            });
            await agendamientoRepository.updateEmpresaSeguimiento(empresa_id, 'agendada', fecha);
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

        await agendamientoRepository.updateTeamsEventoEstado(eventId, 'cancelada');

        const teEvt = await agendamientoRepository.getTeamsEventoByEventId(eventId);
        if (teEvt) {
            await agendamientoRepository.updateMinutasEstadoEnvio(teEvt.id, 'borrador', 'no_aplica');
        }

        let empId = empresa_id;
        let eventFecha = null;
        if (teEvt) {
            if (!empId) empId = teEvt.empresa_id;
            eventFecha = teEvt.fecha;
        }

        if (empId) {
            const prevLog = await agendamientoRepository.getEmpresaSeguimientoLogByReunionAsunto(eventId);
            const asuntoOriginal = prevLog ? prevLog.asunto : null;
            let asuntoCancelacion = asuntoOriginal ? `Cancelada: ${asuntoOriginal}` : "Reunión cancelada en Teams";
            
            if (motivo && motivo.trim().length > 0) {
                asuntoCancelacion += ` - Motivo: ${motivo.trim()}`;
            }

            const fechaVal = eventFecha 
                ? new Date(eventFecha).toISOString().split('T')[0] 
                : new Date().toISOString().split('T')[0];

            await agendamientoRepository.insertEmpresaSeguimientoLog({
                empresa_id: empId, estado: 'cancelada', fecha: fechaVal, usuario_id: req.usuario.id, reunion_id: eventId, asunto: asuntoCancelacion
            });
            await agendamientoRepository.updateEmpresaSeguimiento(empId, 'pendiente');
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

        const teData = await agendamientoRepository.getTeamsEventoByEventId(eventId);
        if (!teData || !teData.empresa_id) {
            return res.status(400).json({ error: "No se puede registrar motivo en una reunión sin empresa vinculada." });
        }
        
        const empId = teData.empresa_id;
        const eventFecha = teData.fecha;

        const prevLog = await agendamientoRepository.getEmpresaSeguimientoLogByReunionAsunto(eventId);
        const asuntoOriginal = prevLog ? prevLog.asunto : null;
        let asuntoReagendada = asuntoOriginal ? `Reagendada: ${asuntoOriginal}` : "Reunión reagendada";
        
        if (motivo && motivo.trim().length > 0) {
            asuntoReagendada += ` - Motivo: ${motivo.trim()}`;
        }

        const fechaVal = eventFecha 
            ? new Date(eventFecha).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0];

        await agendamientoRepository.insertEmpresaSeguimientoLog({
            empresa_id: empId, estado: 'reagendada', fecha: fechaVal, usuario_id: req.usuario.id, reunion_id: eventId, asunto: asuntoReagendada
        });
        
        await agendamientoRepository.updateEmpresaSeguimiento(empId, 'pendiente');

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
        const eventIds = data.value.map(item => item.id);

        let dbEventsMap = {};
        if (eventIds.length > 0) {
            try {
                const dbRows = await agendamientoRepository.getTeamsEventosByIds(eventIds);
                dbRows.forEach(row => {
                    dbEventsMap[row.event_id] = row;
                });
            } catch (dbErr) {
                console.error("Error querying db in obtenerEventosCalendario:", dbErr);
            }
        }

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

            const dbEvt = dbEventsMap[item.id] || {};

            return {
                id: item.id,
                db_id: dbEvt.db_id || null,
                title: item.subject,
                start: item.start.dateTime + "Z",
                end: item.end.dateTime + "Z",
                isOnlineMeeting: item.isOnlineMeeting,
                joinUrl: item.onlineMeeting?.joinUrl,
                asistentes: parsedAttendees,
                organizador: organizador,
                bodyPreview: item.bodyPreview || '',
                empresa_id: dbEvt.empresa_id || null,
                empresa_nombre: dbEvt.empresa_nombre || null,
                estado_db: dbEvt.estado || null
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
// ============================================================
const syncEventosPasados = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        const usuarioId = req.usuario.id;

        if (!usuarioCorreo) {
            return res.status(400).json({ error: "Usuario sin correo." });
        }

        const now = new Date();
        const end = new Date(now.getFullYear() + 1, 0, 1).toISOString();

        const chileDateParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(now);
        const todayStrSantiago = `${chileDateParts.find(p => p.type === 'year').value}-${chileDateParts.find(p => p.type === 'month').value}-${chileDateParts.find(p => p.type === 'day').value}`;
        const currentTimeSantiago = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(now);

        const accessToken = await getGraphToken();

        const userRow = await agendamientoRepository.getUsuarioSyncToken(usuarioId);
        const savedDeltaToken = userRow?.sync_delta_token || null;

        let currentEndpoint;
        if (savedDeltaToken) {
            currentEndpoint = savedDeltaToken;
            console.log(`🔄 Delta sync para ${usuarioCorreo}`);
        } else {
            currentEndpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/calendarView/delta?startDateTime=2026-01-01T00:00:00.000Z&endDateTime=${end}`;
            console.log(`📥 Primera sync completa para ${usuarioCorreo}`);
        }

        let allRawEvents = [];
        let deltaLink = null;

        while (currentEndpoint) {
            const response = await fetch(currentEndpoint, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Prefer": "outlook.timezone=\"America/Santiago\", odata.maxpagesize=100"
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`Error Graph API (${response.status}):`, errText);
                if (response.status === 410 || response.status === 405) {
                    console.log(`⚠️ Delta token inválido para ${usuarioCorreo}, reseteando para sync completa...`);
                    await agendamientoRepository.updateUsuarioSyncToken(usuarioId, null);
                }
                if (!res.headersSent) {
                    return res.status(200).json({ success: true, message: "No se pudo sincronizar.", procesados: 0 });
                }
                return;
            }

            const data = await response.json();
            if (data.value && data.value.length > 0) allRawEvents.push(...data.value);

            if (data['@odata.deltaLink']) {
                deltaLink = data['@odata.deltaLink'];
            }
            currentEndpoint = data['@odata.nextLink'] || null;
        }

        if (deltaLink) {
            await agendamientoRepository.updateUsuarioSyncToken(usuarioId, deltaLink);
        } else {
            // Update ultima_sincronizacion only
            await agendamientoRepository.updateUsuarioSyncToken(usuarioId, savedDeltaToken);
        }

        const dominiosDocs = await agendamientoRepository.getEmpresaDominiosAll();
        const proformaEmp = await agendamientoRepository.getProformaInternaEmpresa();
        const proformaEmpId = proformaEmp ? proformaEmp.id : null;

        const systemUsersRows = await agendamientoRepository.getSystemEmails();
        const systemEmails = new Set(systemUsersRows.map(u => u.correo.toLowerCase().trim()));

        const todayStr = now.toISOString().split('T')[0];
        let procesados = 0;

        for (const event of allRawEvents) {
            try {
                const eventKey = event.id;

                if (event['@removed']) {
                    await agendamientoRepository.updateTeamsEventoEstado(eventKey, 'cancelada');
                    const te = await agendamientoRepository.getTeamsEventoByEventId(eventKey);
                    if (te) {
                        await agendamientoRepository.updateMinutasEstadoEnvio(te.id, 'borrador', 'no_aplica');
                        if (te.empresa_id) {
                            await agendamientoRepository.insertEmpresaSeguimientoLog({
                                empresa_id: te.empresa_id, estado: 'cancelada', fecha: todayStr, usuario_id: usuarioId, reunion_id: eventKey, asunto: 'Eliminada desde Outlook'
                            });
                        }
                    }
                    procesados++;
                    continue;
                }

                const fecha = formatDate(event.start.dateTime);
                const hora = formatTime(event.start.dateTime);
                const horaFin = formatTime(event.end.dateTime);
                const isEventPast = fecha < todayStrSantiago || (fecha === todayStrSantiago && horaFin <= currentTimeSantiago);
                const isCancelled = event.isCancelled || false;

                if (new Date(event.start.dateTime) < new Date("2026-01-01T00:00:00")) {
                    continue;
                }

                if (isCancelled) {
                    await agendamientoRepository.updateTeamsEventoEstado(eventKey, 'cancelada');
                    const te = await agendamientoRepository.getTeamsEventoByEventId(eventKey);
                    if (te) {
                        await agendamientoRepository.updateMinutasEstadoEnvio(te.id, 'borrador', 'no_aplica');
                    }
                    continue;
                }

                const subjectLower = (event.subject || '').toLowerCase();
                const locationName = (event.location && event.location.displayName) ? event.location.displayName.toLowerCase() : '';
                const isPresencial = subjectLower.includes('presencial') || locationName.includes('presencial');

                const attendees = event.attendees || [];
                const parsedAttendees = await Promise.all(attendees.map(async (a) => {
                    const email = (a.emailAddress.address || '').toLowerCase().trim();
                    if (!email) return null;
                    const name = await resolveDisplayName(email, a.emailAddress.name || '');
                    return { name, email, response: a.status?.response || 'none', type: a.type || 'required' };
                }));
                const filteredAttendees = parsedAttendees.filter(Boolean);
                const emails = filteredAttendees.map(a => a.email);
                
                const organizerEmail = (event.organizer?.emailAddress?.address || '').toLowerCase().trim();
                const organizerName = event.organizer?.emailAddress?.name || '';
                const organizador = organizerEmail ? { name: organizerName, email: organizerEmail } : null;

                let bodyPreview = (event.body && event.body.content) ? event.body.content : (event.bodyPreview || '');
                bodyPreview = bodyPreview.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (bodyPreview.length > 800) bodyPreview = bodyPreview.substring(0, 800);

                if (emails.length === 0) {
                    await upsertTeamsEvento({ event, fecha, hora, horaFin, usuarioId, empresa_id: null, estado: 'excluida', filteredAttendees, isPresencial, isEventPast, organizador, bodyPreview });
                    continue;
                }

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

                if (!matchedEmpresaId) {
                    for (const email of emails) {
                        if (!email.endsWith('@proforma.cl')) {
                            // Find any contact with this email globally
                            const contactMatch = await agendamientoRepository.findContactEmpresaByEmail(email);
                            if (contactMatch) {
                                matchedEmpresaId = contactMatch.empresa_id;
                                break;
                            }
                        }
                    }
                }

                const PROFORMA_DOMAINS = ['@proforma.cl', '@oticproforma.cl'];
                const allEmailsForProformaCheck = [...emails];
                if (organizerEmail) allEmailsForProformaCheck.push(organizerEmail);

                const isPurelyProforma = allEmailsForProformaCheck.length > 0 && allEmailsForProformaCheck.every(email => 
                    PROFORMA_DOMAINS.some(d => email.toLowerCase().endsWith(d)) || systemEmails.has(email.toLowerCase())
                );

                if (isPurelyProforma && proformaEmpId) {
                    matchedEmpresaId = proformaEmpId;
                }

                const estado = isEventPast ? 'pasada' : 'agendada';

                await upsertTeamsEvento({ event, fecha, hora, horaFin, usuarioId, empresa_id: matchedEmpresaId, estado, filteredAttendees, isPresencial, isEventPast, organizador, bodyPreview });

                if (matchedEmpresaId && !isEventPast) {
                    const existingLog = await agendamientoRepository.getEmpresaSeguimientoLogAgendada(event.id);
                    if (!existingLog) {
                        await agendamientoRepository.insertEmpresaSeguimientoLog({
                            empresa_id: matchedEmpresaId, estado: 'agendada', fecha, usuario_id: usuarioId, reunion_id: event.id, asunto: event.subject || 'Sin asunto'
                        });
                        await agendamientoRepository.updateEmpresaSeguimiento(matchedEmpresaId, 'agendada', fecha);
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

const upsertTeamsEvento = async ({ event, fecha, hora, horaFin, usuarioId, empresa_id, estado, filteredAttendees, isPresencial, isEventPast, organizador, bodyPreview }) => {
    const asistentesJson = JSON.stringify(filteredAttendees);
    const organizadorJson = organizador ? JSON.stringify(organizador) : null;
    const joinUrl = event.onlineMeeting?.joinUrl || null;
    const es_online = isPresencial ? 0 : 1;

    const existing = await agendamientoRepository.getTeamsEventoByIcalOrEventId(event.iCalUId, event.id);

    if (existing) {
        const existingEstado = existing.estado;
        const nuevoEstado = (existingEstado === 'cancelada') ? 'cancelada' : estado;

        const prevData = await agendamientoRepository.getTeamsEventoByEventId(existing.event_id);
        if (prevData && prevData.fecha) {
            const oldFecha = new Date(prevData.fecha).toISOString().split('T')[0];
            const newFecha = fecha;
            if (oldFecha !== newFecha && prevData.empresa_id) {
                await agendamientoRepository.insertEmpresaSeguimientoLog({
                    empresa_id: prevData.empresa_id, estado: 'reagendada', fecha: newFecha, usuario_id: usuarioId, reunion_id: event.id, asunto: `Reagendada: ${prevData.asunto || 'Sin asunto'} (antes: ${oldFecha})`
                });
            }
        }

        await agendamientoRepository.updateTeamsEventoFull(existing.id, {
            fecha, hora, hora_fin: horaFin, asistentes: asistentesJson, join_url: joinUrl, es_online, estado: nuevoEstado, organizador: organizadorJson, body_preview: bodyPreview
        });

        if (existingEstado === 'agendada' && nuevoEstado === 'pasada') {
            const resolvedEmpresaId = prevData?.empresa_id || empresa_id;
            if (resolvedEmpresaId) {
                const existingConcretada = await agendamientoRepository.getEmpresaSeguimientoLogConcretada(event.id);
                if (!existingConcretada) {
                    await agendamientoRepository.insertEmpresaSeguimientoLog({
                        empresa_id: resolvedEmpresaId, estado: 'concretada', fecha, usuario_id: usuarioId, reunion_id: existing.event_id, asunto: prevData?.asunto || event.subject || 'Reunión concretada'
                    });
                    await agendamientoRepository.updateEmpresaFechaConcretada(resolvedEmpresaId, fecha);
                }
            }
        }
    } else {
        await agendamientoRepository.insertTeamsEventoFull({
            event_id: event.id,
            ical_uid: event.iCalUId || null,
            usuario_id: usuarioId,
            empresa_id,
            asunto: event.subject || 'Sin asunto',
            fecha,
            hora,
            hora_fin: horaFin,
            estado,
            asistentes: asistentesJson,
            join_url: joinUrl,
            es_online,
            organizador: organizadorJson,
            body_preview: bodyPreview
        });
    }
};

const getSyncStatus = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const row = await agendamientoRepository.getUltimaSincronizacion(usuarioId);
        res.status(200).json({ ultima_sincronizacion: row?.ultima_sincronizacion || null });
    } catch (error) {
        console.error("Error en getSyncStatus:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

const getTeamsEventos = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const rol = req.usuario.permisos;
        const rows = await agendamientoRepository.getTeamsEventosList(usuarioId, rol);
        res.json(rows);
    } catch (error) {
        console.error("Error en getTeamsEventos:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

const vincularEmpresaAEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresa_id, dominios } = req.body;

        if (!empresa_id) return res.status(400).json({ error: "empresa_id es requerido." });

        const evento = await agendamientoRepository.getTeamsEventoByIdOrEventId(id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado." });

        await agendamientoRepository.updateTeamsEventoEmpresaId(evento.id, empresa_id);

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
                
                if (dom !== '@proforma.cl' && dom !== '@oticproforma.cl') {
                    const existing = await agendamientoRepository.getEmpresaContactoByCorreo(empresa_id, email);
                    if (!existing) {
                        await agendamientoRepository.insertEmpresaContacto(empresa_id, email, name);
                    } else if (name && !existing.nombre) {
                        await agendamientoRepository.updateEmpresaContactoNombre(existing.id, name);
                    }

                    if (!dominiosGenericos.includes(dom.substring(1))) {
                        const shouldSaveDomain = !dominios || dominios.includes(dom);
                        if (shouldSaveDomain) {
                            await agendamientoRepository.insertEmpresaDominioIgnore(empresa_id, dom);
                        }
                    }
                }
            }
        }

        const dominiosDocs = await agendamientoRepository.getEmpresaDominiosByEmpresaId(empresa_id);
        const contactosDocs = await agendamientoRepository.getEmpresaContactosByEmpresaId(empresa_id);
        const knownDomains = new Set(dominiosDocs.map(d => d.dominio));
        const knownEmails = new Set(contactosDocs.map(c => c.correo));

        const sinEmpresa = await agendamientoRepository.getEventosSinEmpresaParaVincular(evento.id);

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
                    
                    if (dom !== '@proforma.cl' && dom !== '@oticproforma.cl') {
                        if (knownEmails.has(email)) matched = true;

                        if (!dominiosGenericos.includes(dom.substring(1))) {
                            externalDomains.add(dom);
                            if (knownDomains.has(dom)) matched = true;
                        }
                    }
                }
            }

            if (matched && externalDomains.size <= 1) {
                await agendamientoRepository.updateTeamsEventoEmpresaId(evt.id, empresa_id);
                autoVinculados++;
            }
        }

        const existingLog = await agendamientoRepository.getEmpresaSeguimientoLogAgendada(evento.event_id);
        if (!existingLog) {
            await agendamientoRepository.insertEmpresaSeguimientoLog({
                empresa_id, estado: 'agendada', fecha: evento.fecha, usuario_id: req.usuario.id, reunion_id: evento.event_id, asunto: evento.asunto
            });
        }

        let message = "Evento vinculado exitosamente.";
        if (autoVinculados > 0) message += ` Se auto-vincularon ${autoVinculados} eventos adicionales.`;

        res.json({ success: true, message });
    } catch (error) {
        console.error("Error en vincularEmpresaAEvento:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

const desvincularEmpresaDeEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const { dominios } = req.body;

        const evento = await agendamientoRepository.getTeamsEventoByIdOrEventId(id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado." });

        const empresa_id = evento.empresa_id;

        if (dominios && Array.isArray(dominios) && empresa_id) {
            for (const dom of dominios) {
                await agendamientoRepository.deleteEmpresaDominio(empresa_id, dom);
            }
        }

        await agendamientoRepository.deleteMinutaBorradorByEvento(evento.id);
        await agendamientoRepository.deleteEmpresaSeguimientoLog(evento.event_id, empresa_id);
        await agendamientoRepository.updateTeamsEventoEmpresaId(evento.id, null);

        res.json({ success: true, message: "Empresa desvinculada del evento." });
    } catch (error) {
        console.error("Error en desvincularEmpresaDeEvento:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

const debugProforma = async (req, res) => {
    try {
        const data = await agendamientoRepository.getDebugData();
        res.json({
            proforma_interna: data.emp,
            users: data.users,
            teams_eventos: data.teEvts
        });
    } catch (e) {
        res.json({ error: e.message });
    }
};

const marcarExcluida = async (req, res) => {
    try {
        const { id } = req.params;

        const evento = await agendamientoRepository.getTeamsEventoByIdOrEventId(id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado." });

        await agendamientoRepository.updateTeamsEventoEstado(evento.id, 'excluida');

        if (evento.empresa_id) {
            await agendamientoRepository.insertEmpresaSeguimientoLog({
                empresa_id: evento.empresa_id, estado: 'no_aplica', fecha: evento.fecha, usuario_id: req.usuario.id, reunion_id: evento.event_id, asunto: evento.asunto || 'Reunión excluida'
            });
        }

        res.json({ success: true, message: "Reunión marcada como excluida." });
    } catch (error) {
        console.error("Error en marcarExcluida:", error);
        res.status(500).json({ error: "Error interno." });
    }
};

const marcarProforma = async (req, res) => {
    try {
        const { id } = req.params;

        const proformaRows = await agendamientoRepository.getProformaInternaEmpresa();
        if (!proformaRows) {
            return res.status(500).json({ error: "No se encontró la empresa PROFORMA INTERNA en la BD." });
        }
        const proformaId = proformaRows.id;

        const evento = await agendamientoRepository.getTeamsEventoByIdOrEventId(id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado." });

        await agendamientoRepository.updateTeamsEventoFull(evento.id, { empresa_id: proformaId, estado: 'pasada' });

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
