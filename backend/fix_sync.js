const db = require("./database/connection");

async function fixSync() {
    try {
        console.log("Limpiando delta_token de usuario 9 (Camilo)...");
        await db.query("UPDATE usuarios SET sync_delta_token = NULL WHERE id = 9");
        console.log("Token limpiado. Ahora puedes ejecutar la sincronización nuevamente.");
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
fixSync();
