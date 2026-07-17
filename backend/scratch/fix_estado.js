require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function fixEstado() {
    try {
        await db.query("UPDATE reuniones SET estado_envio = 'no_aplica' WHERE estado_envio = 'no aplica'");
        console.log("Estados corregidos a 'no_aplica'.");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
fixEstado();
