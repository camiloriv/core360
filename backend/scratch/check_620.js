require('dotenv').config();
const db = require('../database/connection');

async function test() {
  const [rows] = await db.query("SELECT id, estado FROM teams_eventos WHERE id IN (619, 620)");
  console.log("Estados:", rows);
  process.exit(0);
}
test();
