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
  
  const [rows] = await db.query('SELECT count(*) as count, estado, (empresa_id IS NULL) as no_empresa FROM teams_eventos GROUP BY estado, no_empresa');
  console.log("teams_eventos stats:", rows);
  
  const [minutas] = await db.query('SELECT count(*) as count, estado_envio FROM minutas GROUP BY estado_envio');
  console.log("minutas stats:", minutas);

  await db.end();
}

run().catch(console.error);
