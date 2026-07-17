require('dotenv').config();
const db = require('../database/connection');

async function test() {
  const sql = `
        SELECT 
            te.id                           AS id_reunion,
            te.estado,
            CASE
                WHEN te.estado = 'cancelada'                        THEN 'cancelada'
                WHEN m.estado_envio = 'enviado'                     THEN 'enviado'
                WHEN m.estado_envio = 'no_aplica'                   THEN 'no_aplica'
                WHEN m.estado_envio = 'borrador'                    THEN 'borrador'
                WHEN te.empresa_id IS NULL                          THEN 'huerfana'
                WHEN te.estado = 'pasada'                           THEN 'borrador'
                ELSE te.estado
            END                             AS estado_envio
        FROM teams_eventos te
        LEFT JOIN minutas m ON m.teams_evento_id = te.id
        WHERE te.id = 620
  `;
  const [rows] = await db.query(sql);
  console.log("Query test 620:", rows);
  process.exit(0);
}
test();
