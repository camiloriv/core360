const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core360'
  });

  await db.query("UPDATE reuniones_huerfanas SET estado = 'pendiente' WHERE id = 29");
  console.log('Reunión id=29 reactivada.');
  process.exit(0);
}

run();
