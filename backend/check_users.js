const db = require("./database/connection");

async function checkUsers() {
    try {
        const [usuarios] = await db.query("SELECT id, nombre, correo, permisos, jefatura_id FROM usuarios WHERE nombre LIKE '%karina%' OR nombre LIKE '%beatriz%'");
        console.log("Usuarios:", usuarios);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkUsers();
