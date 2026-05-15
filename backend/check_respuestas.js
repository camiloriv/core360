const pool = require('./database/connection.js');

async function check() {
    try {
        const [resp] = await pool.query("SHOW CREATE TABLE respuestas");
        console.log(resp[0]['Create Table']);
        
        const [reun] = await pool.query("SHOW CREATE TABLE reuniones");
        console.log(reun[0]['Create Table']);

        const [evals] = await pool.query("SHOW TABLES LIKE 'eval%'");
        console.log("Tables like eval:", evals);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
