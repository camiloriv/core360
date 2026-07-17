const db = require('../database/connection.js');

async function run() {
    try {
        console.log("=== RESTAURANDO REUNIONES CANCELADAS ===");

        // Get the meeting from reuniones
        const [reuniones] = await db.query(`
            SELECT id_reunion, event_id, asunto_teams, motivo_reu FROM reuniones 
            WHERE (asunto_teams LIKE '%Adecco%' OR motivo_reu LIKE '%Adecco%') 
            AND estado_envio = 'cancelada'
        `);

        for (const reu of reuniones) {
            console.log("Restaurando:", reu.id_reunion);
            await db.query("UPDATE reuniones SET estado_envio = 'borrador' WHERE id_reunion = ?", [reu.id_reunion]);
            
            if (reu.event_id) {
                // Delete its cancellation logs
                await db.query("DELETE FROM empresa_seguimiento_log WHERE reunion_id = ? AND estado = 'cancelada'", [reu.event_id]);
                console.log("Logs eliminados para event_id:", reu.event_id);
            }
        }
        
        // Also huerfanas
        const [huerfanas] = await db.query(`
            SELECT id, event_id FROM reuniones_huerfanas 
            WHERE asunto LIKE '%Adecco%' AND estado = 'cancelada'
        `);
        for (const h of huerfanas) {
            console.log("Restaurando huerfana:", h.id);
            await db.query("UPDATE reuniones_huerfanas SET estado = 'vinculada' WHERE id = ?", [h.id]);
            
            if (h.event_id) {
                await db.query("DELETE FROM empresa_seguimiento_log WHERE reunion_id = ? AND estado = 'cancelada'", [h.event_id]);
                console.log("Logs eliminados para event_id de huerfana:", h.event_id);
            }
        }

        console.log("=== HECHO ===");

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
