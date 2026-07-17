require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function cleanup() {
    try {
        const [result] = await db.query(`
            DELETE FROM reuniones
            WHERE event_id IS NULL OR event_id = ''
        `);
        console.log("Registros artificiales eliminados:", result.affectedRows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
cleanup();
