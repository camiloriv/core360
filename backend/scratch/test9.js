require('dotenv').config({path: '../.env'});
const db = require('../database/connection');

async function go() {
  const [rows] = await db.query("SELECT id_reunion, ejecutiva_id, fecha_reu, estado_envio FROM reuniones WHERE ejecutiva_id = 9 AND empresa_id = (SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA' LIMIT 1)");
  console.log(rows);
  process.exit(0);
}
go();
