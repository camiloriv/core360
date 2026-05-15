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
    LEFT JOIN ejecutivas ej ON e.ejecutiva_id = ej.id
    ORDER BY e.fecha_creacion DESC
  `;
  const [result] = await db.query(sql);
  return result;
};

/**
 * Obtiene promedios por dimensión (Ideal para Radar Chart)
 */
const obtenerPromediosPorDimension = async () => {
  const sql = `
    SELECT 
      d.nombre as dimension,
      AVG(r.valor_numerico) as promedio
    FROM encuesta_respuestas r
    JOIN encuesta_catalogo_preguntas q ON r.pregunta_id = q.id
    JOIN encuesta_dimensiones d ON q.dimension_id = d.id
    WHERE r.valor_numerico IS NOT NULL
    GROUP BY d.id, d.nombre
  `;
  const [result] = await db.query(sql);
  return result;
};

/**
 * Obtiene promedios por jefatura (Ranking)
 */
const obtenerRankingEjecutivas = async () => {
  const sql = `
    SELECT 
      j.nombre as jefatura,
      AVG(r.valor_numerico) as promedio,
      COUNT(DISTINCT e.id) as total_encuestas
    FROM encuesta_respuestas r
    JOIN encuestas e ON r.encuesta_id = e.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN jefaturas j ON emp.jefatura_id = j.id
    WHERE r.valor_numerico IS NOT NULL
    GROUP BY j.id, j.nombre
    ORDER BY promedio DESC
  `;
  const [result] = await db.query(sql);
  return result;
};

/**
 * Obtiene el detalle de todas las respuestas (Pregunta + Respuesta)
 */
const obtenerDetalleRespuestas = async () => {
  const sql = `
    SELECT 
      r.encuesta_id,
      q.texto as pregunta,
      r.valor_texto,
      r.valor_numerico
    FROM encuesta_respuestas r
    JOIN encuesta_catalogo_preguntas q ON r.pregunta_id = q.id
  `;
  const [result] = await db.query(sql);
  return result;
};

module.exports = {
  obtenerTodasLasRespuestas,
  obtenerPromediosPorDimension,
  obtenerRankingEjecutivas,
  obtenerDetalleRespuestas
};
