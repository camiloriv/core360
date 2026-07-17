require('dotenv').config({path: '../.env'});
const db = require('../database/connection');

async function go() {
  const [rows] = await db.query(`SELECT log.reunion_id, log.estado, log.fecha, emp.nombre FROM empresa_seguimiento_log log JOIN empresas emp ON log.empresa_id = emp.id WHERE log.usuario_id = 9 AND log.estado = 'agendada'`);
  
  if (rows.length > 0) {
    const ids = rows.map(r => r.reunion_id);
    const [inReuniones] = await db.query(`SELECT id_reunion, event_id, estado_envio FROM reuniones WHERE event_id IN (?)`, [ids]);
    console.log("In reuniones:", inReuniones);

    const [canceled] = await db.query(`SELECT * FROM empresa_seguimiento_log WHERE reunion_id IN (?) AND estado = 'cancelada'`, [ids]);
    console.log("Canceled logs:", canceled);
  }
  process.exit(0);
}
go();
