require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function createProforma() {
    try {
        await db.query("INSERT INTO empresas (nombre) VALUES (?)", [
            'PROFORMA INTERNA'
        ]);
        console.log("Empresa PROFORMA INTERNA creada.");
        
        const [emp] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
        console.log("ID:", emp[0].id);
        
        await db.query("INSERT INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)", [emp[0].id, '@proforma.cl']);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
createProforma();
