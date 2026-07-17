require('dotenv').config();
const db = require('../database/connection');

async function test() {
  const [rows] = await db.query("SELECT * FROM teams_eventos WHERE asunto LIKE '%CHP%'");
  console.log("Evento:", rows);
  process.exit(0);
}
test();
