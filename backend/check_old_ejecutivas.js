const pool = require('./database/connection.js');

async function check() {
    try {
        const [oldEjecutivas] = await pool.query('SELECT * FROM ejecutivas');
        const [usuarios] = await pool.query('SELECT id, nombre FROM usuarios');
        
        console.log("ANTIGUAS EJECUTIVAS:");
        console.table(oldEjecutivas);
        
        console.log("NUEVOS USUARIOS:");
        console.table(usuarios);
        
        process.exit();
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
