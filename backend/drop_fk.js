const pool = require('./database/connection.js');

async function fixDb() {
    try {
        try {
            await pool.query("ALTER TABLE empresas DROP FOREIGN KEY empresas_ibfk_1;");
            console.log("Foreign key empresas_ibfk_1 eliminada.");
        } catch(e) {
            console.log("FK ya eliminada o error:", e.message);
        }

        try {
            await pool.query("ALTER TABLE empresas DROP COLUMN id_ejecutiva;");
            console.log("Columna id_ejecutiva eliminada.");
        } catch(e) {
            console.log("Columna id_ejecutiva ya eliminada o error:", e.message);
        }

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

fixDb();
