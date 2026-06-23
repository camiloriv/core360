const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360_db',
};

async function fixReunionIds() {
    let connection;
    try {
        connection = await mysql.createConnection(poolConfig);
        
        // Obtenemos todas las reuniones ordenadas por ID
        const [rows] = await connection.query("SELECT id, created_at, id_reunion FROM reuniones ORDER BY id ASC");
        
        // Contadores por año
        const yearCounts = {};

        let updated = 0;

        for (const row of rows) {
            const dateStr = row.created_at || new Date();
            const d = new Date(dateStr);
            const year = d.getFullYear() || new Date().getFullYear();
            
            if (!yearCounts[year]) yearCounts[year] = 0;
            yearCounts[year]++;
            
            const expectedIdReunion = `REU-${year}-${String(yearCounts[year]).padStart(4, "0")}`;
            
            if (row.id_reunion !== expectedIdReunion) {
                await connection.query("UPDATE reuniones SET id_reunion = ? WHERE id = ?", [expectedIdReunion, row.id]);
                console.log(`Fijado ID ${row.id}: ${row.id_reunion} -> ${expectedIdReunion}`);
                updated++;
            }
        }
        
        console.log(`Finalizado. ${updated} reuniones actualizadas.`);

    } catch (e) {
        console.error(e);
    } finally {
        if (connection) await connection.end();
    }
}
fixReunionIds();
