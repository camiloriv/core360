require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function checkProforma() {
    try {
        const [rows] = await db.query("SELECT * FROM empresas WHERE nombre LIKE '%proforma%'");
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkProforma();
