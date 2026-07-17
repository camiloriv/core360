require('dotenv').config();
const db = require('../database/connection');

const getGraphToken = async () => {
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

(async () => {
    try {
        const token = await getGraphToken();
        const [rows] = await db.query("SELECT sync_delta_token FROM usuarios WHERE correo = 'crivera@proforma.cl'");
        const deltaToken = rows[0].sync_delta_token;
        console.log("Delta token exists:", !!deltaToken);

        if (!deltaToken) process.exit(0);

        const res = await fetch(deltaToken, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log("Delta events count:", data.value ? data.value.length : 0);
        
        if (data.value) {
            const filtered = data.value.filter(e => e.subject && e.subject.includes('Reunión Equipo'));
            console.log("Reunión Equipo events in delta:", JSON.stringify(filtered.map(e => ({
                id: e.id,
                subject: e.subject,
                start: e.start?.dateTime,
                iCalUId: e.iCalUId
            })), null, 2));
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
