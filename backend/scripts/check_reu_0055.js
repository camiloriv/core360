const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360_db',
};

async function checkMeeting() {
    let connection;
    try {
        connection = await mysql.createConnection(poolConfig);

        const [reuniones] = await connection.query(`
            SELECT r.id_reunion, r.ejecutiva_id AS reu_ejecutiva_id, u_reu.nombre AS reu_ejecutiva_nombre, 
                   r.empresa_id, e.nombre AS empresa_nombre, e.jefatura_id
            FROM reuniones r
            LEFT JOIN usuarios u_reu ON r.ejecutiva_id = u_reu.id
            LEFT JOIN empresas e ON r.empresa_id = e.id
            WHERE r.id_reunion = 'REU-2026-0055'
        `);

        if (reuniones.length === 0) {
            console.log("No se encontró la reunión REU-2026-0055.");
            return;
        }

        console.log(JSON.stringify(reuniones[0], null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (connection) await connection.end();
    }
}

checkMeeting();
