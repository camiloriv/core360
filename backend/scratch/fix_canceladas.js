const db = require('../database/connection.js');

async function run() {
    try {
        const [rows] = await db.query(`
            SELECT r.id_reunion, r.estado_envio, r.fecha_reu, r.minuta,
                   (SELECT COUNT(*) FROM empresa_seguimiento_log l WHERE l.reunion_id = r.event_id AND l.estado IN ('gestionada', 'concretada', 'enviado')) as valid_logs,
                   (SELECT COUNT(*) FROM empresa_seguimiento_log l WHERE l.reunion_id = r.event_id AND l.estado = 'cancelada') as cancel_logs
            FROM reuniones r
            WHERE r.estado_envio = 'cancelada'
        `);
        
        const affected = rows.filter(r => r.valid_logs > 0 && r.cancel_logs > 0);
        console.log('Total affected (event_id):', affected.length);
        console.log(affected);

        // Also check by huerfana if they have event_id null but ical_uid. But actually the logs are tied to reunion_id = event_id.
        // What if we just check by reunion_id column directly if it's the id_reunion or event_id?
        // Wait, log.reunion_id is the event_id.
        
        // Let's actually find meetings that were cancelled but should be 'borrador' or 'enviado'
        const toFix = [];
        for (const r of affected) {
            // Check if there's a minuta text
            if (r.minuta && r.minuta.trim().length > 0) {
                // If there's a minuta, maybe it was 'enviado' or 'borrador'
                toFix.push({ id_reunion: r.id_reunion, revert_to: 'borrador' });
            } else {
                toFix.push({ id_reunion: r.id_reunion, revert_to: 'borrador' });
            }
        }

        console.log('To fix:', toFix);
        
        // Execute the fix
        for (const f of toFix) {
            await db.query("UPDATE reuniones SET estado_envio = ? WHERE id_reunion = ?", [f.revert_to, f.id_reunion]);
            console.log(`Reverted reunion ${f.id_reunion} to ${f.revert_to}`);
            
            // Delete the incorrect cancelada logs for these
            await db.query(`
                DELETE FROM empresa_seguimiento_log 
                WHERE reunion_id = (SELECT event_id FROM reuniones WHERE id_reunion = ?) 
                AND estado = 'cancelada'
            `, [f.id_reunion]);
            console.log(`Deleted cancelada logs for reunion ${f.id_reunion}`);
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
