require('dotenv').config({path: '../.env'});
const db = require('../database/connection');

async function go() {
  const [rows] = await db.query(`SELECT log.reunion_id, log.estado, log.fecha, emp.nombre FROM empresa_seguimiento_log log JOIN empresas emp ON log.empresa_id = emp.id WHERE log.usuario_id = 9 AND log.estado = 'agendada'`);
  console.log(rows);
  const [reus] = await db.query(`SELECT id_reunion, fecha_reu, estado_envio, tipo_reu, empresa_id FROM reuniones WHERE ejecutiva_id = 9 AND estado_envio = 'agendada'`);
  console.log(reus);
  process.exit(0);
}
go();
