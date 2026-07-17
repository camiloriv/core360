require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function check() {
    try {
        const [desc] = await db.query("DESCRIBE seguimiento_logs");
        console.log(desc);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
