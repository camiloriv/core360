require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function check() {
    const [rows] = await db.query("SELECT id_reunion, estado_envio FROM reuniones WHERE id_reunion LIKE 'REU-INT-%' LIMIT 10");
    console.log(rows);
    process.exit(0);
}
check();
