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
  
  const [rows] = await db.query("SELECT id, nombre, permisos, jefatura_id FROM usuarios WHERE nombre LIKE '%Camilo%'");
  console.log("Camilo Rivera user:", rows);

  await db.end();
}

run().catch(console.error);
