require('dotenv').config();
const db = require('../database/connection');

async function test() {
  const [rows] = await db.query("SELECT COUNT(*) as c, MIN(fecha) as m1, MAX(fecha) as m2 FROM teams_eventos WHERE empresa_id IS NULL");
  console.log("Huerfanas:", rows[0]);
  process.exit(0);
}
test();
