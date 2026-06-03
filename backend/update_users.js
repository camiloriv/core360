const pool = require('./database/connection.js');
pool.query("UPDATE usuarios SET zona_id = NULL WHERE id IN (14, 27)").then(res => { console.log('UPDATED', res[0]); process.exit(); }).catch(e => { console.error(e); process.exit(1); })
