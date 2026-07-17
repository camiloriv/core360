require('dotenv').config({path: '../.env'});
const db = require('../database/connection');

async function test() {
    const usuario_id = 9;
    const whereClause = `WHERE 1=1 AND (
        emp.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?) 
        OR emp.jefatura_id IN (
            SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)
        )
        OR r.ejecutiva_id = ?
    )`;
    const params = [usuario_id, usuario_id, usuario_id];

    const sqlReuniones = `
        SELECT r.id_reunion, r.ejecutiva_id, emp.nombre AS empresa_nombre
        FROM reuniones r
        LEFT JOIN usuarios e ON r.ejecutiva_id = e.id
        LEFT JOIN empresas emp ON r.empresa_id = emp.id
        LEFT JOIN usuarios j ON emp.jefatura_id = j.id
        ${whereClause}
        AND emp.nombre = 'PROFORMA INTERNA'
    `;
    const [rows] = await db.query(sqlReuniones, params);
    console.log("SQL returned for user 9:", rows);

    const sqlAgendadas = `
        SELECT log.reunion_id, log.usuario_id AS ejecutiva_id, emp.nombre AS empresa_nombre
        FROM empresa_seguimiento_log log
        JOIN empresas emp ON log.empresa_id = emp.id
        JOIN usuarios u ON log.usuario_id = u.id
        LEFT JOIN usuarios j ON emp.jefatura_id = j.id
        WHERE log.estado IN ('agendada', 'no_aplica')
          AND log.reunion_id IS NOT NULL
          AND log.reunion_id NOT IN (
              SELECT event_id FROM reuniones WHERE event_id IS NOT NULL
          )
          AND NOT EXISTS (
              SELECT 1 FROM empresa_seguimiento_log log2
              WHERE log2.reunion_id = log.reunion_id AND log2.estado = 'cancelada'
          )
          AND 1=1 AND (
            emp.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?) 
            OR emp.jefatura_id IN (
                SELECT gerencia_id FROM usuario_gerencias WHERE log.usuario_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)
            )
            OR log.usuario_id = ?
        )
    `;
    const params2 = [usuario_id, usuario_id, usuario_id];
    const [rows2] = await db.query(sqlAgendadas, params2);
    console.log("SQL2 returned for user 9:", rows2.filter(r => r.empresa_nombre === 'PROFORMA INTERNA'));

    process.exit(0);
}

test();
