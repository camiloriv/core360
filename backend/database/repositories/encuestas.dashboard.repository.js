const { sql, poolPromise } = require('../mssql');

const applyRbacFilter = (q, req, usuario_id, rol) => {
  if (rol === 'ejecutiva') {
    q += `
      AND (
        emp.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = @usuario_id)
        OR emp.jefatura_id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = @usuario_id))
        OR e.ejecutiva_id = @usuario_id
      )
    `;
    req.input('usuario_id', sql.Int, usuario_id);
  } else if (rol === 'jefatura') {
    q += `
      AND (
        emp.jefatura_id = @usuario_id
        OR emp.jefatura_id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = @usuario_id)
      )
    `;
    req.input('usuario_id', sql.Int, usuario_id);
  } else if (rol === 'gerencia') {
    q += `
      AND (
        j.id IN (
          SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = @usuario_id
          UNION
          SELECT ug2.usuario_id FROM usuario_gerencias ug2
          WHERE ug2.gerencia_id IN (
            SELECT ug.usuario_id FROM usuario_gerencias ug
            JOIN usuarios u ON ug.usuario_id = u.id
            WHERE ug.gerencia_id = @usuario_id AND u.permisos = 'gerencia'
          )
        )
        OR emp.jefatura_id = @usuario_id
      )
    `;
    req.input('usuario_id', sql.Int, usuario_id);
  }
  return { q, req };
};

const obtenerTodasLasRespuestas = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT 
      e.id, e.token, e.estado, e.activo, e.fecha_creacion, e.fecha_respuesta,
      t.nombre as titulo, emp.nombre as empresa, ej.nombre as ejecutiva, e.enviado_a
    FROM encuestas e
    JOIN encuesta_templates t ON e.template_id = t.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios ej ON e.ejecutiva_id = ej.id
    ORDER BY e.fecha_creacion DESC
  `);
  return result.recordset;
};

const obtenerPromediosPorDimension = async (usuario_id, rol) => {
  const pool = await poolPromise;
  let q = `
    SELECT d.nombre as dimension, AVG(CAST(r.valor_numerico AS FLOAT)) as promedio
    FROM encuesta_respuestas r
    JOIN encuesta_catalogo_preguntas q ON r.pregunta_id = q.id
    JOIN encuesta_dimensiones d ON q.dimension_id = d.id
    JOIN encuestas e ON r.encuesta_id = e.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    WHERE r.valor_numerico IS NOT NULL
  `;
  let req = pool.request();
  const filter = applyRbacFilter(q, req, usuario_id, rol);
  q = filter.q;
  req = filter.req;
  
  q += " GROUP BY d.id, d.nombre";
  const result = await req.query(q);
  return result.recordset;
};

const obtenerRankingEjecutivas = async (usuario_id, rol) => {
  const pool = await poolPromise;
  let q = `
    SELECT j.nombre as jefatura, AVG(CAST(r.valor_numerico AS FLOAT)) as promedio, COUNT(DISTINCT e.id) as total_encuestas
    FROM encuesta_respuestas r
    JOIN encuestas e ON r.encuesta_id = e.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    WHERE r.valor_numerico IS NOT NULL
  `;
  let req = pool.request();
  const filter = applyRbacFilter(q, req, usuario_id, rol);
  q = filter.q;
  req = filter.req;
  
  q += " GROUP BY j.id, j.nombre ORDER BY promedio DESC";
  const result = await req.query(q);
  return result.recordset;
};

const obtenerDetalleRespuestas = async (usuario_id, rol) => {
  const pool = await poolPromise;
  let q = `
    SELECT 
      r.encuesta_id,
      COALESCE(q.texto, '(Pregunta eliminada de la biblioteca maestro)') as pregunta,
      r.valor_texto,
      r.valor_numerico
    FROM encuesta_respuestas r
    LEFT JOIN encuesta_catalogo_preguntas q ON r.pregunta_id = q.id
    JOIN encuestas e ON r.encuesta_id = e.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    WHERE 1=1
  `;
  let req = pool.request();
  const filter = applyRbacFilter(q, req, usuario_id, rol);
  q = filter.q;
  req = filter.req;
  
  const result = await req.query(q);
  return result.recordset;
};

module.exports = {
  obtenerTodasLasRespuestas,
  obtenerPromediosPorDimension,
  obtenerRankingEjecutivas,
  obtenerDetalleRespuestas
};
