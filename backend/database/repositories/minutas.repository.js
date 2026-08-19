const { sql, poolPromise } = require("../mssql");

// ============================================================
// GENERACIÓN DE ID CORRELATIVO ANUAL
// ============================================================

/**
 * Genera un ID de minuta con formato REU-YYYY-NNNN (correlativo anual).
 */
const generarIdMinuta = async () => {
    const year = new Date().getFullYear();
    const pool = await poolPromise;
    const result = await pool.request()
        .input('pattern', sql.VarChar, `REU-${year}-%`)
        .query(`
            SELECT TOP 1 id_minuta
            FROM minutas
            WHERE id_minuta LIKE @pattern
            ORDER BY CAST(SUBSTRING(id_minuta, 10, 4) AS INT) DESC
        `);

    let maxNum = 0;
    if (result.recordset.length > 0 && result.recordset[0].id_minuta) {
        const parts = result.recordset[0].id_minuta.split('-');
        if (parts.length === 3) maxNum = parseInt(parts[2], 10) || 0;
    }

    const correlativo = String(maxNum + 1).padStart(4, "0");
    return `REU-${year}-${correlativo}`;
};

// ============================================================
// BÚSQUEDA DE MINUTAS EXISTENTES
// ============================================================

/**
 * Busca una minuta por su id_minuta (REU-YYYY-NNNN).
 */
const findMinutaByIdMinuta = async (id_minuta) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id_minuta', sql.VarChar, id_minuta)
        .query("SELECT id_minuta, archivos_nombres FROM minutas WHERE id_minuta = @id_minuta");
    return result.recordset[0] || null;
};

/**
 * Busca una minuta por su teams_evento_id.
 */
const findMinutaByTeamsEventoId = async (teId) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('teId', sql.Int, teId)
        .query("SELECT id_minuta, archivos_nombres FROM minutas WHERE teams_evento_id = @teId");
    return result.recordset[0] || null;
};

/**
 * Busca un teams_evento por su event_id (string largo de Graph API).
 */
const findTeamsEventoByEventId = async (event_id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('event_id', sql.VarChar, event_id)
        .query("SELECT id FROM teams_eventos WHERE event_id = @event_id");
    return result.recordset[0] || null;
};

// ============================================================
// INSERT / UPDATE DE MINUTAS
// ============================================================

/**
 * Inserta una nueva minuta con todos sus campos.
 */
const insertMinuta = async (data) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id_minuta', sql.VarChar, data.id_minuta)
        .input('teams_evento_id', sql.Int, data.teams_evento_id)
        .input('ejecutiva_id', sql.Int, data.ejecutiva_id)
        .input('empresa_id', sql.Int, data.empresa_id)
        .input('tipo_reu', sql.VarChar, data.tipo_reu)
        .input('enviado_a', sql.NVarChar, data.enviado_a)
        .input('enviado_por', sql.VarChar, data.enviado_por)
        .input('participantes', sql.NVarChar, data.participantes)
        .input('motivo_reu', sql.NVarChar, data.motivo_reu)
        .input('minuta', sql.NVarChar, data.minuta)
        .input('form_f', sql.NVarChar, data.form_f)
        .input('fecha_reu', sql.VarChar, data.fecha_reu)
        .input('hora', sql.VarChar, data.hora)
        .input('lugar', sql.VarChar, data.lugar || 'Teams')
        .input('documentos_adjuntos', sql.NVarChar, data.documentos_adjuntos)
        .input('estado_envio', sql.VarChar, data.estado_envio)
        .input('archivos_nombres', sql.NVarChar, data.archivos_nombres)
        .input('programar_encuesta', sql.Bit, data.programar_encuesta)
        .input('encuesta_tipo', sql.VarChar, data.encuesta_tipo)
        .input('encuesta_programada_para', sql.VarChar, data.encuesta_programada_para)
        .input('encuesta_estado_envio', sql.VarChar, data.encuesta_estado_envio)
        .input('encuesta_relacionada', sql.Bit, data.encuesta_relacionada)
        .input('encuesta_destinatario', sql.VarChar, data.encuesta_destinatario)
        .input('texto_previo', sql.NVarChar, data.texto_previo)
        .input('link_video', sql.VarChar, data.link_video)
        .input('es_retroactiva', sql.Int, data.es_retroactiva)
        .query(`
            INSERT INTO minutas (
                id_minuta, teams_evento_id, ejecutiva_id, empresa_id,
                tipo_reu, enviado_a, enviado_por, participantes,
                motivo_reu, minuta, form_f,
                fecha_reu, hora, lugar, documentos_adjuntos,
                estado_envio, archivos_nombres,
                programar_encuesta, encuesta_tipo, encuesta_programada_para,
                encuesta_estado_envio, encuesta_relacionada, encuesta_destinatario,
                texto_previo, link_video, es_retroactiva
            ) VALUES (
                @id_minuta, @teams_evento_id, @ejecutiva_id, @empresa_id,
                @tipo_reu, @enviado_a, @enviado_por, @participantes,
                @motivo_reu, @minuta, @form_f,
                @fecha_reu, @hora, @lugar, @documentos_adjuntos,
                @estado_envio, @archivos_nombres,
                @programar_encuesta, @encuesta_tipo, @encuesta_programada_para,
                @encuesta_estado_envio, @encuesta_relacionada, @encuesta_destinatario,
                @texto_previo, @link_video, @es_retroactiva
            )
        `);
};

/**
 * Actualiza una minuta existente por su id_minuta.
 */
const updateMinuta = async (id_minuta, data) => {
    const pool = await poolPromise;
    await pool.request()
        .input('teams_evento_id', sql.Int, data.teams_evento_id)
        .input('ejecutiva_id', sql.Int, data.ejecutiva_id)
        .input('empresa_id', sql.Int, data.empresa_id)
        .input('tipo_reu', sql.VarChar, data.tipo_reu)
        .input('enviado_a', sql.NVarChar, data.enviado_a)
        .input('enviado_por', sql.VarChar, data.enviado_por)
        .input('participantes', sql.NVarChar, data.participantes)
        .input('motivo_reu', sql.NVarChar, data.motivo_reu)
        .input('minuta', sql.NVarChar, data.minuta)
        .input('form_f', sql.NVarChar, data.form_f)
        .input('fecha_reu', sql.VarChar, data.fecha_reu)
        .input('hora', sql.VarChar, data.hora)
        .input('lugar', sql.VarChar, data.lugar || 'Teams')
        .input('documentos_adjuntos', sql.NVarChar, data.documentos_adjuntos)
        .input('estado_envio', sql.VarChar, data.estado_envio)
        .input('archivos_nombres', sql.NVarChar, data.archivos_nombres)
        .input('programar_encuesta', sql.Bit, data.programar_encuesta)
        .input('encuesta_tipo', sql.VarChar, data.encuesta_tipo)
        .input('encuesta_programada_para', sql.VarChar, data.encuesta_programada_para)
        .input('encuesta_estado_envio', sql.VarChar, data.encuesta_estado_envio)
        .input('encuesta_relacionada', sql.Bit, data.encuesta_relacionada)
        .input('encuesta_destinatario', sql.VarChar, data.encuesta_destinatario)
        .input('texto_previo', sql.NVarChar, data.texto_previo)
        .input('link_video', sql.VarChar, data.link_video)
        .input('es_retroactiva', sql.Int, data.es_retroactiva)
        .input('id_minuta', sql.VarChar, id_minuta)
        .query(`
            UPDATE minutas SET
                teams_evento_id = @teams_evento_id, ejecutiva_id = @ejecutiva_id, empresa_id = @empresa_id,
                tipo_reu = @tipo_reu, enviado_a = @enviado_a, enviado_por = @enviado_por, participantes = @participantes,
                motivo_reu = @motivo_reu, minuta = @minuta, form_f = @form_f,
                fecha_reu = @fecha_reu, hora = @hora, lugar = @lugar, documentos_adjuntos = @documentos_adjuntos,
                estado_envio = @estado_envio, archivos_nombres = @archivos_nombres,
                programar_encuesta = @programar_encuesta, encuesta_tipo = @encuesta_tipo, encuesta_programada_para = @encuesta_programada_para,
                encuesta_estado_envio = @encuesta_estado_envio, encuesta_relacionada = @encuesta_relacionada, encuesta_destinatario = @encuesta_destinatario,
                texto_previo = @texto_previo, link_video = @link_video, es_retroactiva = @es_retroactiva
            WHERE id_minuta = @id_minuta
        `);
};

// ============================================================
// ACTUALIZACIÓN DE ESTADOS
// ============================================================

/**
 * Actualiza el estado de un teams_evento.
 */
const updateTeamsEventoEstado = async (teId, estado) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id', sql.Int, teId)
        .input('estado', sql.VarChar, estado)
        .query("UPDATE teams_eventos SET estado = @estado WHERE id = @id");
};

/**
 * Actualiza el estado_envio de una minuta.
 */
const updateMinutaEstadoEnvio = async (id_minuta, estado_envio) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id_minuta', sql.VarChar, id_minuta)
        .input('estado_envio', sql.VarChar, estado_envio)
        .query("UPDATE minutas SET estado_envio = @estado_envio WHERE id_minuta = @id_minuta");
};

// ============================================================
// ACCIONES ESPECIALES
// ============================================================

/**
 * Obtiene datos de un teams_evento por su id interno.
 */
const getTeamsEventoById = async (teId) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, teId)
        .query("SELECT event_id, empresa_id, fecha, hora, asunto, usuario_id FROM teams_eventos WHERE id = @id");
    return result.recordset[0] || null;
};

/**
 * Obtiene minuta por id_minuta con su teams_evento_id.
 */
const getMinutaConTeamsEvento = async (id_minuta) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id_minuta', sql.VarChar, id_minuta)
        .query("SELECT id, teams_evento_id FROM minutas WHERE id_minuta = @id_minuta");
    return result.recordset[0] || null;
};

/**
 * Inserta una minuta stub para "no aplica".
 */
const insertMinutaNoAplica = async (idMinuta, teId, usuario_id, ejecutiva_id, fecha, hora, empresa_id) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id_minuta', sql.VarChar, idMinuta)
        .input('teams_evento_id', sql.Int, teId)
        .input('estado_envio', sql.VarChar, 'no_aplica')
        .input('enviado_por', sql.Int, usuario_id)
        .input('ejecutiva_id', sql.Int, ejecutiva_id)
        .input('fecha_reu', sql.VarChar, fecha)
        .input('hora', sql.VarChar, hora || '00:00')
        .input('empresa_id', sql.Int, empresa_id || null)
        .query(`
            INSERT INTO minutas (id_minuta, teams_evento_id, estado_envio, enviado_por, ejecutiva_id, fecha_reu, hora, empresa_id)
            VALUES (@id_minuta, @teams_evento_id, @estado_envio, @enviado_por, @ejecutiva_id, @fecha_reu, @hora, @empresa_id)
        `);
};

/**
 * Actualiza una minuta con un comentario rápido.
 */
const updateComentarioMinuta = async (id_minuta, comentario) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id_minuta', sql.VarChar, id_minuta)
        .input('comentario', sql.NVarChar, comentario)
        .query("UPDATE minutas SET minuta = @comentario, estado_envio = 'enviado', es_retroactiva = 2 WHERE id_minuta = @id_minuta");
};

/**
 * Inserta una minuta tipo comentario para un teams_evento sin minuta previa.
 */
const insertComentarioMinuta = async (idMinuta, teId, comentario, usuario_id, ejecutiva_id, fecha, hora, empresa_id) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id_minuta', sql.VarChar, idMinuta)
        .input('teams_evento_id', sql.Int, teId)
        .input('comentario', sql.NVarChar, comentario)
        .input('enviado_por', sql.Int, usuario_id)
        .input('ejecutiva_id', sql.Int, ejecutiva_id)
        .input('fecha_reu', sql.VarChar, fecha)
        .input('hora', sql.VarChar, hora || '00:00')
        .input('empresa_id', sql.Int, empresa_id || null)
        .query(`
            INSERT INTO minutas (id_minuta, teams_evento_id, estado_envio, minuta, es_retroactiva, enviado_por, ejecutiva_id, fecha_reu, hora, empresa_id)
            VALUES (@id_minuta, @teams_evento_id, 'enviado', @comentario, 2, @enviado_por, @ejecutiva_id, @fecha_reu, @hora, @empresa_id)
        `);
};

// ============================================================
// SEGUIMIENTO DE EMPRESAS
// ============================================================

/**
 * Actualiza el estado de seguimiento de una empresa al registrar una minuta.
 */
const updateEmpresaSeguimiento = async (empresa_id, fecha_reu) => {
    const pool = await poolPromise;
    await pool.request()
        .input('fecha_reu', sql.VarChar, fecha_reu)
        .input('empresa_id', sql.Int, empresa_id)
        .query("UPDATE empresas SET estado_seguimiento = 'gestionada', fecha_concretada = COALESCE(fecha_concretada, @fecha_reu) WHERE id = @empresa_id");
};

/**
 * Inserta un log de seguimiento de empresa.
 */
const insertSeguimientoLog = async (empresa_id, fecha, usuario_id, reunion_id, asunto) => {
    const pool = await poolPromise;
    await pool.request()
        .input('empresa_id', sql.Int, empresa_id)
        .input('fecha', sql.VarChar, fecha)
        .input('usuario_id', sql.Int, usuario_id)
        .input('reunion_id', sql.VarChar, reunion_id)
        .input('asunto', sql.NVarChar, asunto || 'Minuta de reunión registrada')
        .query("INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (@empresa_id, 'gestionada', @fecha, @usuario_id, @reunion_id, @asunto)");
};

/**
 * Inserta un log de seguimiento "no_aplica".
 */
const insertSeguimientoNoAplica = async (empresa_id, fecha, usuario_id, reunion_id, asunto) => {
    const pool = await poolPromise;
    await pool.request()
        .input('empresa_id', sql.Int, empresa_id)
        .input('fecha', sql.VarChar, fecha)
        .input('usuario_id', sql.Int, usuario_id)
        .input('reunion_id', sql.VarChar, reunion_id)
        .input('asunto', sql.NVarChar, asunto || 'Reunión No Aplica')
        .query("INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (@empresa_id, 'no_aplica', @fecha, @usuario_id, @reunion_id, @asunto)");
};

// ============================================================
// AUTO-APRENDIZAJE DE CONTACTOS
// ============================================================

/**
 * Resuelve un participante: busca en empresa_contactos, crea si no existe.
 */
const resolverParticipante = async (empresa_id, email, nombreTeams) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('empresa_id', sql.Int, empresa_id)
        .input('email', sql.VarChar, email)
        .query("SELECT TOP 1 id, nombre FROM empresa_contactos WHERE empresa_id = @empresa_id AND correo = @email");

    if (result.recordset.length > 0) {
        const contacto = result.recordset[0];
        if (contacto.nombre) {
            return contacto.nombre;
        } else if (nombreTeams) {
            await pool.request()
                .input('nombre', sql.VarChar, nombreTeams)
                .input('id', sql.Int, contacto.id)
                .query("UPDATE empresa_contactos SET nombre = @nombre WHERE id = @id");
            return nombreTeams;
        }
        return email;
    } else {
        await pool.request()
            .input('empresa_id', sql.Int, empresa_id)
            .input('correo', sql.VarChar, email)
            .input('nombre', sql.VarChar, nombreTeams || null)
            .query("INSERT INTO empresa_contactos (empresa_id, correo, nombre) VALUES (@empresa_id, @correo, @nombre)");
        return nombreTeams || email;
    }
};

/**
 * Auto-aprende un contacto/dominio si no existe en empresa_contactos.
 */
const autoAprenderContacto = async (empresa_id, correo) => {
    const pool = await poolPromise;
    await pool.request()
        .input('empresa_id', sql.Int, empresa_id)
        .input('correo', sql.VarChar, correo.toLowerCase())
        .query(`
            IF NOT EXISTS (SELECT 1 FROM empresa_contactos WHERE empresa_id = @empresa_id AND correo = @correo)
            INSERT INTO empresa_contactos (empresa_id, correo) VALUES (@empresa_id, @correo)
        `);
};

module.exports = {
    generarIdMinuta,
    findMinutaByIdMinuta,
    findMinutaByTeamsEventoId,
    findTeamsEventoByEventId,
    insertMinuta,
    updateMinuta,
    updateTeamsEventoEstado,
    updateMinutaEstadoEnvio,
    getTeamsEventoById,
    getMinutaConTeamsEvento,
    insertMinutaNoAplica,
    updateComentarioMinuta,
    insertComentarioMinuta,
    updateEmpresaSeguimiento,
    insertSeguimientoLog,
    insertSeguimientoNoAplica,
    resolverParticipante,
    autoAprenderContacto
};
