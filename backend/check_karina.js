const db = require("./database/connection");

async function checkKarina() {
    try {
        const [rows] = await db.query("SELECT * FROM usuarios WHERE id = 38");
        console.log("Karina:", rows[0]);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkKarina();
