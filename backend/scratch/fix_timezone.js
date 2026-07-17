require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function fixTimezone() {
    try {
        console.log("Restando 4 horas a reuniones sincronizadas en UTC...");
        
        // Reuniones normales
        const [resReu] = await db.query(`
            UPDATE reuniones 
            SET hora = SUBTIME(hora, '04:00:00') 
            WHERE event_id IS NOT NULL 
              AND hora IS NOT NULL
        `);
        console.log(`Corregidas ${resReu.affectedRows} reuniones principales.`);

        // Reuniones huérfanas
        const [resHuerf] = await db.query(`
            UPDATE reuniones_huerfanas 
            SET hora = SUBTIME(hora, '04:00:00') 
            WHERE event_id IS NOT NULL 
              AND hora IS NOT NULL
        `);
        console.log(`Corregidas ${resHuerf.affectedRows} reuniones huérfanas.`);
        
    } catch (e) {
        console.error("Error corrigiendo DB:", e);
    } finally {
        process.exit(0);
    }
}

fixTimezone();
