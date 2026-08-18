const knex = require('../knex');

const getUsuarioNombreByCorreo = async (email) => {
  return await knex('usuarios').select('nombre').whereRaw('LOWER(correo) = ?', [email]).first();
};

const getContactoNombreByCorreo = async (email) => {
  return await knex('empresa_contactos')
    .select('nombre')
    .whereRaw('LOWER(correo) = ?', [email])
    .whereNotNull('nombre')
    .whereNot('nombre', '')
    .first();
};

const upsertTeamsEventoQuery = async (data) => {
  // Knex doesn't have a cross-db "ON DUPLICATE KEY UPDATE" that covers all fields nicely across MySQL/SQL Server natively in older versions.
  // We can write a custom knex raw or do a select then insert/update.
  const exists = await knex('teams_eventos').select('id').where('event_id', data.event_id).first();
  if (exists) {
    await knex('teams_eventos').where('id', exists.id).update({
      empresa_id: data.empresa_id,
      asunto: data.asunto,
      fecha: data.fecha,
      hora: data.hora,
      hora_fin: data.hora_fin,
      estado: 'agendada',
      es_online: data.es_online,
      asistentes: data.asistentes,
      join_url: data.join_url,
      ultima_sync: knex.fn.now()
    });
  } else {
    await knex('teams_eventos').insert({
      event_id: data.event_id,
      usuario_id: data.usuario_id,
      empresa_id: data.empresa_id,
      asunto: data.asunto,
      fecha: data.fecha,
      hora: data.hora,
      hora_fin: data.hora_fin,
      estado: 'agendada',
      es_online: data.es_online,
      asistentes: data.asistentes,
      join_url: data.join_url,
      ultima_sync: knex.fn.now()
    });
  }
};

const getEmpresaDominiosByEmpresaId = async (empresa_id) => {
  return await knex('empresa_dominios').select('dominio').where('empresa_id', empresa_id);
};

const getEmpresaContactoByCorreo = async (empresa_id, email) => {
  return await knex('empresa_contactos').select('id', 'nombre').where({ empresa_id, correo: email }).first();
};

const insertEmpresaContacto = async (empresa_id, email, name = null) => {
  return await knex('empresa_contactos').insert({ empresa_id, correo: email, nombre: name });
};

const insertEmpresaSeguimientoLog = async (data) => {
  return await knex('empresa_seguimiento_log').insert(data);
};

const updateEmpresaSeguimiento = async (id, estado_seguimiento, fecha_concretada = undefined) => {
  const updateData = { estado_seguimiento };
  if (fecha_concretada !== undefined) updateData.fecha_concretada = fecha_concretada;
  return await knex('empresas').where('id', id).update(updateData);
};

const updateTeamsEventoEstado = async (event_id, estado) => {
  return await knex('teams_eventos').where('event_id', event_id).update({ estado });
};

const updateMinutasEstadoEnvio = async (teams_evento_id, oldEstado, newEstado) => {
  return await knex('minutas').where({ teams_evento_id, estado_envio: oldEstado }).update({ estado_envio: newEstado });
};

const getTeamsEventoByEventId = async (event_id) => {
  return await knex('teams_eventos').select('id', 'empresa_id', 'fecha', 'estado', 'asunto').where('event_id', event_id).first();
};

const getEmpresaSeguimientoLogByReunionAsunto = async (reunion_id) => {
  return await knex('empresa_seguimiento_log').select('asunto').where('reunion_id', reunion_id).whereNotNull('asunto').first();
};

const getTeamsEventosByIds = async (eventIds) => {
  return await knex('teams_eventos as te')
    .select('te.id as db_id', 'te.event_id', 'te.empresa_id', 'emp.nombre as empresa_nombre', 'te.estado')
    .leftJoin('empresas as emp', 'te.empresa_id', 'emp.id')
    .whereIn('te.event_id', eventIds);
};

const getUsuarioSyncToken = async (usuarioId) => {
  return await knex('usuarios').select('sync_delta_token').where('id', usuarioId).first();
};

const updateUsuarioSyncToken = async (usuarioId, token) => {
  return await knex('usuarios').where('id', usuarioId).update({ sync_delta_token: token, ultima_sincronizacion: knex.fn.now() });
};

const getEmpresaDominiosAll = async () => {
  return await knex('empresa_dominios').select('empresa_id', 'dominio');
};

const getProformaInternaEmpresa = async () => {
  return await knex('empresas').select('id').where('nombre', 'PROFORMA INTERNA').first();
};

const getSystemEmails = async () => {
  return await knex('usuarios').select('correo').whereNotNull('correo');
};

const getTeamsEventoByIcalOrEventId = async (ical_uid, event_id) => {
  if (ical_uid) {
    const res = await knex('teams_eventos').select('id', 'estado', 'event_id').where('ical_uid', ical_uid).first();
    if (res) return res;
  }
  return await knex('teams_eventos').select('id', 'estado', 'event_id').where('event_id', event_id).first();
};

const insertTeamsEventoFull = async (data) => {
  return await knex('teams_eventos').insert({ ...data, ultima_sync: knex.fn.now() });
};

const updateTeamsEventoFull = async (id, data) => {
  return await knex('teams_eventos').where('id', id).update({ ...data, ultima_sync: knex.fn.now() });
};

const getUltimaSincronizacion = async (usuarioId) => {
  return await knex('usuarios').select('ultima_sincronizacion').where('id', usuarioId).first();
};

const getTeamsEventosList = async (usuarioId, rol) => {
  let query = knex('teams_eventos as te')
    .select(
      'te.id', 'te.event_id', 'te.asunto', 'te.fecha', 'te.hora', 'te.hora_fin',
      'te.estado', 'te.es_online', 'te.asistentes', 'te.join_url', 'te.ultima_sync',
      'te.organizador', 'te.body_preview', 'te.empresa_id',
      'emp.nombre as empresa_nombre', 'u.nombre as usuario_nombre',
      'm.id as minuta_id', 'm.id_minuta', 'm.estado_envio as minuta_estado'
    )
    .leftJoin('empresas as emp', 'te.empresa_id', 'emp.id')
    .leftJoin('usuarios as u', 'te.usuario_id', 'u.id')
    .leftJoin('minutas as m', 'm.teams_evento_id', 'te.id')
    .whereNotIn('te.estado', ['cancelada', 'excluida'])
    .orderBy('te.fecha', 'desc')
    .orderBy('te.hora', 'desc');

  if (rol === 'ejecutiva') {
    const user = await knex('usuarios').select('correo', 'jefatura_id').where('id', usuarioId).first();
    query.where(function() {
      this.where('te.usuario_id', usuarioId)
        .orWhere('te.asistentes', 'like', `%${user ? user.correo : ''}%`)
        .orWhere('te.usuario_id', user ? user.jefatura_id : -1);
    });
  } else if (rol === 'jefatura') {
    query.where(function() {
      this.where('te.usuario_id', usuarioId)
        .orWhereIn('te.usuario_id', knex('usuarios').select('id').where('jefatura_id', usuarioId));
    });
  }
  return await query;
};

const getTeamsEventoByIdOrEventId = async (id) => {
  return await knex('teams_eventos').where('id', id).orWhere('event_id', id).first();
};

const updateTeamsEventoEmpresaId = async (id, empresa_id) => {
  return await knex('teams_eventos').where('id', id).update({ empresa_id });
};

const updateEmpresaContactoNombre = async (id, nombre) => {
  return await knex('empresa_contactos').where('id', id).update({ nombre });
};

const insertEmpresaDominioIgnore = async (empresa_id, dominio) => {
  const exists = await knex('empresa_dominios').where({ empresa_id, dominio }).first();
  if (!exists) {
    return await knex('empresa_dominios').insert({ empresa_id, dominio });
  }
};

const getEventosSinEmpresaParaVincular = async (ignoreId) => {
  return await knex('teams_eventos as te')
    .select('te.*')
    .leftJoin('minutas as m', 'm.teams_evento_id', 'te.id')
    .whereNull('te.empresa_id')
    .whereNotIn('te.estado', ['cancelada', 'excluida'])
    .whereNull('m.id')
    .whereNot('te.id', ignoreId);
};

const getEmpresaContactosByEmpresaId = async (empresa_id) => {
  return await knex('empresa_contactos').select('correo').where('empresa_id', empresa_id);
};

const getEmpresaSeguimientoLogAgendada = async (reunion_id) => {
  return await knex('empresa_seguimiento_log').select('id').where({ reunion_id, estado: 'agendada' }).first();
};

const deleteEmpresaDominio = async (empresa_id, dominio) => {
  return await knex('empresa_dominios').where({ empresa_id, dominio }).del();
};

const deleteMinutaBorradorByEvento = async (teams_evento_id) => {
  return await knex('minutas').where({ teams_evento_id, estado_envio: 'borrador' }).del();
};

const deleteEmpresaSeguimientoLog = async (reunion_id, empresa_id) => {
  return await knex('empresa_seguimiento_log').where({ reunion_id, empresa_id }).del();
};

const getDebugData = async () => {
  const emp = await knex('empresas').select('id').where('nombre', 'PROFORMA INTERNA');
  const users = await knex('usuarios').select('id', 'correo', 'sync_delta_token', 'ultima_sincronizacion').limit(5);
  const teEvts = await knex('teams_eventos').select('id', 'event_id', 'asunto', 'fecha', 'hora', 'estado', 'empresa_id').orderBy('fecha', 'desc').limit(30);
  return { emp, users, teEvts };
};

const getEmpresaSeguimientoLogConcretada = async (reunion_id) => {
  return await knex('empresa_seguimiento_log').select('id').where({ reunion_id, estado: 'concretada' }).first();
};

const updateEmpresaFechaConcretada = async (id, fecha) => {
  return await knex('empresas')
    .where('id', id)
    .update({ 
      estado_seguimiento: 'gestionada', 
      fecha_concretada: knex.raw('COALESCE(fecha_concretada, ?)', [fecha]) 
    });
};

module.exports = {
  getUsuarioNombreByCorreo,
  getContactoNombreByCorreo,
  upsertTeamsEventoQuery,
  getEmpresaDominiosByEmpresaId,
  getEmpresaContactoByCorreo,
  insertEmpresaContacto,
  insertEmpresaSeguimientoLog,
  updateEmpresaSeguimiento,
  updateTeamsEventoEstado,
  updateMinutasEstadoEnvio,
  getTeamsEventoByEventId,
  getEmpresaSeguimientoLogByReunionAsunto,
  getTeamsEventosByIds,
  getUsuarioSyncToken,
  updateUsuarioSyncToken,
  getEmpresaDominiosAll,
  getProformaInternaEmpresa,
  getSystemEmails,
  getTeamsEventoByIcalOrEventId,
  insertTeamsEventoFull,
  updateTeamsEventoFull,
  getUltimaSincronizacion,
  getTeamsEventosList,
  getTeamsEventoByIdOrEventId,
  updateTeamsEventoEmpresaId,
  updateEmpresaContactoNombre,
  insertEmpresaDominioIgnore,
  getEventosSinEmpresaParaVincular,
  getEmpresaContactosByEmpresaId,
  getEmpresaSeguimientoLogAgendada,
  deleteEmpresaDominio,
  deleteMinutaBorradorByEvento,
  deleteEmpresaSeguimientoLog,
  getDebugData,
  getEmpresaSeguimientoLogConcretada,
  updateEmpresaFechaConcretada
};
