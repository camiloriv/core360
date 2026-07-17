const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

async function run() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Admin368*',
    database: 'core360'
  });
  
  const [rows] = await db.query("DESCRIBE usuarios");
  console.log("usuarios table structure:", rows);

  await db.end();
}

run().catch(console.error);
