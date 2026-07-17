require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function check() {
    try {
        const [reuniones] = await db.query(`
            SELECT id_reunion, estado_envio, event_id
            FROM reuniones
            WHERE estado_envio = 'enviado' AND event_id IS NOT NULL
        `);
        console.log("Reuniones reales enviadas:", reuniones.length);
        console.log(reuniones);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
