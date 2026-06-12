require("dotenv").config();
const db = require("../../database/connection");

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

        const { empresa_id, destinatarios, asistentes_internos, fecha, hora, duracion, asunto, detalle } = req.body;

        // Parse dateTime and calculate end time
        // fecha = YYYY-MM-DD, hora = HH:mm
        const startDateTime = new Date(`${fecha}T${hora}:00`);
        const endDateTime = new Date(startDateTime.getTime() + parseInt(duracion) * 60000);

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

        const eventPayload = {
            subject: asunto,
            body: {
                contentType: "HTML",
                content: detalle || "Reunión generada desde CORE 360"
            },
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: "UTC"
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: "UTC"
            },
            attendees: attendees,
            isOnlineMeeting: true,
            onlineMeetingProvider: "teamsForBusiness"
        };

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
            const fechaVal = startDateTime.toISOString().split('T')[0];
            await db.query("UPDATE empresas SET estado_seguimiento = ?, fecha_concretada = ? WHERE id = ?", ['agendada', fechaVal, empresa_id]);
            await db.query("INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id) VALUES (?, ?, ?, ?, ?)", [empresa_id, 'agendada', fechaVal, req.usuario.id, data.id]);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: "Reunión agendada en Teams",
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
        const endpoint = `https://graph.microsoft.com/v1.0/users/${usuarioCorreo}/calendarView?startDateTime=${start}&endDateTime=${end}&$top=100`;

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
            await db.query("INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id) VALUES (?, ?, ?, ?, ?)", [empId, 'cancelada', fechaVal, req.usuario.id, eventId]);
        }

        return res.status(200).json({ success: true, message: "Reunión anulada." });
    } catch (error) {
        console.error("Error en anularReunionTeams:", error);
        res.status(500).json({ error: "Error interno al anular la reunión." });
    }
};

module.exports = {
    crearReunionTeams,
    obtenerEventosCalendario,
    anularReunionTeams
};
