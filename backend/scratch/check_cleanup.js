require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function check() {
    try {
        const [reuniones] = await db.query(`
            SELECT id_reunion, estado_envio, event_id, minuta
            FROM reuniones
            WHERE estado_envio = 'enviado' OR event_id IS NULL OR event_id = ''
        `);
        console.log("Reuniones encontradas:", reuniones.length);
        console.log("Ejemplos:");
        console.log(reuniones.slice(0, 5));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
