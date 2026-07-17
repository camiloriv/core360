const db = require("../database/connection");

async function check() {
    const [rows] = await db.query("SELECT id, correo FROM usuarios WHERE correo LIKE '%camilo%'");
    console.log(rows);
    process.exit(0);
}
check();
