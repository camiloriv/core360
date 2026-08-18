const knex = require('../knex');

const obtenerTemplatesActivos = async () => {
  return await knex('encuesta_templates')
    .select('id', 'nombre', 'version')
    .where('activo', 1);
};

const getTemplateIdByName = async (tipo_encuesta) => {
  return await knex('encuesta_templates')
    .select('id')
    .where('nombre', tipo_encuesta)
    .andWhere('activo', 1)
    .first();
};

const insertEncuesta = async (data) => {
  const [id] = await knex('encuestas').insert(data).returning('id');
  return id?.id || id; // Handle depending on if SQL Server returns object or array of ids
};

const getEncuestaConContexto = async (token) => {
  return await knex('encuestas as e')
    .select(
      'e.id',
      'e.template_id',
      'emp.nombre as empresa',
      'ej.nombre as ejecutiva',
      't.nombre as template',
      knex.raw("CASE WHEN e.estado = 'completada' THEN 1 ELSE 0 END as completada")
    )
    .leftJoin('empresas as emp', 'emp.id', 'e.empresa_id')
    .leftJoin('usuarios as ej', 'ej.id', 'e.ejecutiva_id')
    .leftJoin('encuesta_templates as t', 't.id', 'e.template_id')
    .where('e.token', token)
    .andWhere('e.activo', 1)
    .first();
};

const getPreguntasPorTemplate = async (template_id) => {
  return await knex('encuesta_template_preguntas as tp')
    .select(
      'p.id',
      'p.texto',
      'p.tipo',
      'p.opciones_json',
      'tp.requerida',
      'p.escala'
    )
    .join('encuesta_catalogo_preguntas as p', 'tp.pregunta_id', 'p.id')
    .where('tp.template_id', template_id)
    .orderBy('tp.orden');
};

const marcarEncuestaCompletada = async (encuesta_id, trx) => {
  const query = knex('encuestas')
    .where('id', encuesta_id)
    .update({
      estado: 'completada',
      fecha_respuesta: knex.fn.now()
    });
  if (trx) return await query.transacting(trx);
  return await query;
};

const insertRespuesta = async (data, trx) => {
  const query = knex('encuesta_respuestas').insert(data);
  if (trx) return await query.transacting(trx);
  return await query;
};

const getTodasLasRespuestas = async (usuario_id, rol) => {
  let query = knex('encuestas as e')
    .select(
      'e.id',
      'e.token',
      'e.estado',
      'e.activo',
      'e.enviado_a',
      'e.reunion_id',
      'e.fecha_creacion',
      'e.fecha_respuesta',
      't.nombre as titulo',
      'emp.nombre as empresa',
      'e.empresa_id',
      'e.ejecutiva_id',
      'emp.jefatura_id as jefatura_id',
      'ej.nombre as ejecutiva',
      'j.nombre as jefatura'
    )
    .join('encuesta_templates as t', 'e.template_id', 't.id')
    .leftJoin('empresas as emp', 'e.empresa_id', 'emp.id')
    .leftJoin('usuarios as ej', 'e.ejecutiva_id', 'ej.id')
    .leftJoin('usuarios as j', 'emp.jefatura_id', 'j.id')
    .orderBy('e.fecha_creacion', 'desc');

  if (rol === 'ejecutiva') {
    query.where(function() {
      this.where('emp.jefatura_id', knex.raw('(SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)', [usuario_id]))
          .orWhereIn('emp.jefatura_id', knex('usuario_gerencias').select('gerencia_id').where('usuario_id', knex.raw('(SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)', [usuario_id])))
          .orWhere('e.ejecutiva_id', usuario_id);
    });
  } else if (rol === 'jefatura') {
    query.where(function() {
      this.where('emp.jefatura_id', usuario_id)
          .orWhereIn('emp.jefatura_id', knex('usuario_gerencias').select('gerencia_id').where('usuario_id', usuario_id));
    });
  } else if (rol === 'gerencia') {
    query.where(function() {
      this.whereIn('j.id', function() {
        this.select('usuario_id').from('usuario_gerencias').where('gerencia_id', usuario_id)
        .union(function() {
          this.select('ug2.usuario_id').from('usuario_gerencias as ug2')
          .whereIn('ug2.gerencia_id', function() {
            this.select('ug.usuario_id').from('usuario_gerencias as ug')
            .join('usuarios as u', 'ug.usuario_id', 'u.id')
            .where('ug.gerencia_id', usuario_id).andWhere('u.permisos', 'gerencia');
          });
        });
      })
      .orWhere('emp.jefatura_id', usuario_id);
    });
  }

  return await query;
};

const updateEstadoEncuesta = async (id, activo) => {
  return await knex('encuestas').where('id', id).update({ activo: activo ? 1 : 0 });
};

const updateEnviadoA = async (id, email) => {
  return await knex('encuestas').where('id', id).update({ enviado_a: email });
};

const countTotalEnvios = async () => {
  const result = await knex('encuestas').count('* as total').first();
  return result.total;
};

const getCatalogoPreguntas = async () => {
  return await knex('encuesta_catalogo_preguntas as q')
    .select('q.id', 'q.texto', 'q.tipo', 'd.nombre as dimension')
    .leftJoin('encuesta_dimensiones as d', 'q.dimension_id', 'd.id')
    .whereRaw('COALESCE(q.activo, 1) != 2');
};

const getCorreosBcc = async (id) => {
  return await knex('encuestas as enc')
    .select('e.correo as ejecutiva_correo', 'j.correo as jefatura_correo')
    .join('usuarios as e', 'enc.ejecutiva_id', 'e.id')
    .leftJoin('usuarios as j', 'e.jefatura_id', 'j.id')
    .where('enc.id', id)
    .first();
};

module.exports = {
  knex,
  obtenerTemplatesActivos,
  getTemplateIdByName,
  insertEncuesta,
  getEncuestaConContexto,
  getPreguntasPorTemplate,
  marcarEncuestaCompletada,
  insertRespuesta,
  getTodasLasRespuestas,
  updateEstadoEncuesta,
  updateEnviadoA,
  countTotalEnvios,
  getCatalogoPreguntas,
  getCorreosBcc
};
