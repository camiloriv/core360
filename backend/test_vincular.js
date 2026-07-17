const db = require("./database/connection");
const agendamientoController = require("./modules/agendamiento/agendamiento.controller");

async function test() {
    try {
        // 1. Get an existing huerfana that is pendiente
        const [rows] = await db.query("SELECT id FROM reuniones_huerfanas WHERE estado = 'pendiente' LIMIT 1");
        if (rows.length === 0) {
            console.log("No huerfanas pendientes");
            process.exit();
        }
        
        const req = {
            body: {
                id: rows[0].id,
                empresa_id: null
            }
        };
        const res = {
            status: function(code) { console.log('STATUS:', code); return this; },
            json: function(data) { console.log('JSON:', data); return this; }
        };
        
        await agendamientoController.vincularHuerfana(req, res);
        
    } catch(e) {
        console.error("Uncaught exception:", e);
    } finally {
        process.exit();
    }
}
test();
