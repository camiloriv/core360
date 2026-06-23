const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360_db',
};

async function cleanupDuplicates() {
    let connection;
    try {
        connection = await mysql.createConnection(poolConfig);
        console.log("Conectado a la BD. Buscando duplicados en reuniones...");

        // 1. Limpiar duplicados en 'reuniones' (mantener el que tenga id_reunion más antiguo/menor)
        const [reuniones] = await connection.query("SELECT id_reunion, fecha_reu, hora, motivo_reu, ejecutiva_id FROM reuniones");
        
        const rSignatures = new Map();
        let deletedReuniones = 0;

        for (const r of reuniones) {
            if (!r.fecha_reu || !r.hora || !r.motivo_reu) continue;
            const f = (typeof r.fecha_reu === 'string') ? r.fecha_reu.split('T')[0] : r.fecha_reu.toISOString().split('T')[0];
            const h = r.hora.substring(0, 5);
            const sig = `${f}|${h}|${r.motivo_reu.toLowerCase().trim()}`;

            if (rSignatures.has(sig)) {
                // Duplicado encontrado. 
                const existingId = rSignatures.get(sig);
                console.log(`Duplicado en reuniones: Eliminando ${r.id_reunion} (manteniendo ${existingId}) [Firma: ${sig}]`);
                await connection.query("DELETE FROM reuniones WHERE id_reunion = ?", [r.id_reunion]);
                deletedReuniones++;
            } else {
                rSignatures.set(sig, r.id_reunion);
            }
        }

        console.log(`\nEliminados ${deletedReuniones} registros duplicados en 'reuniones'.`);

        // 2. Limpiar duplicados en 'reuniones_huerfanas'
        console.log("\nBuscando duplicados en reuniones_huerfanas...");
        const [huerfanas] = await connection.query("SELECT id, fecha, hora, asunto FROM reuniones_huerfanas");
        
        // Cargar firmas existentes de 'reuniones' para que si ya está como borrador, se elimine la huérfana
        const hSignatures = new Map(rSignatures); 
        let deletedHuerfanas = 0;

        for (const h of huerfanas) {
            if (!h.fecha || !h.hora || !h.asunto) continue;
            const f = (typeof h.fecha === 'string') ? h.fecha.split('T')[0] : h.fecha.toISOString().split('T')[0];
            const timeStr = h.hora.substring(0, 5);
            const sig = `${f}|${timeStr}|${h.asunto.toLowerCase().trim()}`;

            if (hSignatures.has(sig)) {
                // Duplicado encontrado
                console.log(`Duplicado en reuniones_huerfanas: Eliminando id ${h.id} [Firma: ${sig}]`);
                await connection.query("DELETE FROM reuniones_huerfanas WHERE id = ?", [h.id]);
                deletedHuerfanas++;
            } else {
                hSignatures.set(sig, `huerfana-${h.id}`);
            }
        }

        console.log(`\nEliminados ${deletedHuerfanas} registros duplicados en 'reuniones_huerfanas'.`);
        console.log("\nLimpieza completada con éxito.");

    } catch (error) {
        console.error("Error limpiando duplicados:", error);
    } finally {
        if (connection) await connection.end();
    }
}

cleanupDuplicates();
