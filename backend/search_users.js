const pool = require('./database/connection.js');
pool.query("SELECT id, nombre, zona_id FROM usuarios WHERE nombre LIKE '%admin%' OR nombre LIKE '%gerencia%'").then(res => { console.log(res[0]); process.exit(); }).catch(e => { console.error(e); process.exit(1); })
