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
  
  const [reuniones] = await db.query(`
    SELECT COUNT(*) as count
    FROM teams_eventos te
    LEFT JOIN minutas m ON m.teams_evento_id = te.id
    WHERE (
        te.usuario_id = 9
        OR te.usuario_id = (SELECT COALESCE(jefatura_id, 0) FROM usuarios WHERE id = 9)
    )
    AND (te.empresa_id IS NULL)
    AND NOT (te.estado = 'cancelada')
    AND NOT (te.estado = 'ignorada')
  `);
  console.log("Dashboard style count (Camilo):", reuniones[0].count);

  const [agendamiento] = await db.query(`
    SELECT COUNT(*) as count
    FROM teams_eventos te
    WHERE te.usuario_id = 9
    AND te.estado NOT IN ('cancelada', 'ignorada')
    AND te.empresa_id IS NULL
  `);
  console.log("Vincular style count (Camilo):", agendamiento[0].count);
  
  // What about user_id = 1 (his boss)? How many orphans does the boss have?
  const [boss] = await db.query(`
    SELECT COUNT(*) as count
    FROM teams_eventos te
    WHERE te.usuario_id = 1
    AND te.estado NOT IN ('cancelada', 'ignorada')
    AND te.empresa_id IS NULL
  `);
  console.log("Boss orphans count:", boss[0].count);

  await db.end();
}

run().catch(console.error);
