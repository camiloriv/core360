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
        await connection.query("ALTER TABLE reuniones MODIFY empresa_id INT NULL");
        console.log("Tabla reuniones alterada exitosamente.");
    } catch (e) {
        console.error(e);
    } finally {
        if (connection) await connection.end();
    }
}
migrate();
