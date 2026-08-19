const { sql, poolPromise } = require("../mssql");

// ============================================================
// SQL BASE — Reutilizado por listado y detalle
// ============================================================

const BASE_REUNION_SQL = `
    SELECT
        te.id                           AS teams_evento_id,
        te.event_id,
        te.ical_uid,
        te.asunto                       AS asunto_teams,
        te.fecha                        AS fecha_reu,
        te.hora,
        te.hora_fin,
        te.estado                       AS estado_teams,
        te.es_online,
        te.asistentes,
        te.join_url,
        te.empresa_id,
        te.usuario_id                   AS ejecutiva_id,
        te.ultima_sync,
        emp.nombre                      AS empresa_nombre,
        u.nombre                        AS ejecutiva_nombre,
        u.permisos                      AS ejecutiva_permisos,
        j.nombre                        AS jefatura_nombre,
        uj.nombre                       AS ejecutiva_jefatura_nombre,
        te.body_preview,
        te.organizador,

        m.id                            AS minuta_row_id,
        COALESCE(m.id_minuta, CAST(te.id AS CHAR)) AS id_reunion,
        m.tipo_reu,
        m.enviado_a,
        m.enviado_por,
        m.participantes,
        m.motivo_reu,
        m.minuta,
        m.form_f,
        m.lugar,
        m.estado_envio                  AS minuta_estado,
        m.archivos_nombres,
        m.documentos_adjuntos,
        m.programar_encuesta,
        m.encuesta_tipo,
        m.encuesta_programada_para,
        m.encuesta_estado_envio,
        m.encuesta_relacionada,
        m.encuesta_destinatario,
        m.texto_previo,
        m.link_video,
        m.es_retroactiva,
        m.created_at,

        CASE
            WHEN te.estado = 'cancelada'  THEN 'cancelada'
            WHEN te.estado = 'excluida'   THEN 'excluida'
            WHEN m.estado_envio = 'enviado'   THEN 'enviado'
            WHEN m.estado_envio = 'no_aplica' THEN 'no_aplica'
            WHEN m.estado_envio = 'borrador'  THEN 'borrador'
            WHEN COALESCE(te.empresa_id, 0) = 0 THEN 'huerfana'
            WHEN te.estado = 'pasada'         THEN 'borrador'
            ELSE te.estado
        END                             AS estado_envio,

        te.estado                       AS te_estado,
        CASE WHEN COALESCE(te.empresa_id, 0) = 0 AND te.estado != 'excluida' THEN 1 ELSE 0 END AS is_huerfana,
        CASE WHEN m.id IS NOT NULL THEN 1 ELSE 0 END AS tiene_minuta,
        CASE WHEN COALESCE(te.empresa_id, 0) != 0 THEN 1 ELSE 0 END AS tiene_empresa

    FROM teams_eventos te
    LEFT JOIN empresas emp ON te.empresa_id = emp.id
    LEFT JOIN usuarios u ON te.usuario_id = u.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    LEFT JOIN usuarios uj ON u.jefatura_id = uj.id
    LEFT JOIN minutas m ON m.teams_evento_id = te.id
`;

const BASE_MINUTA_STANDALONE_SQL = `
    SELECT
        NULL                            AS teams_evento_id,
        NULL                            AS event_id,
        NULL                            AS ical_uid,
        m.motivo_reu                    AS asunto_teams,
        m.fecha_reu                     AS fecha_reu,
        m.hora                          AS hora,
        m.hora                          AS hora_fin,
        'borrador'                      AS estado_teams,
        0                               AS es_online,
        m.participantes                 AS asistentes,
        NULL                            AS join_url,
        m.empresa_id                    AS empresa_id,
        m.ejecutiva_id                  AS ejecutiva_id,
        NULL                            AS ultima_sync,
        emp.nombre                      AS empresa_nombre,
        u.nombre                        AS ejecutiva_nombre,
        u.permisos                      AS ejecutiva_permisos,
        j.nombre                        AS jefatura_nombre,
        uj.nombre                       AS ejecutiva_jefatura_nombre,
        NULL                            AS body_preview,
        NULL                            AS organizador,

        m.id                            AS minuta_row_id,
        m.id_minuta                     AS id_reunion,
        m.tipo_reu,
        m.enviado_a,
        m.enviado_por,
        m.participantes,
        m.motivo_reu,
        m.minuta,
        m.form_f,
        m.lugar,
        m.estado_envio                  AS minuta_estado,
        m.archivos_nombres,
        m.documentos_adjuntos,
        m.programar_encuesta,
        m.encuesta_tipo,
        m.encuesta_programada_para,
        m.encuesta_estado_envio,
        m.encuesta_relacionada,
        m.encuesta_destinatario,
        m.texto_previo,
        m.link_video,
        m.es_retroactiva,
        m.created_at,

        m.estado_envio                  AS estado_envio,
        'borrador'                      AS te_estado,
        0                               AS is_huerfana,
        1                               AS tiene_minuta,
        CASE WHEN COALESCE(m.empresa_id, 0) != 0 THEN 1 ELSE 0 END AS tiene_empresa

    FROM minutas m
    LEFT JOIN empresas emp ON m.empresa_id = emp.id
    LEFT JOIN usuarios u ON m.ejecutiva_id = u.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    LEFT JOIN usuarios uj ON u.jefatura_id = uj.id
`;

// ============================================================
// HELPERS — Control de acceso por rol
// ============================================================

/**
 * Construye la cláusula WHERE para filtrar teams_eventos por rol de usuario.
 * Retorna { whereClause, addParams(request) } para usar con mssql nativo.
 */
const buildRoleFilter = (usuario_id, rol, prefix = '') => {
    let whereClause = "WHERE 1=1";
    const bindings = [];

    if (rol === 'admin' || rol === 'gerencia_general') {
        // Ve todo
    } else if (rol === 'gerencia') {
        const te = prefix ? `${prefix}.` : 'te.';
        const emp = prefix === 'm' ? 'emp.' : 'emp.';
        whereClause += ` AND (
            (COALESCE(${te}empresa_id, 0) != 0 AND (
                ${emp}jefatura_id = @role_uid 
                OR ${emp}jefatura_id IN (
                    SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = @role_uid
                    UNION
                    SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
                        SELECT ug.usuario_id FROM usuario_gerencias ug 
                        JOIN usuarios u ON ug.usuario_id = u.id 
                        WHERE ug.gerencia_id = @role_uid AND u.permisos = 'gerencia'
                    )
                )
            ))
            OR 
            (COALESCE(${te}empresa_id, 0) = 0 AND (
                ${te}usuario_id = @role_uid
                OR ${te}usuario_id IN (SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = @role_uid)
                OR ${te}usuario_id IN (SELECT id FROM usuarios WHERE jefatura_id IN (SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = @role_uid))
            ))
        )`;
    } else if (rol === 'jefatura') {
        const te = prefix ? `${prefix}.` : 'te.';
        const emp = prefix === 'm' ? 'emp.' : 'emp.';
        whereClause += ` AND (
            (COALESCE(${te}empresa_id, 0) != 0 AND ${emp}jefatura_id = @role_uid)
            OR 
            (COALESCE(${te}empresa_id, 0) = 0 AND (${te}usuario_id = @role_uid OR ${te}usuario_id IN (SELECT id FROM usuarios WHERE jefatura_id = @role_uid)))
        )`;
    } else if (rol === 'ejecutiva') {
        const te = prefix ? `${prefix}.` : 'te.';
        whereClause += ` AND (
            ${te}usuario_id = @role_uid
            OR ${te}asistentes LIKE (SELECT CONCAT('%', correo, '%') FROM usuarios WHERE id = @role_uid)
        )`;
    }

    return { whereClause, usuario_id };
};

/**
 * Adapta el whereClause de teams_eventos al contexto de minutas standalone.
 */
const adaptWhereForMinutas = (whereClause) => {
    return whereClause
        .replace(/WHERE 1=1/g, 'WHERE m.teams_evento_id IS NULL')
        .replace(/te\.usuario_id/g, 'm.ejecutiva_id')
        .replace(/te\.asistentes/g, 'm.participantes')
        .replace(/te\.empresa_id/g, 'm.empresa_id');
};

// ============================================================
// FUNCIONES DE LECTURA
// ============================================================

/**
 * Marca eventos agendados que ya pasaron como 'pasada'.
 */
const updateEstadosPasadas = async (currentDateChile, currentTimeChile) => {
    const pool = await poolPromise;
    await pool.request()
        .input('fecha', sql.VarChar, currentDateChile)
        .input('hora', sql.VarChar, currentTimeChile)
        .query(`
            UPDATE teams_eventos 
            SET estado = 'pasada' 
            WHERE estado = 'agendada' 
              AND (fecha < @fecha OR (fecha = @fecha AND (hora_fin IS NULL OR hora_fin <= @hora)))
        `);
};

/**
 * Lista reuniones (teams_eventos + minutas standalone) filtradas por rol.
 */
const getReunionesListado = async (usuario_id, rol) => {
    const { whereClause } = buildRoleFilter(usuario_id, rol);
    const whereM = adaptWhereForMinutas(whereClause);

    const fullSql = `
        SELECT * FROM (
            ${BASE_REUNION_SQL} ${whereClause}
            UNION ALL
            ${BASE_MINUTA_STANDALONE_SQL} ${whereM}
        ) AS combined
        ORDER BY fecha_reu DESC, hora DESC
    `;

    const pool = await poolPromise;
    const request = pool.request();
    if (usuario_id) request.input('role_uid', sql.Int, parseInt(usuario_id));
    const result = await request.query(fullSql);
    return result.recordset;
};

/**
 * Obtiene una reunión por su id_reunion o teams_evento_id.
 */
const getReunionById = async (id_reunion) => {
    const fullSql = `
        SELECT TOP 1 * FROM (
            ${BASE_REUNION_SQL}
            UNION ALL
            ${BASE_MINUTA_STANDALONE_SQL}
        ) AS combined
        WHERE id_reunion = @id_reunion OR CAST(teams_evento_id AS CHAR) = @id_reunion
    `;

    const pool = await poolPromise;
    const result = await pool.request()
        .input('id_reunion', sql.VarChar, String(id_reunion))
        .query(fullSql);
    return result.recordset[0] || null;
};

/**
 * Obtiene las estadísticas/KPIs del dashboard de reuniones.
 */
const getStats = async (usuario_id, rol) => {
    const { whereClause } = buildRoleFilter(usuario_id, rol);
    const pool = await poolPromise;
    const stats = {};

    // 1. Conteo por tipo de reunión
    const reqTipo = pool.request();
    if (usuario_id) reqTipo.input('role_uid', sql.Int, parseInt(usuario_id));
    const porTipo = await reqTipo.query(`
        SELECT m.tipo_reu AS name, COUNT(*) AS value
        FROM teams_eventos te
        LEFT JOIN minutas m ON m.teams_evento_id = te.id
        LEFT JOIN empresas emp ON te.empresa_id = emp.id
        ${whereClause}
        AND m.tipo_reu IS NOT NULL AND m.tipo_reu != ''
        AND te.estado NOT IN ('excluida', 'cancelada')
        GROUP BY m.tipo_reu
        ORDER BY value DESC
    `);
    stats.porTipo = porTipo.recordset;

    // 2. Conteo total por ejecutiva
    const reqEj = pool.request();
    if (usuario_id) reqEj.input('role_uid', sql.Int, parseInt(usuario_id));
    const porEjecutiva = await reqEj.query(`
        SELECT u.nombre AS name, COUNT(*) AS value
        FROM teams_eventos te
        LEFT JOIN usuarios u ON te.usuario_id = u.id
        LEFT JOIN empresas emp ON te.empresa_id = emp.id
        ${whereClause}
        AND te.estado NOT IN ('excluida', 'cancelada')
        GROUP BY u.id, u.nombre
        ORDER BY value DESC
    `);
    stats.porEjecutiva = porEjecutiva.recordset;

    // 3. Resumen general
    const reqRes = pool.request();
    if (usuario_id) reqRes.input('role_uid', sql.Int, parseInt(usuario_id));
    const resumen = await reqRes.query(`
        SELECT
            COUNT(*)                                                                        AS total_eventos,
            COUNT(CASE WHEN YEAR(te.fecha) = YEAR(CAST(GETDATE() AS DATE)) THEN 1 END)                   AS este_ano,
            COUNT(CASE WHEN MONTH(te.fecha) = MONTH(CAST(GETDATE() AS DATE)) AND YEAR(te.fecha) = YEAR(CAST(GETDATE() AS DATE)) THEN 1 END) AS este_mes,
            COUNT(CASE WHEN m.id IS NOT NULL AND m.estado_envio = 'enviado' THEN 1 END)    AS con_minuta,
            COUNT(CASE WHEN te.estado = 'pasada' AND m.id IS NULL AND te.empresa_id IS NOT NULL THEN 1 END) AS pendiente_minuta,
            COUNT(CASE WHEN te.empresa_id IS NULL AND te.estado != 'cancelada' THEN 1 END) AS sin_empresa
        FROM teams_eventos te
        LEFT JOIN minutas m ON m.teams_evento_id = te.id
        LEFT JOIN empresas emp ON te.empresa_id = emp.id
        ${whereClause}
        AND te.estado NOT IN ('excluida', 'cancelada')
    `);
    stats.resumen = resumen.recordset[0];

    // 4. Tendencia últimos 6 meses
    const reqTend = pool.request();
    if (usuario_id) reqTend.input('role_uid', sql.Int, parseInt(usuario_id));
    const tendencia = await reqTend.query(`
        SELECT
            FORMAT(te.fecha, 'yyyy-MM') AS mes,
            COUNT(*) AS total
        FROM teams_eventos te
        LEFT JOIN empresas emp ON te.empresa_id = emp.id
        ${whereClause}
        AND te.estado NOT IN ('excluida', 'cancelada')
        AND te.fecha >= DATEADD(month, -6, CAST(GETDATE() AS DATE))
        GROUP BY FORMAT(te.fecha, 'yyyy-MM')
        ORDER BY mes ASC
    `);
    stats.tendencia = tendencia.recordset;

    return stats;
};

/**
 * Obtiene los tipos de reunión distintos registrados.
 */
const getTiposReunion = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT DISTINCT tipo_reu
        FROM minutas
        WHERE tipo_reu IS NOT NULL AND tipo_reu != ''
        ORDER BY tipo_reu ASC
    `);
    return result.recordset.map(r => r.tipo_reu);
};

/**
 * Obtiene los correos de contactos de una empresa.
 */
const getDestinatarios = async (empresa_id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('empresa_id', sql.Int, empresa_id)
        .query("SELECT correo FROM empresa_contactos WHERE empresa_id = @empresa_id ORDER BY correo ASC");
    return result.recordset.map(r => r.correo);
};

module.exports = {
    updateEstadosPasadas,
    getReunionesListado,
    getReunionById,
    getStats,
    getTiposReunion,
    getDestinatarios
};
