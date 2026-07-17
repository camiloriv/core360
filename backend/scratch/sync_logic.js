const syncEventosPasados = async (req, res) => {
    try {
        const usuarioCorreo = req.usuario.correo;
        const usuarioId = req.usuario.id;

        if (!usuarioCorreo) {
            return res.status(400).json({ error: "Usuario sin correo." });
        }

        const now = new Date();
        const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 3 meses atras
        const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();   // 3 meses a futuro

        const accessToken = await getGraphToken();
        const endpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/calendarView?startDateTime=${start}&endDateTime=${end}&$top=999`;

        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Prefer": "outlook.timezone=\"America/Santiago\""
            }
        });

        if (!response.ok) {
            return res.status(200).json({ success: true, message: "No se pudo sincronizar", events: [] });
        }

        const data = await response.json();
        const rawEvents = data.value || [];
        const currentEventMap = new Map();
        rawEvents.forEach(e => currentEventMap.set(e.id, e));

        const [reunionesDocs] = await db.query("SELECT id_reunion, event_id, ical_uid, fecha_reu, hora, motivo_reu, estado_envio, empresa_id FROM reuniones");
        const [huerfanasDocs] = await db.query("SELECT id, event_id, ical_uid, fecha, hora, asunto, estado FROM reuniones_huerfanas WHERE usuario_id = ?", [usuarioId]);
        
        const reunionesByEventId = new Map();
        reunionesDocs.forEach(r => {
            if (r.event_id) reunionesByEventId.set(r.event_id, r);
            if (!r.event_id && r.ical_uid) reunionesByEventId.set(r.ical_uid, r); // Fallback to ical_uid if event_id is null
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

        // 1. Process all fetched events from Graph API
        for (const event of rawEvents) {
            const fecha = event.start.dateTime.split('T')[0];
            const hora = event.start.dateTime.split('T')[1].substring(0,5);
            const isEventPast = new Date(event.end.dateTime + "Z") < now;
            const isCancelled = event.isCancelled || false;
            
            const existingReunion = reunionesByEventId.get(event.id) || reunionesByEventId.get(event.iCalUId);
            const existingHuerfana = huerfanasByEventId.get(event.id) || huerfanasByEventId.get(event.iCalUId);

            // Si ya existe en reuniones
            if (existingReunion) {
                const fDb = formatDateStr(existingReunion.fecha_reu);
                const hDb = existingReunion.hora ? existingReunion.hora.substring(0, 5) : "";
                
                if (isCancelled && existingReunion.estado_envio !== 'cancelada') {
                    // Update as cancelled
                    await db.query("UPDATE reuniones SET estado_envio = 'cancelada' WHERE id_reunion = ?", [existingReunion.id_reunion]);
                    if (existingReunion.empresa_id) {
                        await db.query(
                            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'cancelada', ?, ?, ?, ?)",
                            [existingReunion.empresa_id, todayStr, usuarioId, event.id, "Cancelada desde Outlook"]
                        );
                    }
                    procesados++;
                } else if (!isCancelled && (fDb !== fecha || hDb !== hora)) {
                    // Reagendamiento
                    // We only log reagendamiento if it is not cancelled
                    await db.query("UPDATE reuniones SET fecha_reu = ?, hora = ? WHERE id_reunion = ?", [fecha, hora, existingReunion.id_reunion]);
                    if (existingReunion.empresa_id) {
                        await db.query(
                            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'reagendada', ?, ?, ?, ?)",
                            [existingReunion.empresa_id, fecha, usuarioId, event.id, "Reagendada desde Outlook"]
                        );
                    }
                    procesados++;
                }
                
                // Si la reunión era 'agendada' pero ya pasó de la fecha, la pasamos a 'borrador' (o 'no_aplica' si es interna)
                if (!isCancelled && isEventPast && existingReunion.estado_envio === 'agendada') {
                    const nuevoEstado = existingReunion.tipo_reu === 'Reunión Interna Proforma' ? 'no_aplica' : 'borrador';
                    await db.query("UPDATE reuniones SET estado_envio = ? WHERE id_reunion = ?", [nuevoEstado, existingReunion.id_reunion]);
                    procesados++;
                }
                continue;
            }

            // Si ya existe en huerfanas
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

            // Es un evento NUEVO
            if (isCancelled) continue; // Si es nuevo y esta cancelado, lo ignoramos

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
                        // Log tracking for agendada
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
                // Solo auto-vincular si hay exactamente UN dominio corporativo externo
                if (externalDomains.size === 1) {
                    const domain = [...externalDomains][0];
                    const match = dominiosDocs.find(d => d.dominio === domain);
                    if (match) {
                        matchedEmpresaId = match.empresa_id;
                    }
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

                    // Log tracking
                    if (estadoNuevo === 'agendada' || estadoNuevo === 'borrador') {
                        // Si es pasada (borrador) lo registramos como gestionada en el log, si es futura (agendada) como agendada.
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

        // 2. Detectar eliminaciones en Outlook (Reuniones en BD que cayeron en el rango de busqueda pero no estan en Graph)
        // Only checking events within the [start, end] window. 
        // We only check `event_id` because Graph API deletes them entirely.
        for (const [eventId, r] of reunionesByEventId.entries()) {
            if (!r.event_id) continue;
            // Si la reunion esta dentro del rango temporal que consultamos
            const fDb = r.fecha_reu ? formatDateStr(r.fecha_reu) : "";
            if (fDb >= start.split('T')[0] && fDb <= end.split('T')[0]) {
                if (!currentEventMap.has(eventId) && r.estado_envio !== 'cancelada' && r.estado_envio !== 'enviado') {
                    // It was deleted from Outlook!
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

        res.status(200).json({ success: true, procesados });
    } catch (error) {
        console.error("Error en syncEventosPasados:", error);
        res.status(500).json({ error: "Error interno en sincronización." });
    }
};
