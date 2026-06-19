const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360'
  });

  const [rows] = await db.query("SELECT * FROM reuniones_huerfanas WHERE DATE(fecha) = '2026-06-15'");
  console.log('Huerfanas:', rows);
  
  const [rows2] = await db.query("SELECT * FROM empresa_seguimiento_log WHERE DATE(fecha) = '2026-06-15'");
  console.log('Log:', rows2);
  
  process.exit(0);
}

run();
