const { sql, poolPromise } = require('../mssql');

const listarTemplates = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query("SELECT * FROM encuesta_templates WHERE activo != 2 ORDER BY id DESC");
  return result.recordset;
};

const crearTemplate = async (nombre) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('nombre', sql.VarChar, nombre)
    .query("INSERT INTO encuesta_templates (nombre, activo) OUTPUT INSERTED.id VALUES (@nombre, 1)");
  return { id: result.recordset[0]?.id, nombre };
};

const actualizarTemplate = async (id, nombre, activo) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('nombre', sql.VarChar, nombre)
    .input('activo', sql.Int, activo)
    .query("UPDATE encuesta_templates SET nombre = @nombre, activo = @activo WHERE id = @id");
  return result.rowsAffected[0];
};

const listarDimensiones = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query("SELECT * FROM encuesta_dimensiones ORDER BY nombre ASC");
  return result.recordset;
};

const crearDimension = async (nombre) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('nombre', sql.VarChar, nombre)
    .query("INSERT INTO encuesta_dimensiones (nombre) OUTPUT INSERTED.id VALUES (@nombre)");
  return { id: result.recordset[0]?.id, nombre };
};

const listarPreguntasPorTemplate = async (templateId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('template_id', sql.Int, templateId)
    .query(`
      SELECT 
        tp.id as assignment_id, tp.template_id, tp.pregunta_id, tp.orden, tp.requerida,
        p.texto, p.tipo, p.escala, p.es_nps, p.subdimension, p.dimension_id, p.opciones_json,
        d.nombre as dimension_nombre,
        (SELECT COUNT(*) FROM encuesta_template_preguntas WHERE pregunta_id = p.id) as shared_count
      FROM encuesta_template_preguntas tp
      JOIN encuesta_catalogo_preguntas p ON tp.pregunta_id = p.id
      LEFT JOIN encuesta_dimensiones d ON p.dimension_id = d.id
      WHERE tp.template_id = @template_id
      ORDER BY tp.orden ASC
    `);
  return result.recordset;
};

const insertPreguntaCatalogo = async (data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  const values = Object.values(data);
  let q = `INSERT INTO encuesta_catalogo_preguntas (${keys.join(', ')}) OUTPUT INSERTED.id VALUES (${keys.map((_, i) => `@p${i}`).join(', ')})`;
  const req = pool.request();
  values.forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(q);
  return result.recordset[0]?.id;
};

const updatePreguntaCatalogo = async (id, data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  let q = `UPDATE encuesta_catalogo_preguntas SET ${keys.map((k, i) => `${k} = @p${i}`).join(', ')} WHERE id = @id`;
  const req = pool.request().input('id', sql.Int, id);
  Object.values(data).forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const updateVinculoTemplatePregunta = async (template_id, old_pregunta_id, new_pregunta_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('template_id', sql.Int, template_id)
    .input('old_id', sql.Int, old_pregunta_id)
    .input('new_id', sql.Int, new_pregunta_id)
    .query("UPDATE encuesta_template_preguntas SET pregunta_id = @new_id WHERE template_id = @template_id AND pregunta_id = @old_id");
  return result.rowsAffected[0];
};

const getMaxOrdenTemplate = async (template_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('template_id', sql.Int, template_id)
    .query("SELECT MAX(orden) as max_o FROM encuesta_template_preguntas WHERE template_id = @template_id");
  return result.recordset[0]?.max_o || 0;
};

const upsertTemplatePregunta = async (template_id, pregunta_id, orden, requerida) => {
  const pool = await poolPromise;
  const req = pool.request()
    .input('template_id', sql.Int, template_id)
    .input('pregunta_id', sql.Int, pregunta_id)
    .input('orden', sql.Int, orden)
    .input('requerida', sql.Int, requerida);
    
  const result = await req.query(`
    IF EXISTS (SELECT 1 FROM encuesta_template_preguntas WHERE template_id = @template_id AND pregunta_id = @pregunta_id)
    BEGIN
      UPDATE encuesta_template_preguntas SET orden = @orden, requerida = @requerida WHERE template_id = @template_id AND pregunta_id = @pregunta_id
    END
    ELSE
    BEGIN
      INSERT INTO encuesta_template_preguntas (template_id, pregunta_id, orden, requerida) VALUES (@template_id, @pregunta_id, @orden, @requerida)
    END
  `);
  return result.rowsAffected[0];
};

const eliminarPreguntaTemplate = async (template_id, pregunta_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('template_id', sql.Int, template_id)
    .input('pregunta_id', sql.Int, pregunta_id)
    .query("DELETE FROM encuesta_template_preguntas WHERE template_id = @template_id AND pregunta_id = @pregunta_id");
  return result.rowsAffected[0];
};

const unlinkPreguntaFromAllTemplates = async (pregunta_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('pregunta_id', sql.Int, pregunta_id)
    .query("DELETE FROM encuesta_template_preguntas WHERE pregunta_id = @pregunta_id");
  return result.rowsAffected[0];
};

const softDeletePreguntaCatalogo = async (pregunta_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('pregunta_id', sql.Int, pregunta_id)
    .query("UPDATE encuesta_catalogo_preguntas SET activo = 2 WHERE id = @pregunta_id");
  return result.rowsAffected[0];
};

const softDeleteTemplate = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query("UPDATE encuesta_templates SET activo = 2 WHERE id = @id");
  return result.rowsAffected[0];
};

const eliminarDimension = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query("DELETE FROM encuesta_dimensiones WHERE id = @id");
  return result.rowsAffected[0];
};

module.exports = {
  listarTemplates,
  crearTemplate,
  actualizarTemplate,
  listarDimensiones,
  crearDimension,
  listarPreguntasPorTemplate,
  insertPreguntaCatalogo,
  updatePreguntaCatalogo,
  updateVinculoTemplatePregunta,
  getMaxOrdenTemplate,
  upsertTemplatePregunta,
  eliminarPreguntaTemplate,
  unlinkPreguntaFromAllTemplates,
  softDeletePreguntaCatalogo,
  softDeleteTemplate,
  eliminarDimension
};
