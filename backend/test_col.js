const pool = require('./database/connection.js');
pool.query('SHOW COLUMNS FROM reuniones LIKE "encuesta_destinatario"').then(res => { console.log(res[0]); process.exit(); }).catch(e => { console.error(e); process.exit(1); })
