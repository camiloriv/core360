const db = require("./database/connection");

async function checkSync() {
    try {
        const [rows] = await db.query(`SELECT id, event_id, fecha, hora, asunto FROM teams_eventos WHERE fecha = '2026-07-13'`);
        console.log("All meetings on 13-07 in teams_eventos:", rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkSync();
