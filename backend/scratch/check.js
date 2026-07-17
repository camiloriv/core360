require('dotenv').config({path: '../.env'});
const db = require('../database/connection');

async function check() {
  try {
    const [emp] = await db.query("SELECT id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
    console.log("PROFORMA INTERNA:", emp);

    const [users] = await db.query("SELECT id, correo, sync_delta_token, ultima_sincronizacion FROM usuarios LIMIT 5");
    console.log("USERS:", users);

    const empId = emp.length > 0 ? emp[0].id : null;
    const [reus] = await db.query("SELECT id_reunion, ejecutiva_id, tipo_reu, fecha_reu, estado_envio FROM reuniones WHERE empresa_id = ? OR estado_envio = 'agendada' ORDER BY id DESC LIMIT 50", [empId]);
    console.log("REUNIONES PROFORMA Y AGENDADAS:", reus);

    const [agendadas] = await db.query("SELECT id, reunion_id, estado, fecha FROM empresa_seguimiento_log WHERE estado = 'agendada' ORDER BY id DESC LIMIT 20");
    console.log("LOGS AGENDADAS:", agendadas);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
