const db = require('../database/connection');

async function run() {
  const [rows] = await db.query(`
    SELECT te.id, te.event_id, te.asunto, te.fecha, te.estado, te.empresa_id,
           m.estado_envio as minuta_estado
    FROM teams_eventos te
    LEFT JOIN minutas m ON m.teams_evento_id = te.id
    WHERE te.asunto LIKE '%RECORDATORIO 1/6%'
  `);
  console.log("Reuniones encontradas:", rows);
  process.exit(0);
}
run();
