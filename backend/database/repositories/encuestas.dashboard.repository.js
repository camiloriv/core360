const knex = require('../knex');

const applyRbacFilter = (query, usuario_id, rol) => {
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
};

const obtenerTodasLasRespuestas = async () => {
  return await knex('encuestas as e')
    .select(
      'e.id',
      'e.token',
      'e.estado',
      'e.activo',
      'e.fecha_creacion',
      'e.fecha_respuesta',
      't.nombre as titulo',
      'emp.nombre as empresa',
      'ej.nombre as ejecutiva',
      'e.enviado_a'
    )
    .join('encuesta_templates as t', 'e.template_id', 't.id')
    .leftJoin('empresas as emp', 'e.empresa_id', 'emp.id')
    .leftJoin('usuarios as ej', 'e.ejecutiva_id', 'ej.id')
    .orderBy('e.fecha_creacion', 'desc');
};

const obtenerPromediosPorDimension = async (usuario_id, rol) => {
  let query = knex('encuesta_respuestas as r')
    .select('d.nombre as dimension')
    .avg('r.valor_numerico as promedio')
    .join('encuesta_catalogo_preguntas as q', 'r.pregunta_id', 'q.id')
    .join('encuesta_dimensiones as d', 'q.dimension_id', 'd.id')
    .join('encuestas as e', 'r.encuesta_id', 'e.id')
    .leftJoin('empresas as emp', 'e.empresa_id', 'emp.id')
    .leftJoin('usuarios as j', 'emp.jefatura_id', 'j.id')
    .whereNotNull('r.valor_numerico')
    .groupBy('d.id', 'd.nombre');

  applyRbacFilter(query, usuario_id, rol);
  return await query;
};

const obtenerRankingEjecutivas = async (usuario_id, rol) => {
  let query = knex('encuesta_respuestas as r')
    .select('j.nombre as jefatura')
    .avg('r.valor_numerico as promedio')
    .countDistinct('e.id as total_encuestas')
    .join('encuestas as e', 'r.encuesta_id', 'e.id')
    .leftJoin('empresas as emp', 'e.empresa_id', 'emp.id')
    .leftJoin('usuarios as j', 'emp.jefatura_id', 'j.id')
    .whereNotNull('r.valor_numerico')
    .groupBy('j.id', 'j.nombre')
    .orderBy('promedio', 'desc');

  applyRbacFilter(query, usuario_id, rol);
  return await query;
};

const obtenerDetalleRespuestas = async (usuario_id, rol) => {
  let query = knex('encuesta_respuestas as r')
    .select(
      'r.encuesta_id',
      knex.raw("COALESCE(q.texto, '(Pregunta eliminada de la biblioteca maestro)') as pregunta"),
      'r.valor_texto',
      'r.valor_numerico'
    )
    .leftJoin('encuesta_catalogo_preguntas as q', 'r.pregunta_id', 'q.id')
    .join('encuestas as e', 'r.encuesta_id', 'e.id')
    .leftJoin('empresas as emp', 'e.empresa_id', 'emp.id')
    .leftJoin('usuarios as j', 'emp.jefatura_id', 'j.id');

  applyRbacFilter(query, usuario_id, rol);
  return await query;
};

module.exports = {
  obtenerTodasLasRespuestas,
  obtenerPromediosPorDimension,
  obtenerRankingEjecutivas,
  obtenerDetalleRespuestas
};
