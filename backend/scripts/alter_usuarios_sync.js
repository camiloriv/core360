const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360_db',
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(poolConfig);
        
        try {
            await connection.query("ALTER TABLE usuarios ADD COLUMN sync_delta_token TEXT NULL");
            console.log("Columna sync_delta_token añadida a usuarios.");
        } catch (e) {
            // Ignorar si la columna ya existe
            if (e.code !== 'ER_DUP_FIELDNAME') {
                console.log("Aviso (sync_delta_token):", e.message);
            }
        }

        try {
            await connection.query("ALTER TABLE usuarios ADD COLUMN ultima_sincronizacion DATETIME NULL");
            console.log("Columna ultima_sincronizacion añadida a usuarios.");
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') {
                console.log("Aviso (ultima_sincronizacion):", e.message);
            }
        }

    } catch (e) {
        console.error("Error conectando a BD para migraciones de usuarios:", e);
    } finally {
        if (connection) await connection.end();
    }
}
migrate();
