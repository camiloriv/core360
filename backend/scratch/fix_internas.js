require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function fixInternas() {
    try {
        console.log("Recuperando reuniones internas ignoradas...");
        const [huerfanas] = await db.query("SELECT * FROM reuniones_huerfanas WHERE estado = 'ignorado'");
        const [emp] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
        if(emp.length === 0) {
            console.log("No existe PROFORMA INTERNA");
            process.exit(0);
        }
        const idProforma = emp[0].id;
        
        let rescatadas = 0;
        for (const h of huerfanas) {
            let hAttendees = [];
            try { hAttendees = JSON.parse(h.asistentes || '[]'); } catch(e) {}
            
            if (hAttendees.length > 0) {
                const emails = hAttendees.map(a => a.email ? a.email.toLowerCase() : '');
                const allInternal = emails.every(e => e.endsWith('@proforma.cl'));
                
                if (allInternal) {
                    const id_reunion = `REU-INT-${h.id}`; // Simple id generation for old ones
                    const subjectLower = (h.asunto || '').toLowerCase();
                    const isPresencial = subjectLower.includes('presencial');
                    const lugarStr = isPresencial ? 'Presencial' : 'Teams';
                    
                    await db.query(
                        `INSERT IGNORE INTO reuniones (
                            id_reunion, ejecutiva_id, empresa_id, tipo_reu, fecha_reu, hora, 
                            lugar, estado_envio, enviado_a, event_id, participantes, motivo_reu, asunto_teams, ical_uid
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?, ?, ?)`,
                        [
                            id_reunion, h.usuario_id, idProforma, 
                            'Reunión Interna Proforma', 
                            h.fecha, h.hora, lugarStr,
                            '[]', h.event_id, hAttendees.map(a => a.name).join(", "),
                            h.asunto, h.asunto, h.ical_uid || null
                        ]
                    );
                    
                    await db.query("UPDATE reuniones_huerfanas SET estado = 'vinculada' WHERE id = ?", [h.id]);
                    rescatadas++;
                }
            }
        }
        console.log(`Se rescataron ${rescatadas} reuniones internas.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
fixInternas();
