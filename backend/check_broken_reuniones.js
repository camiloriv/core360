const pool = require('./database/connection.js');

async function check() {
    try {
        const [reuniones] = await pool.query(`
            SELECT r.id_reunion, r.ejecutiva_id, u.nombre as usuario_nombre
            FROM reuniones r
            LEFT JOIN usuarios u ON r.ejecutiva_id = u.id
            WHERE u.nombre IS NULL
        `);
        console.log("REUNIONES CON EJECUTIVA_ID SIN NOMBRE EN USUARIOS:");
        console.table(reuniones);
        
        process.exit();
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
