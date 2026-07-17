const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360_db',
};

async function listExecutives() {
    let connection;
    try {
        connection = await mysql.createConnection(poolConfig);

        const [rows] = await connection.query(`
            SELECT e.nombre AS Ejecutiva, j.nombre AS Jefatura
            FROM usuarios e
            LEFT JOIN usuarios j ON e.jefatura_id = j.id
            WHERE e.permisos = 'ejecutiva'
            ORDER BY j.nombre, e.nombre
        `);

        console.table(rows);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (connection) await connection.end();
    }
}

listExecutives();
