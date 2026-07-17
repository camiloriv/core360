const db = require('../database/connection.js');

async function run() {
    try {
        console.log("=== LIMPIANDO ADECCO Y OTRAS REUNIONES FALSAS CANCELADAS ===");

        // 1. Delete cancelada logs from yesterday/today for meetings that are already realized
        const [logs] = await db.query(`
            SELECT * FROM empresa_seguimiento_log 
            WHERE estado = 'cancelada'
        `);
        
        let count = 0;
        for(let l of logs) {
            // Find if there is a 'gestionada' or 'concretada' log for the same ASUNTO and EMPRESA
            const [valid] = await db.query(`
                SELECT id FROM empresa_seguimiento_log 
                WHERE empresa_id = ? AND asunto = ? AND estado IN ('gestionada', 'concretada', 'enviado')
            `, [l.empresa_id, l.asunto]);

            if(valid.length > 0) {
                // False cancellation! Delete it.
                await db.query("DELETE FROM empresa_seguimiento_log WHERE id = ?", [l.id]);
                count++;
                
                // Also update the reuniones tables
                await db.query("UPDATE reuniones SET estado_envio = 'borrador' WHERE asunto = ? AND estado_envio = 'cancelada'", [l.asunto]);
                await db.query("UPDATE reuniones_huerfanas SET estado = 'vinculada' WHERE asunto = ? AND estado = 'cancelada'", [l.asunto]);
            }
        }
        
        console.log(`Eliminados ${count} logs de cancelacion invalidos.`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
