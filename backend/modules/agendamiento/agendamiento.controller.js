require("dotenv").config();
const db = require("../../database/connection");

const generarIdReunion = async () => {
    const year = new Date().getFullYear();
    const sql = `
        SELECT id_reunion 
        FROM reuniones 
        WHERE id_reunion LIKE ? 
        ORDER BY CAST(SUBSTRING(id_reunion, 10) AS UNSIGNED) DESC 
        LIMIT 1
    `;
    const [result] = await db.query(sql, [`REU-${year}-%`]);

    let maxNum = 0;
    if (result.length > 0 && result[0].id_reunion) {
        const parts = result[0].id_reunion.split('-');
        if (parts.length === 3) {
            maxNum = parseInt(parts[2], 10) || 0;
        }
    }
    const correlativo = String(maxNum + 1).padStart(4, "0");
    return `REU-${year}-${correlativo}`;
};

let graphToken = null;
let tokenExpiresAt = null;

const getGraphToken = async () => {
    if (graphToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
        return graphToken;
    }

    const response = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.AZURE_CLIENT_ID,
            client_secret: process.env.AZURE_CLIENT_SECRET,
            scope: "https://graph.microsoft.com/.default",
            grant_type: "client_credentials"
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error fetching token from Azure AD: ${errText}`);
    }

    const data = await response.json();
    graphToken = data.access_token;
    tokenExpiresAt = new Date(new Date().getTime() + (data.expires_in - 300) * 1000); 
    return graphToken;
};

const crearReunionTeams = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        if (!usuarioCorreo) {
            return res.status(400).json({ error: "El usuario no tiene correo configurado en su perfil." });
        }

        const { empresa_id, destinatarios, asistentes_internos, fecha, hora, duracion, asunto, detalle, modalidad, direccion } = req.body;

        // Parse dateTime and calculate end time
        // fecha = YYYY-MM-DD, hora = HH:mm
        const startDateTimeStr = `${fecha}T${hora}:00`;
        
        // Calculate end using local arithmetic to avoid timezone shifts
        const year = parseInt(fecha.split('-')[0]);
        const month = parseInt(fecha.split('-')[1]) - 1;
        const day = parseInt(fecha.split('-')[2]);
        const hour = parseInt(hora.split(':')[0]);
        const minute = parseInt(hora.split(':')[1]);
        
        const endObj = new Date(year, month, day, hour, minute + parseInt(duracion));
        
        const endYear = endObj.getFullYear();
        const endMonth = String(endObj.getMonth() + 1).padStart(2, "0");
        const endDay = String(endObj.getDate()).padStart(2, "0");
        const endHour = String(endObj.getHours()).padStart(2, "0");
        const endMinute = String(endObj.getMinutes()).padStart(2, "0");
        
        const endDateTimeStr = `${endYear}-${endMonth}-${endDay}T${endHour}:${endMinute}:00`;

        // Map attendees
        const attendees = [];
        if (destinatarios) {
            destinatarios.split(',').forEach(email => {
                if (email.trim()) {
                    attendees.push({ emailAddress: { address: email.trim() }, type: "required" });
                }
            });
        }
        if (asistentes_internos) {
            asistentes_internos.split(',').forEach(email => {
                if (email.trim()) {
                    attendees.push({ emailAddress: { address: email.trim() }, type: "optional" });
                }
            });
        }

        const isPresencial = modalidad === "Presencial";
        const finalSubject = isPresencial ? `${asunto} [Presencial]` : asunto;

        const eventPayload = {
            subject: finalSubject,
            body: {
                contentType: "HTML",
                content: detalle || "Reunión generada desde CORE 360"
            },
            start: {
                dateTime: startDateTimeStr,
                timeZone: "America/Santiago"
            },
            end: {
                dateTime: endDateTimeStr,
                timeZone: "America/Santiago"
            },
            attendees: attendees
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
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(eventPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Graph API Error: ${errorText}`);
        }

        const data = await response.json();
        
        if (empresa_id) {
            const fechaVal = fecha;
            await db.query("UPDATE empresas SET estado_seguimiento = ?, fecha_concretada = ? WHERE id = ?", ['agendada', fechaVal, empresa_id]);
            await db.query("INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, ?, ?, ?, ?, ?)", [empresa_id, 'agendada', fechaVal, req.usuario.id, data.id, finalSubject]);

            // Aprendizaje de dominios y contactos
            if (destinatarios) {
                const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];
                const correos = destinatarios.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
                
                for (const email of correos) {
                    if (email.includes('@')) {
                        const dom = '@' + email.split('@')[1];
                        if (!dominiosGenericos.includes(dom.substring(1))) {
                            await db.query("INSERT IGNORE INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)", [empresa_id, dom]);
                            
                            const [existing] = await db.query("SELECT id FROM empresa_contactos WHERE empresa_id = ? AND correo = ?", [empresa_id, email]);
                            if (existing.length === 0) {
                                await db.query("INSERT INTO empresa_contactos (empresa_id, correo, nombre) VALUES (?, ?, NULL)", [empresa_id, email]);
                            }
                        }
                    }
                }
            }
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

const obtenerEventosCalendario = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        const { start, end } = req.query;

        if (!usuarioCorreo) {
            return res.status(400).json({ error: "Usuario sin correo configurado." });
        }
        if (!start || !end) {
            return res.status(400).json({ error: "Se requieren los parámetros start y end." });
        }

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
            const errorText = await response.text();
            if (response.status === 404 || response.status === 403) {
                // If mailbox not found or no permissions, just return empty to not break the UI
                return res.status(200).json({ events: [] });
            }
            throw new Error(`Graph API Error: ${errorText}`);
        }

        const data = await response.json();
        
        // Formatear para react-big-calendar
        const events = data.value.map(item => ({
            id: item.id,
            title: item.subject,
            start: item.start.dateTime + "Z",
            end: item.end.dateTime + "Z",
            isOnlineMeeting: item.isOnlineMeeting,
            joinUrl: item.onlineMeeting?.joinUrl
        }));

        res.status(200).json({ events });

    } catch (error) {
        console.error("Error en obtenerEventosCalendario:", error);
        // Si hay error (por ej. falta de permisos temporalmente), devolvemos array vacío para que el frontend no colapse.
        res.status(200).json({ events: [] });
    }
};

const anularReunionTeams = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        const { eventId, empresa_id } = req.body;

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

        let empId = empresa_id;
        if (!empId) {
            const [rows] = await db.query("SELECT empresa_id FROM empresa_seguimiento_log WHERE reunion_id = ? ORDER BY id DESC LIMIT 1", [eventId]);
            if (rows.length > 0) empId = rows[0].empresa_id;
        }

        if (empId) {
            const fechaVal = new Date().toISOString().split('T')[0];
            await db.query("UPDATE empresas SET estado_seguimiento = ? WHERE id = ?", ['pendiente', empId]);
            
            // Buscar el asunto original para registrarlo en el log de cancelación
            const [prevLog] = await db.query(
                "SELECT asunto FROM empresa_seguimiento_log WHERE reunion_id = ? AND asunto IS NOT NULL LIMIT 1",
                [eventId]
            );
            const asuntoOriginal = prevLog.length > 0 ? prevLog[0].asunto : null;
            const asuntoCancelacion = asuntoOriginal ? `Cancelada: ${asuntoOriginal}` : "Reunión cancelada en Teams";

            await db.query(
                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'cancelada', ?, ?, ?, ?)",
                [empId, fechaVal, req.usuario.id, eventId, asuntoCancelacion]
            );
        }

        return res.status(200).json({ success: true, message: "Reunión anulada." });
    } catch (error) {
        console.error("Error en anularReunionTeams:", error);
        res.status(500).json({ error: "Error interno al anular la reunión." });
    }
};

const resolveDisplayName = async (email, dbName = '') => {
    if (!email) return '';
    email = email.trim().toLowerCase();
    
    // 1. Try to find in usuarios
    try {
        const [userRows] = await db.query("SELECT nombre FROM usuarios WHERE LOWER(correo) = ?", [email]);
        if (userRows.length > 0 && userRows[0].nombre) {
            return userRows[0].nombre;
        }
    } catch (e) {
        console.error("Error al buscar en usuarios:", e);
    }
    
    // 2. Try to find in empresa_contactos
    try {
        const [contactRows] = await db.query("SELECT nombre FROM empresa_contactos WHERE LOWER(correo) = ? AND nombre IS NOT NULL AND nombre != '' LIMIT 1", [email]);
        if (contactRows.length > 0 && contactRows[0].nombre) {
            return contactRows[0].nombre;
        }
    } catch (e) {
        console.error("Error al buscar en contactos:", e);
    }

    // 3. Fallback: If we have a name passed from Microsoft Graph, use it if it's not an email
    if (dbName && !dbName.includes('@')) {
        return dbName;
    }

    // 4. Default fallback: format username nicely (e.g. john.doe -> John Doe)
    const username = email.split('@')[0];
    return username
        .split(/[\._-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

const syncEventosPasados = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        const usuarioId = req.usuario.id;

        if (!usuarioCorreo) {
            return res.status(400).json({ error: "Usuario sin correo." });
        }

        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1).toISOString(); // 1 Enero
        const end = new Date(now.getFullYear() + 1, 0, 1).toISOString();   // 1 año futuro

        const accessToken = await getGraphToken();

        const [usuarioRows] = await db.query("SELECT sync_delta_token, ultima_sincronizacion FROM usuarios WHERE id = ?", [usuarioId]);
        const deltaToken = usuarioRows[0]?.sync_delta_token;

        let endpoint = "";
        let isDeltaRequest = false;

        if (deltaToken) {
            endpoint = deltaToken;
            isDeltaRequest = true;
        } else {
            endpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/calendarView/delta?startDateTime=${start}&endDateTime=${end}&$top=999`;
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
                    // Token expirado o inválido, forzar sincronización completa próxima vez
                    await db.query("UPDATE usuarios SET sync_delta_token = NULL WHERE id = ?", [usuarioId]);
                }
                return res.status(200).json({ success: true, message: "No se pudo sincronizar o el token expiró", events: [] });
            }

            const data = await response.json();
            
            if (data.value && data.value.length > 0) {
                allRawEvents.push(...data.value);
            }

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

        const rawEvents = allRawEvents;
        const currentEventMap = new Map();
        rawEvents.forEach(e => currentEventMap.set(e.id, e));

        const [reunionesDocs] = await db.query("SELECT id_reunion, event_id, ical_uid, fecha_reu, hora, motivo_reu, estado_envio, empresa_id, tipo_reu FROM reuniones");
        const [huerfanasDocs] = await db.query("SELECT id, event_id, ical_uid, fecha, hora, asunto, estado FROM reuniones_huerfanas WHERE usuario_id = ?", [usuarioId]);
        
        const reunionesByEventId = new Map();
        reunionesDocs.forEach(r => {
            if (r.event_id) reunionesByEventId.set(r.event_id, r);
            if (!r.event_id && r.ical_uid) reunionesByEventId.set(r.ical_uid, r);
        });

        const huerfanasByEventId = new Map();
        huerfanasDocs.forEach(r => {
            if (r.event_id) huerfanasByEventId.set(r.event_id, r);
            if (!r.event_id && r.ical_uid) huerfanasByEventId.set(r.ical_uid, r);
        });

        const [dominiosDocs] = await db.query("SELECT empresa_id, dominio FROM empresa_dominios");
        
        const formatDateStr = (val) => {
            if (!val) return "";
            if (typeof val === 'string') return val.split('T')[0];
            return val.toISOString().split('T')[0];
        };

        const todayStr = formatDateStr(now);
        let procesados = 0;

        for (const event of rawEvents) {
            const existingReunion = reunionesByEventId.get(event.id) || (event.iCalUId && reunionesByEventId.get(event.iCalUId));
            const existingHuerfana = huerfanasByEventId.get(event.id) || (event.iCalUId && huerfanasByEventId.get(event.iCalUId));

            if (event['@removed']) {
                if (existingReunion && existingReunion.estado_envio !== 'cancelada' && existingReunion.estado_envio !== 'enviado' && existingReunion.estado_envio !== 'borrador') {
                    await db.query("UPDATE reuniones SET estado_envio = 'cancelada' WHERE id_reunion = ?", [existingReunion.id_reunion]);
                    if (existingReunion.empresa_id) {
                        await db.query(
                            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'cancelada', ?, ?, ?, ?)",
                            [existingReunion.empresa_id, todayStr, usuarioId, event.id, "Eliminada desde Outlook (Delta)"]
                        );
                    }
                    procesados++;
                }
                if (existingHuerfana && existingHuerfana.estado !== 'cancelada') {
                    await db.query("UPDATE reuniones_huerfanas SET estado = 'cancelada' WHERE id = ?", [existingHuerfana.id]);
                    procesados++;
                }
                continue;
            }

            const fecha = event.start.dateTime.split('T')[0];
            const hora = event.start.dateTime.split('T')[1].substring(0,5);
            const isEventPast = new Date(event.end.dateTime + "Z") < now;
            const isCancelled = event.isCancelled || false;

            if (existingReunion) {
                const fDb = formatDateStr(existingReunion.fecha_reu);
                const hDb = existingReunion.hora ? existingReunion.hora.substring(0, 5) : "";
                
                if (isCancelled && existingReunion.estado_envio !== 'cancelada' && existingReunion.estado_envio !== 'enviado' && existingReunion.estado_envio !== 'borrador') {
                    await db.query("UPDATE reuniones SET estado_envio = 'cancelada' WHERE id_reunion = ?", [existingReunion.id_reunion]);
                    if (existingReunion.empresa_id) {
                        await db.query(
                            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'cancelada', ?, ?, ?, ?)",
                            [existingReunion.empresa_id, todayStr, usuarioId, event.id, "Cancelada desde Outlook"]
                        );
                    }
                    procesados++;
                } else if (!isCancelled && (fDb !== fecha || hDb !== hora)) {
                    await db.query("UPDATE reuniones SET fecha_reu = ?, hora = ? WHERE id_reunion = ?", [fecha, hora, existingReunion.id_reunion]);
                    if (existingReunion.empresa_id) {
                        await db.query(
                            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'reagendada', ?, ?, ?, ?)",
                            [existingReunion.empresa_id, fecha, usuarioId, event.id, "Reagendada desde Outlook"]
                        );
                    }
                    procesados++;
                }
                
                if (!isCancelled && isEventPast && existingReunion.estado_envio === 'agendada') {
                    const nuevoEstado = existingReunion.tipo_reu === 'Reunión Interna Proforma' ? 'no_aplica' : 'borrador';
                    await db.query("UPDATE reuniones SET estado_envio = ? WHERE id_reunion = ?", [nuevoEstado, existingReunion.id_reunion]);
                    procesados++;
                }
                continue;
            }

            if (existingHuerfana) {
                const fDb = formatDateStr(existingHuerfana.fecha);
                const hDb = existingHuerfana.hora ? existingHuerfana.hora.substring(0, 5) : "";
                
                if (isCancelled && existingHuerfana.estado !== 'cancelada') {
                    await db.query("UPDATE reuniones_huerfanas SET estado = 'cancelada' WHERE id = ?", [existingHuerfana.id]);
                    procesados++;
                } else if (!isCancelled && (fDb !== fecha || hDb !== hora)) {
                    await db.query("UPDATE reuniones_huerfanas SET fecha = ?, hora = ? WHERE id = ?", [fecha, hora, existingHuerfana.id]);
                    procesados++;
                }
                continue;
            }

            if (isCancelled) continue;

            const subjectLower = (event.subject || '').toLowerCase();
            const locationName = (event.location && event.location.displayName) ? event.location.displayName.toLowerCase() : '';
            const isPresencial = subjectLower.includes('presencial') || locationName.includes('presencial');
            const hasOnlineLink = event.isOnlineMeeting || (event.onlineMeeting && event.onlineMeeting.joinUrl);

            if (!hasOnlineLink && !isPresencial) continue;

            try {
                const attendees = event.attendees || [];
                const parsedAttendees = await Promise.all(attendees.map(async (a) => {
                    const email = (a.emailAddress.address || '').toLowerCase().trim();
                    if (!email) return null;
                    const name = await resolveDisplayName(email, a.emailAddress.name || '');
                    return { name, email };
                }));
                const filteredAttendees = parsedAttendees.filter(Boolean);

                const emails = filteredAttendees.map(a => a.email);
                const allInternal = emails.every(e => e.endsWith('@proforma.cl'));
                const asstStr = JSON.stringify(filteredAttendees);

                if (emails.length === 0) {
                    await db.query(
                        "INSERT INTO reuniones_huerfanas (usuario_id, event_id, asunto, fecha, hora, asistentes, estado, ical_uid) VALUES (?, ?, ?, ?, ?, ?, 'ignorado', ?)",
                        [usuarioId, event.id, event.subject || 'Sin asunto', fecha, hora, asstStr, event.iCalUId || null]
                    );
                    continue;
                }

                if (allInternal) {
                    const id_reunion = await generarIdReunion();
                    const names = filteredAttendees.map(a => a.name);
                    const linkTeams = event.onlineMeeting?.joinUrl || '';
                    const lugarStr = isPresencial ? 'Presencial' : 'Teams';
                    
                    const [empRows] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
                    const idProforma = empRows.length > 0 ? empRows[0].id : null;

                    if (idProforma) {
                        const estadoNuevo = isEventPast ? 'no_aplica' : 'agendada';
                        await db.query(
                            `INSERT IGNORE INTO reuniones (
                                id_reunion, ejecutiva_id, empresa_id, tipo_reu, fecha_reu, hora, 
                                lugar, estado_envio, enviado_a, event_id, participantes, motivo_reu, asunto_teams, ical_uid
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                id_reunion, usuarioId, idProforma, 
                                'Reunión Interna Proforma', 
                                fecha, hora, lugarStr,
                                estadoNuevo, '[]', event.id, names.join(", "),
                                event.subject || 'Sin asunto',
                                event.subject || 'Sin asunto',
                                event.iCalUId || null
                            ]
                        );
                        if (estadoNuevo === 'agendada') {
                            await db.query(
                                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'agendada', ?, ?, ?, ?)",
                                [idProforma, fecha, usuarioId, event.id, event.subject || 'Reunión Interna']
                            );
                        }
                    }
                    procesados++;
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

                if (matchedEmpresaId) {
                    const id_reunion = await generarIdReunion();
                    const names = filteredAttendees.map(a => a.name);
                    const externalEmails = emails.filter(email => !email.endsWith('@proforma.cl'));
                    const enviadoAStr = JSON.stringify(externalEmails);

                    const linkTeams = event.onlineMeeting?.joinUrl || '';
                    const lugarStr = isPresencial ? 'Presencial' : 'Teams';
                    const estadoNuevo = isEventPast ? 'borrador' : 'agendada';

                    await db.query(
                        `INSERT IGNORE INTO reuniones (
                            id_reunion, ejecutiva_id, empresa_id, tipo_reu, fecha_reu, hora, 
                            lugar, estado_envio, enviado_a, event_id, participantes, motivo_reu, asunto_teams, ical_uid
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id_reunion, usuarioId, matchedEmpresaId, 
                            '', 
                            fecha, hora, lugarStr,
                            estadoNuevo, enviadoAStr, event.id, names.join(", "),
                            event.subject || 'Sin asunto',
                            event.subject || 'Sin asunto',
                            event.iCalUId || null
                        ]
                    );

                    if (estadoNuevo === 'agendada' || estadoNuevo === 'borrador') {
                        const estadoLog = estadoNuevo === 'agendada' ? 'agendada' : 'gestionada';
                        const fechaLog = estadoNuevo === 'agendada' ? fecha : todayStr;
                        await db.query(
                            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, ?, ?, ?, ?, ?)",
                            [matchedEmpresaId, estadoLog, fechaLog, usuarioId, event.id, event.subject || 'Sin asunto']
                        );
                    }

                } else {
                    await db.query(
                        "INSERT INTO reuniones_huerfanas (usuario_id, event_id, asunto, fecha, hora, asistentes, estado, ical_uid) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)",
                        [usuarioId, event.id, event.subject || 'Sin asunto', fecha, hora, asstStr, event.iCalUId || null]
                    );
                }
                procesados++;
            } catch (eventError) {
                console.error(`Error procesando evento individual ${event.id}:`, eventError);
            }
        }

        if (!isDeltaRequest) {
            for (const [eventId, r] of reunionesByEventId.entries()) {
                if (!r.event_id) continue;
                const fDb = r.fecha_reu ? formatDateStr(r.fecha_reu) : "";
                if (fDb >= start.split('T')[0] && fDb <= end.split('T')[0]) {
                    if (!currentEventMap.has(eventId) && r.estado_envio !== 'cancelada' && r.estado_envio !== 'enviado') {
                        await db.query("UPDATE reuniones SET estado_envio = 'cancelada' WHERE id_reunion = ?", [r.id_reunion]);
                        if (r.empresa_id) {
                            await db.query(
                                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'cancelada', ?, ?, ?, ?)",
                                [r.empresa_id, todayStr, usuarioId, eventId, "Eliminada desde Outlook"]
                            );
                        }
                        procesados++;
                    }
                }
            }

            for (const [eventId, r] of huerfanasByEventId.entries()) {
                if (!r.event_id) continue;
                const fDb = r.fecha ? formatDateStr(r.fecha) : "";
                if (fDb >= start.split('T')[0] && fDb <= end.split('T')[0]) {
                    if (!currentEventMap.has(eventId) && r.estado !== 'cancelada') {
                        await db.query("UPDATE reuniones_huerfanas SET estado = 'cancelada' WHERE id = ?", [r.id]);
                        procesados++;
                    }
                }
            }
        }

        res.status(200).json({ success: true, procesados });
    } catch (error) {
        console.error("Error en syncEventosPasados:", error);
        res.status(500).json({ error: "Error interno en sincronización." });
    }
};

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

/**
 * Función auxiliar para procesar la creación de una reunión (borrador)
 * a partir de un registro de huerfana.
 */
const crearBorradorDesdeHuerfana = async (huerfana, empresa_id) => {
    const id_reunion = await generarIdReunion();

    // Parse asistentes
    let attendeesList = [];
    try {
        attendeesList = JSON.parse(huerfana.asistentes || '[]');
    } catch(e) {}

    const names = [];
    const externalEmails = [];

    for (const item of attendeesList) {
        let email = "";
        let originalName = "";

        if (typeof item === 'string') {
            email = item.trim();
        } else if (item && typeof item === 'object') {
            email = (item.email || '').trim();
            originalName = (item.name || '').trim();
        }

        if (email) {
            const resolvedName = await resolveDisplayName(email, originalName);
            names.push(resolvedName);
            if (!email.toLowerCase().endsWith('@proforma.cl')) {
                externalEmails.push(email);
            }
        }
    }

    const participantesNames = names.join(", ");
    const enviadoAStr = JSON.stringify(externalEmails);

    const subjectLower = (huerfana.asunto || '').toLowerCase();
    const isPresencial = subjectLower.includes('presencial');
    const lugarStr = isPresencial ? 'Presencial' : 'Teams';

    await db.query(
        `INSERT IGNORE INTO reuniones (
            id_reunion, ejecutiva_id, empresa_id, tipo_reu, fecha_reu, hora, 
            lugar, estado_envio, enviado_a, event_id, participantes, motivo_reu, asunto_teams, ical_uid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?, ?, ?)`,
        [
            id_reunion, huerfana.usuario_id, empresa_id, 
            '', 
            huerfana.fecha, huerfana.hora, lugarStr,
            enviadoAStr, huerfana.event_id,
            participantesNames,
            huerfana.asunto,
            huerfana.asunto,
            huerfana.ical_uid || null
        ]
    );

    await db.query("UPDATE reuniones_huerfanas SET estado = 'vinculada' WHERE id = ?", [huerfana.id]);

    if (empresa_id) {
        await db.query(
            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'gestionada', ?, ?, ?, ?)",
            [empresa_id, huerfana.fecha, huerfana.usuario_id, huerfana.event_id, huerfana.asunto || 'Sin asunto']
        );
    }
};

const vincularHuerfana = async (req, res) => {
    try {
        const { id, empresa_id, dominios } = req.body;
        const [rows] = await db.query("SELECT * FROM reuniones_huerfanas WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ error: "No encontrada" });
        const huerfanaPrincipal = rows[0];

        let vinculadasExtras = 0;

        if (empresa_id) {
            // 1. Aprender dominios y contactos de la reunión seleccionada
            let attendeesList = [];
            try {
                attendeesList = JSON.parse(huerfanaPrincipal.asistentes || '[]');
            } catch(e) {}

            const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];
            
            for (const item of attendeesList) {
                let email = "";
                let name = null;

                if (typeof item === 'string') {
                    email = item.trim().toLowerCase();
                } else if (item && typeof item === 'object') {
                    email = (item.email || '').trim().toLowerCase();
                    name = (item.name || '').trim() || null;
                }

                if (email && email.includes('@')) {
                    const dom = '@' + email.split('@')[1];
                    if (!dominiosGenericos.includes(dom.substring(1))) {
                        const shouldSaveDomain = dominios === undefined || dominios.includes(dom);
                        if (shouldSaveDomain) {
                            await db.query("INSERT IGNORE INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)", [empresa_id, dom]);
                            
                            const [existing] = await db.query("SELECT id, nombre FROM empresa_contactos WHERE empresa_id = ? AND correo = ?", [empresa_id, email]);
                            if (existing.length === 0) {
                                await db.query("INSERT INTO empresa_contactos (empresa_id, correo, nombre) VALUES (?, ?, ?)", [empresa_id, email, name]);
                            } else if (name && !existing[0].nombre) {
                                await db.query("UPDATE empresa_contactos SET nombre = ? WHERE id = ?", [name, existing[0].id]);
                            }
                        }
                    }
                }
            }

            // 3. Auto-Vincular otras huérfanas pendientes (Retro-match)
            const [dominiosDocs] = await db.query("SELECT dominio FROM empresa_dominios WHERE empresa_id = ?", [empresa_id]);
            const [contactosDocs] = await db.query("SELECT correo FROM empresa_contactos WHERE empresa_id = ?", [empresa_id]);
            
            const knownDomains = new Set(dominiosDocs.map(d => d.dominio));
            const knownEmails = new Set(contactosDocs.map(c => c.correo));

            // Buscar todas las huérfanas pendientes restantes (excluyendo la que estamos vinculando)
            const [pendientes] = await db.query("SELECT * FROM reuniones_huerfanas WHERE estado = 'pendiente' AND id != ?", [id]);

            for (const h of pendientes) {
                let hAttendees = [];
                try { hAttendees = JSON.parse(h.asistentes || '[]'); } catch(e) {}
                
                const externalDomains = new Set();
                let matchedByEmail = false;
                let matchedByDomain = false;

                for (const item of hAttendees) {
                    let email = "";
                    if (typeof item === 'string') email = item.trim().toLowerCase();
                    else if (item && typeof item === 'object') email = (item.email || '').trim().toLowerCase();

                    if (email) {
                        if (knownEmails.has(email)) {
                            matchedByEmail = true;
                        }
                        if (email.includes('@')) {
                            const dom = email.split('@')[1];
                            const domWithAt = '@' + dom;
                            if (!dominiosGenericos.includes(dom)) {
                                externalDomains.add(domWithAt);
                                if (knownDomains.has(domWithAt)) {
                                    matchedByDomain = true;
                                }
                            }
                        }
                    }
                }

                // Vinculamos solo si:
                // 1. Hay un match explícito por correo o por dominio
                // 2. Y la reunión tiene MÁXIMO UN dominio corporativo externo (si hay más de 1, requiere revisión manual)
                if ((matchedByEmail || matchedByDomain) && externalDomains.size <= 1) {
                    await crearBorradorDesdeHuerfana(h, empresa_id);
                    vinculadasExtras++;
                }
            }
        }

        // 2. Vincular la reunión principal
        await crearBorradorDesdeHuerfana(huerfanaPrincipal, empresa_id || null);

        let msj = "Reunión vinculada exitosamente.";
        if (empresa_id && vinculadasExtras > 0) {
            msj += ` Adicionalmente se auto-vincularon ${vinculadasExtras} reuniones relacionadas.`;
        }

        res.json({ success: true, message: msj });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error al vincular." });
    }
};

const descartarHuerfana = async (req, res) => {
    try {
        const { id } = req.body;
        await db.query("UPDATE reuniones_huerfanas SET estado = 'ignorado' WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error al descartar." });
    }
};

const getHuerfanas = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM reuniones_huerfanas WHERE estado = 'pendiente' AND usuario_id = ?", [req.usuario.id]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error al obtener huérfanas." });
    }
};

const desvincularBorrador = async (req, res) => {
    try {
        const { id_reunion, dominio, dominios } = req.body;
        
        // 1. Get the draft event_id
        const [reuniones] = await db.query("SELECT event_id, estado_envio, empresa_id FROM reuniones WHERE id_reunion = ?", [id_reunion]);
        if (reuniones.length === 0) {
            return res.status(404).json({ error: "Reunión no encontrada." });
        }

        const { event_id, estado_envio, empresa_id } = reuniones[0];

        if (estado_envio !== 'borrador') {
            return res.status(400).json({ error: "Solo se pueden desvincular reuniones en borrador." });
        }

        const targetDominios = Array.isArray(dominios)
            ? dominios
            : (dominio ? [dominio] : []);

        if (targetDominios.length > 0 && empresa_id) {
            for (const dom of targetDominios) {
                // Delete domain mapping if it was saved by mistake so it doesn't auto-link in the future
                await db.query("DELETE FROM empresa_dominios WHERE empresa_id = ? AND dominio = ?", [empresa_id, dom]);
            }
        }

        // Revert the orphan meeting back to pendiente
        if (event_id) {
            await db.query("UPDATE reuniones_huerfanas SET estado = 'pendiente' WHERE event_id = ?", [event_id]);
        }

        // Delete the draft from reuniones (only the selected one)
        await db.query("DELETE FROM reuniones WHERE id_reunion = ?", [id_reunion]);

        res.json({ success: true, message: "Reunión desvinculada." });
    } catch (e) {
        console.error("Error al desvincular borrador:", e);
        res.status(500).json({ error: "Error interno al desvincular borrador." });
    }
};

const debugProforma = async (req, res) => {
    try {
        const [emp] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
        const [users] = await db.query("SELECT id, correo, sync_delta_token, ultima_sincronizacion FROM usuarios LIMIT 5");
        const [reus] = await db.query("SELECT id_reunion, ejecutiva_id, tipo_reu, fecha_reu, estado_envio FROM reuniones WHERE empresa_id = ? OR estado_envio = 'agendada' ORDER BY id DESC LIMIT 50", [emp.length > 0 ? emp[0].id : null]);
        const [agendadas] = await db.query("SELECT id, reunion_id, estado, fecha FROM empresa_seguimiento_log WHERE estado = 'agendada' ORDER BY id DESC LIMIT 20");
        res.json({
            proforma_interna: emp,
            users: users,
            reuniones_agendadas_y_proforma: reus,
            logs_agendadas: agendadas
        });
    } catch (e) {
        res.json({ error: e.message });
    }
};

module.exports = {
    crearReunionTeams,
    obtenerEventosCalendario,
    anularReunionTeams,
    syncEventosPasados,
    getSyncStatus,
    vincularHuerfana,
    descartarHuerfana,
    getHuerfanas,
    desvincularBorrador,
    debugProforma
};
