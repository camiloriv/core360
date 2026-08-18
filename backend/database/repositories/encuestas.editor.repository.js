const knex = require('../knex');

const listarTemplates = async () => {
  return await knex('encuesta_templates')
    .select('*')
    .whereNot('activo', 2)
    .orderBy('id', 'desc');
};

const crearTemplate = async (nombre) => {
  const [result] = await knex('encuesta_templates').insert({ nombre, activo: 1 }).returning('id');
  return { id: result?.id || result, nombre };
};

const actualizarTemplate = async (id, nombre, activo) => {
  return await knex('encuesta_templates').where('id', id).update({ nombre, activo });
};

const listarDimensiones = async () => {
  return await knex('encuesta_dimensiones').select('*').orderBy('nombre', 'asc');
};

const crearDimension = async (nombre) => {
  const [result] = await knex('encuesta_dimensiones').insert({ nombre }).returning('id');
  return { id: result?.id || result, nombre };
};

const listarPreguntasPorTemplate = async (templateId) => {
  return await knex('encuesta_template_preguntas as tp')
    .select(
      'tp.id as assignment_id',
      'tp.template_id',
      'tp.pregunta_id',
      'tp.orden',
      'tp.requerida',
      'p.texto',
      'p.tipo',
      'p.escala',
      'p.es_nps',
      'p.subdimension',
      'p.dimension_id',
      'p.opciones_json',
      'd.nombre as dimension_nombre',
      knex.raw('(SELECT COUNT(*) FROM encuesta_template_preguntas WHERE pregunta_id = p.id) as shared_count')
    )
    .join('encuesta_catalogo_preguntas as p', 'tp.pregunta_id', 'p.id')
    .leftJoin('encuesta_dimensiones as d', 'p.dimension_id', 'd.id')
    .where('tp.template_id', templateId)
    .orderBy('tp.orden', 'asc');
};

const insertPreguntaCatalogo = async (data) => {
  const [result] = await knex('encuesta_catalogo_preguntas').insert(data).returning('id');
  return result?.id || result;
};

const updatePreguntaCatalogo = async (id, data) => {
  return await knex('encuesta_catalogo_preguntas').where('id', id).update(data);
};

const updateVinculoTemplatePregunta = async (template_id, old_pregunta_id, new_pregunta_id) => {
  return await knex('encuesta_template_preguntas')
    .where('template_id', template_id)
    .andWhere('pregunta_id', old_pregunta_id)
    .update({ pregunta_id: new_pregunta_id });
};

const getMaxOrdenTemplate = async (template_id) => {
  const result = await knex('encuesta_template_preguntas')
    .max('orden as max_o')
    .where('template_id', template_id)
    .first();
  return result?.max_o || 0;
};

const upsertTemplatePregunta = async (template_id, pregunta_id, orden, requerida) => {
  // Knex doesn't have a clean cross-DB upsert for this composite key without raw,
  // Let's do select, then insert or update
  const exists = await knex('encuesta_template_preguntas')
    .where({ template_id, pregunta_id }).first();
  
  if (exists) {
    return await knex('encuesta_template_preguntas')
      .where({ template_id, pregunta_id })
      .update({ orden, requerida });
  } else {
    return await knex('encuesta_template_preguntas')
      .insert({ template_id, pregunta_id, orden, requerida });
  }
};

const eliminarPreguntaTemplate = async (template_id, pregunta_id) => {
  return await knex('encuesta_template_preguntas')
    .where({ template_id, pregunta_id })
    .del();
};

const unlinkPreguntaFromAllTemplates = async (pregunta_id) => {
  return await knex('encuesta_template_preguntas').where('pregunta_id', pregunta_id).del();
};

const softDeletePreguntaCatalogo = async (pregunta_id) => {
  return await knex('encuesta_catalogo_preguntas').where('id', pregunta_id).update({ activo: 2 });
};

const softDeleteTemplate = async (id) => {
  return await knex('encuesta_templates').where('id', id).update({ activo: 2 });
};

const eliminarDimension = async (id) => {
  return await knex('encuesta_dimensiones').where('id', id).del();
};

module.exports = {
  knex,
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
