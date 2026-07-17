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
        const start = '2026-06-01T00:00:00Z';
        const end = '2026-07-14T00:00:00Z';
        const url = `https://graph.microsoft.com/v1.0/users/crivera@proforma.cl/calendarView?startDateTime=${start}&endDateTime=${end}&$top=1000`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const events = data.value
            .filter(e => e.subject === 'Reunión Equipo ')
            .map(e => ({
                subject: e.subject,
                start: e.start.dateTime,
                id: e.id,
                iCalUId: e.iCalUId
            }));
        console.log(JSON.stringify(events, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
