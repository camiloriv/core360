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
        const start = "2026-01-01T00:00:00.000Z";
        const now = new Date();
        const end = new Date(now.getFullYear() + 1, 0, 1).toISOString();
        
        let url = `https://graph.microsoft.com/v1.0/users/crivera@proforma.cl/calendarView/delta?startDateTime=${start}&endDateTime=${end}`;
        let allEvents = [];
        
        while(url) {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.value) allEvents.push(...data.value);
            
            if (data['@odata.nextLink']) {
                url = data['@odata.nextLink'];
            } else {
                url = null;
            }
        }
        
        console.log("Total events in delta full sync:", allEvents.length);
        const teamMeetings = allEvents.filter(e => e.subject && e.subject.toLowerCase() === 'reunión equipo ');
        console.log("Reunión Equipo dates:");
        teamMeetings.forEach(e => console.log(e.start.dateTime));
        
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
