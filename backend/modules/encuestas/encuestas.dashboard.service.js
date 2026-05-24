const db = require("../../database/connection");

/**
 * Obtiene el resumen de respuestas para la tabla principal del dashboard
 */
const obtenerTodasLasRespuestas = async () => {
  const sql = `
    SELECT 
      e.id,
      e.token,
      e.estado,
      e.activo,
      e.fecha_creacion,
      e.fecha_respuesta AS fecha_respuesta,
      t.nombre AS titulo,
      emp.nombre AS empresa,
      ej.nombre AS ejecutiva,
      e.enviado_a
    FROM encuestas e
    JOIN encuesta_templates t ON e.template_id = t.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios ej ON e.ejecutiva_id = ej.id
    ORDER BY e.fecha_creacion DESC
  `;
  const [result] = await db.query(sql);
  return result;
};

/**
 * Obtiene promedios por dimensión (Ideal para Radar Chart)
 */
const obtenerPromediosPorDimension = async (usuario_id, rol) => {
  let joinClause = `
    JOIN encuestas e ON r.encuesta_id = e.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
  `;
  let whereClause = "WHERE r.valor_numerico IS NOT NULL";
  let params = [];

  if (rol === 'ejecutiva') {
      whereClause += " AND e.ejecutiva_id = ?";
      params.push(usuario_id);
  } else if (rol === 'jefatura') {
      whereClause += " AND emp.jefatura_id = ?";
      params.push(usuario_id);
  } else if (rol === 'gerencia') {
      whereClause += ` AND j.id IN (
          SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?
          UNION
          SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
              SELECT ug.usuario_id FROM usuario_gerencias ug 
              JOIN usuarios u ON ug.usuario_id = u.id 
              WHERE ug.gerencia_id = ? AND u.permisos = 'gerencia'
          )
      )`;
      params.push(usuario_id, usuario_id);
  }

  const sql = `
    SELECT 
      d.nombre as dimension,
      AVG(r.valor_numerico) as promedio
    FROM encuesta_respuestas r
    JOIN encuesta_catalogo_preguntas q ON r.pregunta_id = q.id
    JOIN encuesta_dimensiones d ON q.dimension_id = d.id
    ${joinClause}
    ${whereClause}
    GROUP BY d.id, d.nombre
  `;
  const [result] = await db.query(sql, params);
  return result;
};

/**
 * Obtiene promedios por jefatura (Ranking)
 */
const obtenerRankingEjecutivas = async (usuario_id, rol) => {
  let whereClause = "WHERE r.valor_numerico IS NOT NULL";
  let params = [];

  if (rol === 'ejecutiva') {
      whereClause += " AND e.ejecutiva_id = ?";
      params.push(usuario_id);
  } else if (rol === 'jefatura') {
      whereClause += " AND emp.jefatura_id = ?";
      params.push(usuario_id);
  } else if (rol === 'gerencia') {
      whereClause += ` AND j.id IN (
          SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?
          UNION
          SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
              SELECT ug.usuario_id FROM usuario_gerencias ug 
              JOIN usuarios u ON ug.usuario_id = u.id 
              WHERE ug.gerencia_id = ? AND u.permisos = 'gerencia'
          )
      )`;
      params.push(usuario_id, usuario_id);
  }

  const sql = `
    SELECT 
      j.nombre as jefatura,
      AVG(r.valor_numerico) as promedio,
      COUNT(DISTINCT e.id) as total_encuestas
    FROM encuesta_respuestas r
    JOIN encuestas e ON r.encuesta_id = e.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    ${whereClause}
    GROUP BY j.id, j.nombre
    ORDER BY promedio DESC
  `;
  const [result] = await db.query(sql, params);
  return result;
};

/**
 * Obtiene el detalle de todas las respuestas (Pregunta + Respuesta)
 */
const obtenerDetalleRespuestas = async (usuario_id, rol) => {
  let joinClause = `
    JOIN encuestas e ON r.encuesta_id = e.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
  `;
  let whereClause = "WHERE 1=1";
  let params = [];

  if (rol === 'ejecutiva') {
      whereClause += " AND e.ejecutiva_id = ?";
      params.push(usuario_id);
  } else if (rol === 'jefatura') {
      whereClause += " AND emp.jefatura_id = ?";
      params.push(usuario_id);
  } else if (rol === 'gerencia') {
      whereClause += ` AND j.id IN (
          SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?
          UNION
          SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
              SELECT ug.usuario_id FROM usuario_gerencias ug 
              JOIN usuarios u ON ug.usuario_id = u.id 
              WHERE ug.gerencia_id = ? AND u.permisos = 'gerencia'
          )
      )`;
      params.push(usuario_id, usuario_id);
  }

  const sql = `
    SELECT 
      r.encuesta_id,
      COALESCE(q.texto, '(Pregunta eliminada de la biblioteca maestro)') as pregunta,
      r.valor_texto,
      r.valor_numerico
    FROM encuesta_respuestas r
    LEFT JOIN encuesta_catalogo_preguntas q ON r.pregunta_id = q.id
    ${joinClause}
    ${whereClause}
  `;
  const [result] = await db.query(sql, params);
  return result;
};

module.exports = {
  obtenerTodasLasRespuestas,
  obtenerPromediosPorDimension,
  obtenerRankingEjecutivas,
  obtenerDetalleRespuestas
};
