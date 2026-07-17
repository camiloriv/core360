require('dotenv').config();
const db = require('../database/connection');

async function check() {
  const [eventos] = await db.query('SELECT count(*) as count, estado, empresa_id FROM teams_eventos GROUP BY estado, empresa_id');
  console.log("Teams Eventos agrupados:", eventos);
  const [minutas] = await db.query('SELECT count(*) as count FROM minutas');
  console.log("Minutas totales:", minutas[0].count);
  process.exit(0);
}
check().catch(console.error);
