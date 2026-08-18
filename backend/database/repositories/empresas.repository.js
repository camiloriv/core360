const knex = require('../knex');

const getEmpresasWithFilters = async (gerencia_id, jefatura_id) => {
  let query = knex('empresas as e')
    .select('e.*', 'j.nombre as jefatura_nombre', 'z.nombre as zona_nombre')
    .leftJoin('usuarios as j', 'e.jefatura_id', 'j.id')
    .leftJoin('zonas as z', 'e.zona_id', 'z.id')
    .orderBy('e.nombre', 'asc');

  if (gerencia_id) {
    query.where(function() {
      this.whereIn('j.id', function() {
        this.select('usuario_id').from('usuario_gerencias').where('gerencia_id', gerencia_id)
        .union(function() {
          this.select('ug2.usuario_id').from('usuario_gerencias as ug2')
          .whereIn('ug2.gerencia_id', function() {
            this.select('ug.usuario_id').from('usuario_gerencias as ug')
            .join('usuarios as u', 'ug.usuario_id', 'u.id')
            .where('ug.gerencia_id', gerencia_id).andWhere('u.permisos', 'gerencia');
          });
        });
      })
      .orWhere('e.jefatura_id', gerencia_id);
    });
  } else if (jefatura_id) {
    query.where(function() {
      this.where('e.jefatura_id', jefatura_id)
      .orWhereIn('e.jefatura_id', knex('usuario_gerencias').select('gerencia_id').where('usuario_id', jefatura_id));
    });
  }
  return await query;
};

const getEmpresasPorEjecutiva = async (id_ejecutiva) => {
  return await knex('empresas as emp')
    .select('emp.*')
    .join('usuarios as e', function() {
      this.on('emp.jefatura_id', '=', 'e.jefatura_id')
      .orOnIn('emp.jefatura_id', knex('usuario_gerencias').select('gerencia_id').whereRaw('usuario_id = e.jefatura_id'));
    })
    .where('e.id', id_ejecutiva)
    .orderBy('emp.nombre', 'asc');
};

const getEmpresasPorJefatura = async (id_jefatura) => {
  return await knex('empresas')
    .where('jefatura_id', id_jefatura)
    .orWhereIn('jefatura_id', knex('usuario_gerencias').select('gerencia_id').where('usuario_id', id_jefatura))
    .orderBy('nombre', 'asc');
};

const updateEmpresa = async (id, data) => {
  return await knex('empresas').where('id', id).update(data);
};

const insertEmpresaSeguimientoLog = async (data) => {
  return await knex('empresa_seguimiento_log').insert(data);
};

const getEmpresaFechaSeguimiento = async (id) => {
  return await knex('empresas').select('fecha_solicitada', 'fecha_concretada').where('id', id).first();
};

const getHistorialSeguimiento = async (empresa_id) => {
  return await knex('empresa_seguimiento_log as log')
    .select('log.*', 'u.nombre as usuario_nombre')
    .leftJoin('usuarios as u', 'log.usuario_id', 'u.id')
    .where('log.empresa_id', empresa_id)
    .orderBy('log.fecha', 'desc')
    .orderBy('log.created_at', 'desc');
};

const deleteSeguimientoLog = async (id) => {
  return await knex('empresa_seguimiento_log').where('id', id).del();
};

const updateLogSeguimientoByReunion = async (reunionId, data) => {
  return await knex('empresa_seguimiento_log').where('reunion_id', reunionId).update(data);
};

const updateLogSeguimientoByIds = async (ids, data) => {
  return await knex('empresa_seguimiento_log').whereIn('id', ids).update(data);
};

const getLogsEmpresasFilter = async (periodo, anio) => {
  let query = knex('empresa_seguimiento_log as log')
    .select('log.*', 'u.nombre as usuario_nombre')
    .leftJoin('usuarios as u', 'log.usuario_id', 'u.id')
    .orderBy('log.fecha', 'desc')
    .orderBy('log.created_at', 'desc');

  if (periodo) {
    // Assuming MySQL specific DATE_FORMAT, for cross-DB we might need raw or specific functions.
    // For SQL server, FORMAT(log.fecha, 'yyyy-MM') would be used. Let's use knex raw that works for both or just use raw.
    // Actually, knex allows whereRaw for flexibility.
    query.whereRaw(`DATE_FORMAT(log.fecha, '%Y-%m') = ?`, [periodo]); // Note: DATE_FORMAT is MySQL, will need to be fixed for SQL Server later if actually used
  } else if (anio) {
    query.whereRaw('YEAR(log.fecha) = ?', [parseInt(anio)]);
  }

  return await query;
};

const insertEmpresa = async (data) => {
  const [result] = await knex('empresas').insert(data).returning('id');
  return result?.id || result;
};

const deleteEmpresa = async (id) => {
  return await knex('empresas').where('id', id).del();
};

const updateEmpresasJefatura = async (target_jefatura_id, source_jefatura_id, empresa_ids) => {
  let query = knex('empresas').update({ jefatura_id: target_jefatura_id });
  if (empresa_ids && empresa_ids.length > 0) {
    query.whereIn('id', empresa_ids);
  } else if (source_jefatura_id) {
    query.where('jefatura_id', source_jefatura_id);
  }
  return await query;
};

const getZonasAll = async () => {
  return await knex('zonas').select('id', 'nombre');
};

const getUsuariosBasic = async () => {
  return await knex('usuarios').select('id', 'nombre', 'correo');
};

const getEmpresasNombres = async () => {
  return await knex('empresas').select('nombre');
};

const insertEmpresasBatch = async (values) => {
  // values is an array of objects for knex
  return await knex('empresas').insert(values);
};

const getJefaturaEmpresa = async (id) => {
  return await knex('empresas').select('jefatura_id').where('id', id).first();
};

const getUsuariosAsignados = async (jefaturaId) => {
  return await knex('usuarios')
    .select('id', 'nombre', 'permisos', 'correo', 'jefatura_id')
    .where('id', jefaturaId)
    .orWhere(function() {
      this.where('jefatura_id', jefaturaId).andWhere('permisos', 'ejecutiva');
    })
    .orWhere(function() {
      this.whereIn('id', knex('usuario_gerencias').select('gerencia_id').where('usuario_id', jefaturaId))
      .andWhere('permisos', 'gerencia');
    })
    .orderBy('permisos', 'desc')
    .orderBy('nombre', 'asc');
};

const getVinculacionesEmpresas = async () => {
  return await knex('empresas as e')
    .select('e.id', 'e.nombre', 'e.jefatura_id', 'j.nombre as jefatura_nombre', 'e.zona_id', 'z.nombre as zona_nombre')
    .leftJoin('usuarios as j', 'e.jefatura_id', 'j.id')
    .leftJoin('zonas as z', 'e.zona_id', 'z.id')
    .orderBy('e.nombre', 'asc');
};

const getEmpresaDominios = async () => {
  return await knex('empresa_dominios').select('id', 'empresa_id', 'dominio');
};

const getEmpresaContactos = async () => {
  return await knex('empresa_contactos').select('id', 'empresa_id', 'correo', 'nombre');
};

module.exports = {
  knex,
  getEmpresasWithFilters,
  getEmpresasPorEjecutiva,
  getEmpresasPorJefatura,
  updateEmpresa,
  insertEmpresaSeguimientoLog,
  getEmpresaFechaSeguimiento,
  getHistorialSeguimiento,
  deleteSeguimientoLog,
  updateLogSeguimientoByReunion,
  updateLogSeguimientoByIds,
  getLogsEmpresasFilter,
  insertEmpresa,
  deleteEmpresa,
  updateEmpresasJefatura,
  getZonasAll,
  getUsuariosBasic,
  getEmpresasNombres,
  insertEmpresasBatch,
  getJefaturaEmpresa,
  getUsuariosAsignados,
  getVinculacionesEmpresas,
  getEmpresaDominios,
  getEmpresaContactos
};
