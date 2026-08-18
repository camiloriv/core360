const db = require('../database/knex');

async function run() {
  const res = await db.raw('SELECT 1 as n');
  console.log('Result is Array?', Array.isArray(res));
  console.log('Result type:', typeof res);
  console.log('Result content:', res);
  process.exit(0);
}
run();
