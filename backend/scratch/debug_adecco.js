const db = require('../database/connection.js');

async function run() {
    try {
        const [logs] = await db.query(`
            SELECT l.id, l.estado, l.fecha, l.reunion_id, l.asunto
            FROM empresa_seguimiento_log l
            WHERE l.asunto LIKE '%Adecco%'
        `);
        console.log("Adecco Logs:");
        console.log(logs);

        const [reuniones] = await db.query(`SELECT id_reunion, estado_envio, asunto, event_id FROM reuniones WHERE asunto LIKE '%Adecco%'`);
        console.log("Reuniones Adecco:");
        console.log(reuniones);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
