const db = require("./database/connection");

async function checkGerencias() {
    try {
        const [rows] = await db.query("SELECT * FROM usuario_gerencias WHERE gerencia_id = 38");
        console.log("Usuarios bajo gerencia 38 (Karina):", rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkGerencias();
