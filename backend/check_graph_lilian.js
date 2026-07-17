require('dotenv').config();
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
        const start = '2026-07-01T00:00:00Z';
        const end = '2026-07-31T23:59:59Z';
        const url = `https://graph.microsoft.com/v1.0/users/lortega@proforma.cl/calendarView?startDateTime=${start}&endDateTime=${end}&$top=1000`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.error) {
            console.error(data.error);
        } else {
            const events = data.value
                .filter(e => e.subject && e.subject.toLowerCase().includes('equipo'))
                .map(e => ({
                    subject: e.subject,
                    start: e.start.dateTime,
                    id: e.id
                }));
            console.log("Lilian's equipo meetings in July 2026 directly from Graph API:");
            console.log(JSON.stringify(events, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
