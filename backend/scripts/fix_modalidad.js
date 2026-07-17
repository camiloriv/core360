require("dotenv").config({ path: "../.env" });
const db = require("../database/connection");

async function fixModalidad() {
    try {
        console.log("Corrgiendo modalidad (lugar) vacía o con URLs a 'Teams'...");
        
        const [result] = await db.query(`
            UPDATE reuniones 
            SET lugar = 'Teams' 
            WHERE lugar IS NULL 
               OR lugar = '' 
               OR lugar LIKE 'http%'
        `);
        
        console.log(`Corregidas ${result.affectedRows} reuniones.`);
    } catch (e) {
        console.error("Error corrigiendo DB:", e);
    } finally {
        process.exit(0);
    }
}

fixModalidad();
