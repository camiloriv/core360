const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360'
  });

  const [rows] = await db.query("SELECT * FROM reuniones WHERE DATE(fecha_reu) = '2026-06-15' AND ejecutiva_id = 9");
  console.log('Reuniones en el 15:', rows);
  
  process.exit(0);
}

run();
