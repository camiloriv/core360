require('dotenv').config();
const db = require('../database/connection');

async function test() {
  const [rows] = await db.query("SELECT * FROM teams_eventos WHERE id IN (619, 620)");
  console.log("619 620:", rows);
  process.exit(0);
}
test();
