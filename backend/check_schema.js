const pool = require('./database/connection.js');

async function check() {
    try {
        const [rows] = await pool.query("SHOW CREATE TABLE empresas");
        console.log(rows[0]['Create Table']);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
