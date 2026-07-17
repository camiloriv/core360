const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360_db',
};

async function fixMeeting() {
    let connection;
    try {
        connection = await mysql.createConnection(poolConfig);

        const [camilos] = await connection.query("SELECT id, nombre, permisos FROM usuarios WHERE nombre LIKE '%Camilo%'");
        if (camilos.length > 0) {
            const camiloId = camilos[0].id;
            console.log("Camilo ID:", camiloId);

            await connection.query("UPDATE reuniones SET ejecutiva_id = ? WHERE id_reunion = 'REU-2026-0055'", [camiloId]);
            console.log("REU-2026-0055 actualizado a Camilo.");
        } else {
            console.log("Camilo no encontrado.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (connection) await connection.end();
    }
}

fixMeeting();
