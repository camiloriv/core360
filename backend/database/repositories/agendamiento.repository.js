const { sql, poolPromise } = require('../mssql');

const getUsuarioNombreByCorreo = async (email) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', sql.VarChar, email.toLowerCase())
    .query('SELECT TOP 1 nombre FROM usuarios WHERE LOWER(correo) = @email');
  return result.recordset[0];
};

const getContactoNombreByCorreo = async (email) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', sql.VarChar, email.toLowerCase())
    .query("SELECT TOP 1 nombre FROM empresa_contactos WHERE LOWER(correo) = @email AND nombre IS NOT NULL AND nombre != ''");
  return result.recordset[0];
};

const upsertTeamsEventoQuery = async (data) => {
  const pool = await poolPromise;
  const req = pool.request()
    .input('event_id', sql.VarChar, data.event_id)
    .input('empresa_id', sql.Int, data.empresa_id)
    .input('asunto', sql.VarChar, data.asunto)
    .input('fecha', sql.Date, data.fecha)
    .input('hora', sql.Time, data.hora)
    .input('hora_fin', sql.Time, data.hora_fin)
    .input('es_online', sql.Int, data.es_online)
    .input('asistentes', sql.VarChar, data.asistentes)
    .input('join_url', sql.VarChar, data.join_url)
    .input('usuario_id', sql.Int, data.usuario_id);

  await req.query(`
    IF EXISTS (SELECT 1 FROM teams_eventos WHERE event_id = @event_id)
    BEGIN
      UPDATE teams_eventos SET
        empresa_id = @empresa_id, asunto = @asunto, fecha = @fecha, hora = @hora,
        hora_fin = @hora_fin, estado = 'agendada', es_online = @es_online,
        asistentes = @asistentes, join_url = @join_url, ultima_sync = GETDATE()
      WHERE event_id = @event_id
    END
    ELSE
    BEGIN
      INSERT INTO teams_eventos (event_id, usuario_id, empresa_id, asunto, fecha, hora, hora_fin, estado, es_online, asistentes, join_url, ultima_sync)
      VALUES (@event_id, @usuario_id, @empresa_id, @asunto, @fecha, @hora, @hora_fin, 'agendada', @es_online, @asistentes, @join_url, GETDATE())
    END
  `);
};

const getEmpresaDominiosByEmpresaId = async (empresa_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('empresa_id', sql.Int, empresa_id)
    .query("SELECT dominio FROM empresa_dominios WHERE empresa_id = @empresa_id");
  return result.recordset;
};

const getEmpresaContactoByCorreo = async (empresa_id, email) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('empresa_id', sql.Int, empresa_id)
    .input('correo', sql.VarChar, email)
    .query("SELECT TOP 1 id, nombre FROM empresa_contactos WHERE empresa_id = @empresa_id AND correo = @correo");
  return result.recordset[0];
};

const insertEmpresaContacto = async (empresa_id, email, name = null) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('empresa_id', sql.Int, empresa_id)
    .input('correo', sql.VarChar, email)
    .input('nombre', sql.VarChar, name)
    .query("INSERT INTO empresa_contactos (empresa_id, correo, nombre) VALUES (@empresa_id, @correo, @nombre)");
  return result.rowsAffected[0];
};

const insertEmpresaSeguimientoLog = async (data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  const values = Object.values(data);
  let q = `INSERT INTO empresa_seguimiento_log (${keys.join(', ')}) VALUES (${keys.map((_, i) => `@p${i}`).join(', ')})`;
  const req = pool.request();
  values.forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const updateEmpresaSeguimiento = async (id, estado_seguimiento, fecha_concretada = undefined) => {
  const pool = await poolPromise;
  let q = "UPDATE empresas SET estado_seguimiento = @estado_seguimiento";
  const req = pool.request()
    .input('id', sql.Int, id)
    .input('estado_seguimiento', sql.VarChar, estado_seguimiento);
    
  if (fecha_concretada !== undefined) {
    q += ", fecha_concretada = @fecha_concretada";
    req.input('fecha_concretada', sql.Date, fecha_concretada);
  }
  q += " WHERE id = @id";
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const updateTeamsEventoEstado = async (event_id, estado) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('event_id', sql.VarChar, event_id)
    .input('estado', sql.VarChar, estado)
    .query("UPDATE teams_eventos SET estado = @estado WHERE event_id = @event_id");
  return result.rowsAffected[0];
};

const updateMinutasEstadoEnvio = async (teams_evento_id, oldEstado, newEstado) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('teams_evento_id', sql.Int, teams_evento_id)
    .input('oldEstado', sql.VarChar, oldEstado)
    .input('newEstado', sql.VarChar, newEstado)
    .query("UPDATE minutas SET estado_envio = @newEstado WHERE teams_evento_id = @teams_evento_id AND estado_envio = @oldEstado");
  return result.rowsAffected[0];
};

const getTeamsEventoByEventId = async (event_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('event_id', sql.VarChar, event_id)
    .query("SELECT TOP 1 id, empresa_id, fecha, estado, asunto FROM teams_eventos WHERE event_id = @event_id");
  return result.recordset[0];
};

const getEmpresaSeguimientoLogByReunionAsunto = async (reunion_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('reunion_id', sql.Int, reunion_id)
    .query("SELECT TOP 1 asunto FROM empresa_seguimiento_log WHERE reunion_id = @reunion_id AND asunto IS NOT NULL");
  return result.recordset[0];
};

const getTeamsEventosByIds = async (eventIds) => {
  if (!eventIds || eventIds.length === 0) return [];
  const pool = await poolPromise;
  const inParams = eventIds.map((_, i) => `@ev${i}`).join(', ');
  const req = pool.request();
  eventIds.forEach((id, i) => req.input(`ev${i}`, sql.VarChar, id));
  
  const result = await req.query(`
    SELECT te.id as db_id, te.event_id, te.empresa_id, emp.nombre as empresa_nombre, te.estado
    FROM teams_eventos te
    LEFT JOIN empresas emp ON te.empresa_id = emp.id
    WHERE te.event_id IN (${inParams})
  `);
  return result.recordset;
};

const getUsuarioSyncToken = async (usuarioId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, usuarioId)
    .query("SELECT TOP 1 sync_delta_token FROM usuarios WHERE id = @id");
  return result.recordset[0];
};

const updateUsuarioSyncToken = async (usuarioId, token) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, usuarioId)
    .input('token', sql.VarChar, token)
    .query("UPDATE usuarios SET sync_delta_token = @token, ultima_sincronizacion = GETDATE() WHERE id = @id");
  return result.rowsAffected[0];
};

const getEmpresaDominiosAll = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query("SELECT empresa_id, dominio FROM empresa_dominios");
  return result.recordset;
};

const getProformaInternaEmpresa = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query("SELECT TOP 1 id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
  return result.recordset[0];
};

const getSystemEmails = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query("SELECT correo FROM usuarios WHERE correo IS NOT NULL");
  return result.recordset;
};

const getTeamsEventoByIcalOrEventId = async (ical_uid, event_id) => {
  const pool = await poolPromise;
  if (ical_uid) {
    const res = await pool.request()
      .input('ical', sql.VarChar, ical_uid)
      .query("SELECT TOP 1 id, estado, event_id FROM teams_eventos WHERE ical_uid = @ical");
    if (res.recordset.length > 0) return res.recordset[0];
  }
  const result = await pool.request()
    .input('event_id', sql.VarChar, event_id)
    .query("SELECT TOP 1 id, estado, event_id FROM teams_eventos WHERE event_id = @event_id");
  return result.recordset[0];
};

const insertTeamsEventoFull = async (data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  const values = Object.values(data);
  let q = `INSERT INTO teams_eventos (${keys.join(', ')}, ultima_sync) VALUES (${keys.map((_, i) => `@p${i}`).join(', ')}, GETDATE())`;
  const req = pool.request();
  values.forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const updateTeamsEventoFull = async (id, data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  let q = `UPDATE teams_eventos SET ${keys.map((k, i) => `${k} = @p${i}`).join(', ')}, ultima_sync = GETDATE() WHERE id = @id`;
  const req = pool.request().input('id', sql.Int, id);
  Object.values(data).forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const getUltimaSincronizacion = async (usuarioId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, usuarioId)
    .query("SELECT TOP 1 ultima_sincronizacion FROM usuarios WHERE id = @id");
  return result.recordset[0];
};

const getTeamsEventosList = async (usuarioId, rol) => {
  const pool = await poolPromise;
  let q = `
    SELECT 
      te.id, te.event_id, te.asunto, te.fecha, te.hora, te.hora_fin,
      te.estado, te.es_online, te.asistentes, te.join_url, te.ultima_sync,
      te.organizador, te.body_preview, te.empresa_id,
      emp.nombre as empresa_nombre, u.nombre as usuario_nombre,
      m.id as minuta_id, m.id_minuta, m.estado_envio as minuta_estado
    FROM teams_eventos te
    LEFT JOIN empresas emp ON te.empresa_id = emp.id
    LEFT JOIN usuarios u ON te.usuario_id = u.id
    LEFT JOIN minutas m ON m.teams_evento_id = te.id
    WHERE te.estado NOT IN ('cancelada', 'excluida')
  `;
  const req = pool.request();

  if (rol === 'ejecutiva') {
    const userRes = await pool.request().input('id', sql.Int, usuarioId).query("SELECT TOP 1 correo, jefatura_id FROM usuarios WHERE id = @id");
    const user = userRes.recordset[0];
    const correoLike = user && user.correo ? `%${user.correo}%` : '%@@@@%';
    const jefaId = user && user.jefatura_id ? user.jefatura_id : -1;
    
    q += " AND (te.usuario_id = @usuarioId OR te.asistentes LIKE @correo OR te.usuario_id = @jefaId)";
    req.input('usuarioId', sql.Int, usuarioId);
    req.input('correo', sql.VarChar, correoLike);
    req.input('jefaId', sql.Int, jefaId);
  } else if (rol === 'jefatura') {
    q += " AND (te.usuario_id = @usuarioId OR te.usuario_id IN (SELECT id FROM usuarios WHERE jefatura_id = @usuarioId))";
    req.input('usuarioId', sql.Int, usuarioId);
  }

  q += " ORDER BY te.fecha DESC, te.hora DESC";
  const result = await req.query(q);
  return result.recordset;
};

const getTeamsEventoByIdOrEventId = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id_int', sql.Int, isNaN(parseInt(id)) ? 0 : parseInt(id))
    .input('id_str', sql.VarChar, String(id))
    .query("SELECT TOP 1 * FROM teams_eventos WHERE id = @id_int OR event_id = @id_str");
  return result.recordset[0];
};

const updateTeamsEventoEmpresaId = async (id, empresa_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('empresa_id', sql.Int, empresa_id)
    .query("UPDATE teams_eventos SET empresa_id = @empresa_id WHERE id = @id");
  return result.rowsAffected[0];
};

const updateEmpresaContactoNombre = async (id, nombre) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('nombre', sql.VarChar, nombre)
    .query("UPDATE empresa_contactos SET nombre = @nombre WHERE id = @id");
  return result.rowsAffected[0];
};

const insertEmpresaDominioIgnore = async (empresa_id, dominio) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('empresa_id', sql.Int, empresa_id)
    .input('dominio', sql.VarChar, dominio)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM empresa_dominios WHERE empresa_id = @empresa_id AND dominio = @dominio)
      BEGIN
        INSERT INTO empresa_dominios (empresa_id, dominio) VALUES (@empresa_id, @dominio)
      END
    `);
  return result.rowsAffected[0];
};

const getEventosSinEmpresaParaVincular = async (ignoreId) => {
  const pool = await poolPromise;
  let q = `
    SELECT te.*
    FROM teams_eventos te
    LEFT JOIN minutas m ON m.teams_evento_id = te.id
    WHERE te.empresa_id IS NULL
    AND te.estado NOT IN ('cancelada', 'excluida')
    AND m.id IS NULL
  `;
  const req = pool.request();
  if (ignoreId) {
    q += " AND te.id != @ignoreId";
    req.input('ignoreId', sql.Int, ignoreId);
  }
  const result = await req.query(q);
  return result.recordset;
};

const getEmpresaContactosByEmpresaId = async (empresa_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('empresa_id', sql.Int, empresa_id)
    .query("SELECT correo FROM empresa_contactos WHERE empresa_id = @empresa_id");
  return result.recordset;
};

const getEmpresaSeguimientoLogAgendada = async (reunion_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('reunion_id', sql.Int, reunion_id)
    .query("SELECT TOP 1 id FROM empresa_seguimiento_log WHERE reunion_id = @reunion_id AND estado = 'agendada'");
  return result.recordset[0];
};

const deleteEmpresaDominio = async (empresa_id, dominio) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('empresa_id', sql.Int, empresa_id)
    .input('dominio', sql.VarChar, dominio)
    .query("DELETE FROM empresa_dominios WHERE empresa_id = @empresa_id AND dominio = @dominio");
  return result.rowsAffected[0];
};

const deleteMinutaBorradorByEvento = async (teams_evento_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('teams_evento_id', sql.Int, teams_evento_id)
    .query("DELETE FROM minutas WHERE teams_evento_id = @teams_evento_id AND estado_envio = 'borrador'");
  return result.rowsAffected[0];
};

const deleteEmpresaSeguimientoLog = async (reunion_id, empresa_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('reunion_id', sql.Int, reunion_id)
    .input('empresa_id', sql.Int, empresa_id)
    .query("DELETE FROM empresa_seguimiento_log WHERE reunion_id = @reunion_id AND empresa_id = @empresa_id");
  return result.rowsAffected[0];
};

const getDebugData = async () => {
  const pool = await poolPromise;
  const empRes = await pool.request().query("SELECT TOP 1 id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
  const usersRes = await pool.request().query("SELECT TOP 5 id, correo, sync_delta_token, ultima_sincronizacion FROM usuarios");
  const evtRes = await pool.request().query("SELECT TOP 30 id, event_id, asunto, fecha, hora, estado, empresa_id FROM teams_eventos ORDER BY fecha DESC");
  
  return {
    emp: empRes.recordset,
    users: usersRes.recordset,
    teEvts: evtRes.recordset
  };
};

const getEmpresaSeguimientoLogConcretada = async (reunion_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('reunion_id', sql.Int, reunion_id)
    .query("SELECT TOP 1 id FROM empresa_seguimiento_log WHERE reunion_id = @reunion_id AND estado = 'concretada'");
  return result.recordset[0];
};

const updateEmpresaFechaConcretada = async (id, fecha) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('fecha', sql.Date, fecha)
    .query("UPDATE empresas SET estado_seguimiento = 'gestionada', fecha_concretada = COALESCE(fecha_concretada, @fecha) WHERE id = @id");
  return result.rowsAffected[0];
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
