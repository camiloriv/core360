require('dotenv').config();
const db = require('../database/connection');

async function test() {
  const [rows] = await db.query("SELECT * FROM minutas WHERE teams_evento_id IN (619, 620)");
  console.log("Minutas 619 620:", rows);
  process.exit(0);
}
test();
