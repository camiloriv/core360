require('dotenv').config();
const db = require('../database/connection');

async function check() {
  const [rows] = await db.query("SELECT event_id, asunto, fecha, hora, estado, asistentes FROM teams_eventos WHERE estado = 'ignorada' ORDER BY fecha DESC LIMIT 10");
  console.log("Ignoradas:", rows);
  
  const [rows2] = await db.query("SELECT event_id, asunto, fecha, hora, estado, asistentes FROM teams_eventos ORDER BY fecha DESC LIMIT 10");
  console.log("Todas recientes:", rows2);
  
  process.exit(0);
}
check().catch(console.error);
