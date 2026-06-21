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
        const start = "2026-01-01T00:00:00Z";
        const end = now.toISOString();

        const accessToken = await getGraphToken();
        const endpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/calendarView?startDateTime=${start}&endDateTime=${end}&$top=999`;

        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Prefer": "outlook.timezone=\"UTC\""
            }
        });

        if (!response.ok) {
            return res.status(200).json({ success: true, message: "No se pudo sincronizar", events: [] });
        }

        const data = await response.json();
        const rawEvents = data.value || [];
        const currentEventIds = new Set(rawEvents.map(e => e.id));

        // Cleanup: eliminar reuniones huérfanas que fueron eliminadas de Outlook
        try {
            const [dbHuerfanas] = await db.query(
                "SELECT event_id FROM reuniones_huerfanas WHERE usuario_id = ? AND estado IN ('pendiente', 'ignorado') AND fecha >= '2026-01-01'",
                [usuarioId]
            );
            for (const row of dbHuerfanas) {
                if (row.event_id && !currentEventIds.has(row.event_id)) {
                    console.log(`Sync Cleanup: Deleting deleted Outlook event ${row.event_id} from huerfanas`);
                    await db.query(
                        "DELETE FROM reuniones_huerfanas WHERE usuario_id = ? AND event_id = ? AND estado IN ('pendiente', 'ignorado')",
                        [usuarioId, row.event_id]
                    );
                }
            }
        } catch (cleanupError) {
            console.error("Error during sync huerfanas cleanup:", cleanupError);
        }

        const pastEvents = rawEvents.filter(e => new Date(e.end.dateTime + "Z") < now);

        if (pastEvents.length === 0) {
            return res.status(200).json({ success: true, procesados: 0 });
        }

        const [reunionesDocs] = await db.query("SELECT event_id, ical_uid, fecha_reu, hora, motivo_reu FROM reuniones");
        const [huerfanasDocs] = await db.query("SELECT event_id, ical_uid, fecha, hora, asunto FROM reuniones_huerfanas");
        
        const processedIds = new Set();
        const processedICalUIds = new Set();
        const processedSignatures = new Set();

        const formatDateStr = (val) => {
            if (!val) return "";
            if (typeof val === 'string') return val.split('T')[0];
            return val.toISOString().split('T')[0];
        };

        reunionesDocs.forEach(r => {
            if (r.event_id) processedIds.add(r.event_id);
            if (r.ical_uid) processedICalUIds.add(r.ical_uid);
            if (r.fecha_reu && r.hora && r.motivo_reu) {
                const f = formatDateStr(r.fecha_reu);
                const h = r.hora.substring(0, 5);
                processedSignatures.add(`${f}|${h}|${r.motivo_reu.toLowerCase().trim()}`);
            }
        });

        huerfanasDocs.forEach(r => {
            if (r.event_id) processedIds.add(r.event_id);
            if (r.ical_uid) processedICalUIds.add(r.ical_uid);
            if (r.fecha && r.hora && r.asunto) {
                const f = formatDateStr(r.fecha);
                const h = r.hora.substring(0, 5);
                processedSignatures.add(`${f}|${h}|${r.asunto.toLowerCase().trim()}`);
            }
        });

        const [dominiosDocs] = await db.query("SELECT empresa_id, dominio FROM empresa_dominios");
        
        let procesados = 0;

        for (const event of pastEvents) {
            const fecha = event.start.dateTime.split('T')[0];
            const hora = event.start.dateTime.split('T')[1].substring(0,5);
            const rawSubject = event.subject || 'Sin asunto';
            const signature = `${fecha}|${hora}|${rawSubject.toLowerCase().trim()}`;

            if (processedIds.has(event.id) || 
               (event.iCalUId && processedICalUIds.has(event.iCalUId)) ||
               processedSignatures.has(signature)) {
                continue;
            }

            const subjectLower = (event.subject || '').toLowerCase();
            const locationName = (event.location && event.location.displayName) ? event.location.displayName.toLowerCase() : '';
            const isPresencial = subjectLower.includes('presencial') || locationName.includes('presencial');
            const hasOnlineLink = event.isOnlineMeeting || (event.onlineMeeting && event.onlineMeeting.joinUrl);

            // Ignorar reuniones que no tengan un enlace de Teams y tampoco indiquen ser presenciales
            if (!hasOnlineLink && !isPresencial) {
                continue;
            }

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

                if (emails.length === 0 || allInternal) {
                    await db.query(
                        "INSERT INTO reuniones_huerfanas (usuario_id, event_id, asunto, fecha, hora, asistentes, estado, ical_uid) VALUES (?, ?, ?, ?, ?, ?, 'ignorado', ?)",
                        [usuarioId, event.id, event.subject || 'Sin asunto', event.start.dateTime.split('T')[0], event.start.dateTime.split('T')[1].substring(0,5), asstStr, event.iCalUId || null]
                    );
                    if (event.iCalUId) processedICalUIds.add(event.iCalUId);
                    continue;
                }

                let matchedEmpresaId = null;
                for (const email of emails) {
                    const domain = '@' + email.split('@')[1];
                    const match = dominiosDocs.find(d => d.dominio === domain);
                    if (match) {
                        matchedEmpresaId = match.empresa_id;
                        break;
                    }
                }

                // La fecha y hora ya fueron extraídas arriba

                if (matchedEmpresaId) {
                    const id_reunion = await generarIdReunion();

                    const names = filteredAttendees.map(a => a.name);
                    const externalEmails = emails.filter(email => !email.endsWith('@proforma.cl'));
                    const enviadoAStr = JSON.stringify(externalEmails);

                    const linkTeams = event.onlineMeeting?.joinUrl || '';
                    const lugarStr = isPresencial ? 'Presencial' : linkTeams;

                    await db.query(
                        `INSERT IGNORE INTO reuniones (
                            id_reunion, ejecutiva_id, empresa_id, tipo_reu, fecha_reu, hora, 
                            lugar, estado_envio, enviado_a, event_id, participantes, motivo_reu, asunto_teams, ical_uid
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?, ?, ?)`,
                        [
                            id_reunion, usuarioId, matchedEmpresaId, 
                            '', 
                            fecha, hora, lugarStr,
                            enviadoAStr, event.id, names.join(", "),
                            event.subject || 'Sin asunto',
                            event.subject || 'Sin asunto',
                            event.iCalUId || null
                        ]
                    );
                    if (event.iCalUId) processedICalUIds.add(event.iCalUId);
                } else {
                    await db.query(
                        "INSERT INTO reuniones_huerfanas (usuario_id, event_id, asunto, fecha, hora, asistentes, estado, ical_uid) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)",
                        [usuarioId, event.id, event.subject || 'Sin asunto', fecha, hora, asstStr, event.iCalUId || null]
                    );
                    if (event.iCalUId) processedICalUIds.add(event.iCalUId);
                }
                procesados++;
            } catch (eventError) {
                console.error(`Error procesando evento individual ${event.id}:`, eventError);
            }
        }

        res.status(200).json({ success: true, procesados });
    } catch (error) {
        console.error("Error en syncEventosPasados:", error);
        res.status(500).json({ error: "Error interno en sincronización." });
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
    const lugarStr = isPresencial ? 'Presencial' : '';

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

            // Buscar todas las huérfanas pendientes restantes
            const [pendientes] = await db.query("SELECT * FROM reuniones_huerfanas WHERE estado = 'pendiente'");

            for (const h of pendientes) {
                let hAttendees = [];
                try { hAttendees = JSON.parse(h.asistentes || '[]'); } catch(e) {}
                
                let matched = false;
                for (const item of hAttendees) {
                    let email = "";
                    if (typeof item === 'string') email = item.trim().toLowerCase();
                    else if (item && typeof item === 'object') email = (item.email || '').trim().toLowerCase();

                    if (email) {
                        if (knownEmails.has(email)) {
                        matched = true;
                        break;
                    }
                    if (email.includes('@')) {
                        const dom = '@' + email.split('@')[1];
                        if (knownDomains.has(dom)) {
                            matched = true;
                            break;
                        }
                    }
                }
            }

            if (matched) {
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
            let totalDesvinculadas = 0;
            for (const dom of targetDominios) {
                // Delete domain mapping if it was saved by mistake
                await db.query("DELETE FROM empresa_dominios WHERE empresa_id = ? AND dominio = ?", [empresa_id, dom]);

                // Find all borrador meetings of this company with this domain
                const [relacionadas] = await db.query(
                    "SELECT id_reunion, event_id FROM reuniones WHERE empresa_id = ? AND estado_envio = 'borrador' AND enviado_a LIKE ?", 
                    [empresa_id, `%${dom}%`]
                );

                for (const rel of relacionadas) {
                    if (rel.event_id) {
                        await db.query("UPDATE reuniones_huerfanas SET estado = 'pendiente' WHERE event_id = ?", [rel.event_id]);
                    }
                    await db.query("DELETE FROM reuniones WHERE id_reunion = ?", [rel.id_reunion]);
                }
                totalDesvinculadas += relacionadas.length;
            }

            // Also make sure the current meeting itself is unlinked if it wasn't already in the loop
            const [stillExists] = await db.query("SELECT id_reunion FROM reuniones WHERE id_reunion = ?", [id_reunion]);
            if (stillExists.length > 0) {
                if (event_id) {
                    await db.query("UPDATE reuniones_huerfanas SET estado = 'pendiente' WHERE event_id = ?", [event_id]);
                }
                await db.query("DELETE FROM reuniones WHERE id_reunion = ?", [id_reunion]);
                totalDesvinculadas++;
            }

            return res.json({ success: true, message: `Se desvincularon ${totalDesvinculadas} reuniones.` });
        } else {
            // Revert the orphan meeting back to pendiente
            if (event_id) {
                await db.query("UPDATE reuniones_huerfanas SET estado = 'pendiente' WHERE event_id = ?", [event_id]);
            }

            // 3. Delete the draft from reuniones
            await db.query("DELETE FROM reuniones WHERE id_reunion = ?", [id_reunion]);

            res.json({ success: true });
        }
    } catch (e) {
        console.error("Error al desvincular borrador:", e);
        res.status(500).json({ error: "Error interno al desvincular borrador." });
    }
};

module.exports = {
    crearReunionTeams,
    obtenerEventosCalendario,
    anularReunionTeams,
    syncEventosPasados,
    vincularHuerfana,
    descartarHuerfana,
    getHuerfanas,
    desvincularBorrador
};
