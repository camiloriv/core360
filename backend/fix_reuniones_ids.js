const pool = require('./database/connection.js');

async function migrate() {
    // Mapping from old_ejecutivas ID to usuarios ID
    const mapping = {
        5: 9,  // Camilo Rivera
        6: 10, // Tomás Parada
        7: 11, // Monica Sanchez
        8: 12, // Camila Meneses
        9: 13  // Lyan Becerra
    };

    try {
        let reunionesActualizadas = 0;
        let logsActualizados = 0;

        for (const [oldId, newId] of Object.entries(mapping)) {
            // Update reuniones
            const [resReuniones] = await pool.query(
                'UPDATE reuniones SET ejecutiva_id = ? WHERE ejecutiva_id = ?',
                [newId, oldId]
            );
            reunionesActualizadas += resReuniones.affectedRows;

            // Update empresa_seguimiento_log (usuario_id)
            const [resLogs] = await pool.query(
                'UPDATE empresa_seguimiento_log SET usuario_id = ? WHERE usuario_id = ?',
                [newId, oldId]
            );
            logsActualizados += resLogs.affectedRows;
        }

        console.log(`✅ Migración completada con éxito.`);
        console.log(`   - ${reunionesActualizadas} registros actualizados en 'reuniones'.`);
        console.log(`   - ${logsActualizados} registros actualizados en 'empresa_seguimiento_log'.`);

        process.exit(0);
    } catch (e) {
        console.error("Error durante la migración:", e);
        process.exit(1);
    }
}

migrate();
