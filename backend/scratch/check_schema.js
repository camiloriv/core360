require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function checkSchema() {
    try {
        const [rows] = await db.query("DESCRIBE reuniones");
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkSchema();
