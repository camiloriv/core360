const mysql = require('mysql2/promise');
async function run() {
  const db = await mysql.createConnection({host:'localhost', user:'root', password:'Admin368*', database:'core360'});
  const [rows] = await db.query(`SELECT table_name AS 'Table', round(((data_length + index_length) / 1024 / 1024), 2) as 'Size in MB' FROM information_schema.TABLES WHERE table_schema = 'core360' ORDER BY (data_length + index_length) DESC;`);
  console.table(rows);
  db.end();
}
run();
