const db = require('../database/connection.js');

async function run() {
    try {
        console.log("=== INICIANDO LIMPIEZA DE REUNIONES FALSAS CANCELADAS ===");

        // 1. Encontrar logs de cancelación que tengan otro estado válido (gestionada, concretada, enviado) para la misma reunión
        const [falseCancellations] = await db.query(`
            SELECT DISTINCT reunion_id
            FROM empresa_seguimiento_log
            WHERE estado = 'cancelada'
            AND reunion_id IN (
                SELECT reunion_id FROM empresa_seguimiento_log WHERE estado IN ('gestionada', 'concretada', 'enviado')
            )
            AND reunion_id IS NOT NULL
        `);

        console.log(`Se encontraron ${falseCancellations.length} reuniones con falso estado de cancelación.`);

        for (const row of falseCancellations) {
            const rId = row.reunion_id;
            
            // Eliminar logs de cancelación erróneos
            await db.query("DELETE FROM empresa_seguimiento_log WHERE reunion_id = ? AND estado = 'cancelada'", [rId]);
            console.log(`- Logs de cancelación eliminados para reunion_id: ${rId}`);

            // Restaurar en tabla reuniones
            const [updateReu] = await db.query("UPDATE reuniones SET estado_envio = 'borrador' WHERE event_id = ? AND estado_envio = 'cancelada'", [rId]);
            if (updateReu.affectedRows > 0) {
                console.log(`  -> Restaurada en tabla 'reuniones' como borrador.`);
            }

            // Restaurar en tabla reuniones_huerfanas
            const [updateHuer] = await db.query("UPDATE reuniones_huerfanas SET estado = 'vinculada' WHERE event_id = ? AND estado = 'cancelada'", [rId]);
            if (updateHuer.affectedRows > 0) {
                console.log(`  -> Restaurada en tabla 'reuniones_huerfanas' como vinculada.`);
            }
        }
        
        // 2. Limpiar también las reuniones_huerfanas que tengan estado='cancelada' 
        // pero que sepamos que ocurrieron en el pasado? 
        // Si no tienen log de 'gestionada', tal vez fueron canceladas legítimamente.
        
        console.log("=== LIMPIEZA COMPLETADA ===");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
