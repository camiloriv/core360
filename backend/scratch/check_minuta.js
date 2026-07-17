require('dotenv').config();
const db = require('../database/connection');

async function test() {
  const [rows] = await db.query("SELECT * FROM minutas WHERE teams_evento_id = 412");
  console.log("Minuta:", rows);
  process.exit(0);
}
test();
