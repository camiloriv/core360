const db = require("../database/connection");

async function check() {
    try {
        const [reuniones] = await db.query("SELECT id_reunion, estado_envio, empresa_id, ejecutiva_id FROM reuniones WHERE motivo_reu LIKE '%Agoras%' OR asunto_teams LIKE '%Agoras%'");
        console.log("Reuniones Agoras:", reuniones);

        const [logs] = await db.query("SELECT id, reunion_id, estado FROM empresa_seguimiento_log WHERE asunto LIKE '%Agoras%'");
        console.log("Logs Agoras:", logs);

        if (reuniones.length > 0) {
            console.log("Empresa ID:", reuniones[0].empresa_id);
            const [empresa] = await db.query("SELECT * FROM empresas WHERE id = ?", [reuniones[0].empresa_id]);
            console.log("Empresa:", empresa);
            
            const [allLogs] = await db.query("SELECT * FROM empresa_seguimiento_log WHERE reunion_id = ?", [reuniones[0].id_reunion]);
            console.log("All logs for this reunion:", allLogs);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
