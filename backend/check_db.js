const db = require("./database/connection");
async function test() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM reuniones WHERE Field='empresa_id'");
        console.log(rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
