const db = require("../database/connection");

async function debug() {
    try {
        console.log("--- Querying all active users ---");
        const [users] = await db.query(
            "SELECT id, nombre, correo, permisos, ultima_sincronizacion FROM usuarios WHERE estado = 'activo' OR estado IS NULL"
        );
        console.log("Users:", JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("Error debugging:", err);
    } finally {
        process.exit(0);
    }
}

debug();
