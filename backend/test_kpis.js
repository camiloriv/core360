const pool = require('./database/connection.js');
async function test() {
  try {
    const [res] = await pool.query(`
      SELECT 
        d.nombre as dimension,
        AVG(r.valor_numerico) as promedio
      FROM encuesta_respuestas r
      JOIN encuesta_catalogo_preguntas q ON r.pregunta_id = q.id
      JOIN encuesta_dimensiones d ON q.dimension_id = d.id
      
      JOIN encuestas e ON r.encuesta_id = e.id
      LEFT JOIN empresas emp ON e.empresa_id = emp.id
      LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    
      WHERE r.valor_numerico IS NOT NULL
      GROUP BY d.id, d.nombre
    `);
    console.log("OK", res);
  } catch (e) {
    console.error("ERROR", e.message);
  }
  process.exit(0);
}
test();
