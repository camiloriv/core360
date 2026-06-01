const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(poolConfig);

// Test de conexión (versión async)
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`MySQL conectado correctamente (${process.env.DB_HOST}:${poolConfig.port})`);
    connection.release();
  } catch (err) {
    console.error("Error conectando MySQL:", err.message);
  }
})();

module.exports = pool;

