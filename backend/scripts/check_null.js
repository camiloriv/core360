const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360_db',
};

async function check() {
    let connection;
    try {
        connection = await mysql.createConnection(poolConfig);
        const [rows] = await connection.query("SHOW COLUMNS FROM reuniones LIKE 'empresa_id'");
        console.log(rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        if (connection) await connection.end();
    }
}
check();
