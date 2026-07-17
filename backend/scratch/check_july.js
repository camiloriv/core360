require('dotenv').config();
const db = require('../database/connection');

async function test() {
  const [rows] = await db.query("SELECT COUNT(*) as c FROM teams_eventos WHERE empresa_id IS NULL AND MONTH(fecha) = 7 AND YEAR(fecha) = 2026");
  console.log("Huerfanas en Julio:", rows[0]);
  process.exit(0);
}
test();
