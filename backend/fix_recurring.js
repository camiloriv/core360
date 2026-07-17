require('dotenv').config();
const db = require('./database/connection');

const getToken = async () => {
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
    const data = await response.json();
    return data.access_token;
};

const formatDate = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString).toISOString().split('T')[0];
};

const formatTime = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString).toISOString().split('T')[1].substring(0, 8);
};

const resolveDisplayName = async (email, providedName) => {
    try {
        const [rows] = await db.query("SELECT nombre FROM empresa_contactos WHERE correo = ?", [email]);
        if (rows.length > 0) return rows[0].nombre;
        const [userRows] = await db.query("SELECT nombre FROM usuarios WHERE correo = ?", [email]);
        if (userRows.length > 0) return userRows[0].nombre;
        return providedName || email;
    } catch (error) {
        return providedName || email;
    }
};

(async () => {
    try {
        console.log("Iniciando fix de sincronización...");
        const token = await getToken();
        const start = '2026-07-01T00:00:00Z';
        const end = '2026-12-31T23:59:59Z';
        // USAMOS calendarView normal (SIN DELTA) para evitar el bug de Graph API con reuniones recurrentes
        let url = `https://graph.microsoft.com/v1.0/users/crivera@proforma.cl/calendarView?startDateTime=${start}&endDateTime=${end}&$top=100`;
        
        const allEvents = [];
        while(url) {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.value) allEvents.push(...data.value);
            url = data['@odata.nextLink'] || null;
        }
        
        console.log(`Descargados ${allEvents.length} eventos desde Graph (Normal).`);
        
        const [dominiosDocs] = await db.query("SELECT empresa_id, dominio FROM empresa_dominios");
        const [proformaEmp] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA' LIMIT 1");
        const proformaEmpId = proformaEmp.length > 0 ? proformaEmp[0].id : null;
        const usuarioId = 9;
        
        let procesados = 0;
        
        for(const event of allEvents) {
            if (!event.subject || !event.subject.toLowerCase().includes('equipo')) continue;
            
            const fecha = formatDate(event.start.dateTime);
            const hora = formatTime(event.start.dateTime);
            const horaFin = formatTime(event.end.dateTime);
            const isEventPast = new Date(event.end.dateTime + "Z") < new Date();
            
            const subjectLower = event.subject.toLowerCase();
            const locationName = (event.location && event.location.displayName) ? event.location.displayName.toLowerCase() : '';
            const isPresencial = subjectLower.includes('presencial') || locationName.includes('presencial');
            const hasOnlineLink = event.isOnlineMeeting || (event.onlineMeeting && event.onlineMeeting.joinUrl);
            
            if (!hasOnlineLink && !isPresencial) continue;
            
            const attendees = event.attendees || [];
            const parsedAttendees = await Promise.all(attendees.map(async (a) => {
                const email = (a.emailAddress.address || '').toLowerCase().trim();
                if (!email) return null;
                const name = await resolveDisplayName(email, a.emailAddress.name || '');
                return { name, email, response: a.status?.response || 'none', type: a.type || 'required' };
            }));
            const filteredAttendees = parsedAttendees.filter(Boolean);
            const emails = filteredAttendees.map(a => a.email);
            if (emails.length === 0) continue;
            
            const organizerEmail = (event.organizer?.emailAddress?.address || '').toLowerCase().trim();
            const organizerName = event.organizer?.emailAddress?.name || '';
            const organizador = organizerEmail ? { name: organizerName, email: organizerEmail } : null;
            
            let matchedEmpresaId = null;
            const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];
            const externalDomains = new Set();
            for (const email of emails) {
                if (email.includes('@')) {
                    const dom = email.split('@')[1].toLowerCase();
                    if (!dominiosGenericos.includes(dom)) externalDomains.add('@' + dom);
                }
            }
            if (externalDomains.size === 1) {
                const domain = [...externalDomains][0];
                const match = dominiosDocs.find(d => d.dominio === domain);
                if (match) matchedEmpresaId = match.empresa_id;
            }
            if (!matchedEmpresaId) {
                for (const email of emails) {
                    if (!email.endsWith('@proforma.cl')) {
                        const [contactMatch] = await db.query("SELECT empresa_id FROM empresa_contactos WHERE correo = ? LIMIT 1", [email]);
                        if (contactMatch.length > 0) {
                            matchedEmpresaId = contactMatch[0].empresa_id;
                            break;
                        }
                    }
                }
            }
            
            const PROFORMA_DOMAINS = ['@proforma.cl', '@oticproforma.cl'];
            const allEmailsForProformaCheck = [...emails];
            if (organizerEmail) allEmailsForProformaCheck.push(organizerEmail);
            const isPurelyProforma = allEmailsForProformaCheck.every(email => PROFORMA_DOMAINS.some(d => email.toLowerCase().endsWith(d)));
            if (isPurelyProforma && proformaEmpId) matchedEmpresaId = proformaEmpId;
            
            const estado = isEventPast ? 'pasada' : 'agendada';
            const asistentesJson = JSON.stringify(filteredAttendees);
            const organizadorJson = organizador ? JSON.stringify(organizador) : null;
            const joinUrl = event.onlineMeeting?.joinUrl || null;
            const es_online = isPresencial ? 0 : 1;
            
            let [existing] = await db.query("SELECT id FROM teams_eventos WHERE ical_uid = ? AND fecha = ? LIMIT 1", [event.iCalUId, fecha]);
            if (existing.length === 0) {
                [existing] = await db.query("SELECT id FROM teams_eventos WHERE event_id = ? LIMIT 1", [event.id]);
            }
            
            if (existing.length === 0) {
                console.log(`Insertando reunión faltante: ${event.subject} | ${fecha} ${hora}`);
                await db.query(`
                    INSERT INTO teams_eventos 
                    (event_id, ical_uid, usuario_id, empresa_id, asunto, fecha, hora, hora_fin, estado, asistentes, join_url, es_online, ultima_sync, organizador, body_preview)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
                `, [
                    event.id, event.iCalUId || null, usuarioId, matchedEmpresaId, event.subject || 'Sin asunto',
                    fecha, hora, horaFin, estado, asistentesJson, joinUrl, es_online, organizadorJson, event.bodyPreview || ''
                ]);
                procesados++;
            }
        }
        console.log(`Fix completado. Se insertaron ${procesados} reuniones faltantes.`);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
