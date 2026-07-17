const db = require("./database/connection");

async function checkSchema() {
    try {
        const [empresas] = await db.query("DESCRIBE empresas");
        console.log("Empresas:", empresas.map(c => c.Field));
        const [zonas] = await db.query("SELECT * FROM zonas");
        console.log("Zonas:", zonas);
        const [usuarios] = await db.query("SELECT id, nombre, correo, permisos FROM usuarios LIMIT 5");
        console.log("Usuarios:", usuarios);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkSchema();
