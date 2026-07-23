const db = require("../../database/connection");
const { enviarCorreo } = require("../../services/email/email.service");

// ============================================================
// HELPERS — Control de acceso por rol
// ============================================================

/**
 * Construye la cláusula WHERE para filtrar teams_eventos por rol de usuario.
 * Alias de tabla: 'te'
 */
const buildRoleWhereClause = (usuario_id, rol) => {
    let whereClause = "WHERE 1=1";
    let params = [];

    if (rol === 'admin' || rol === 'gerencia_general') {
        // Ve todo
    } else if (rol === 'gerencia') {
        whereClause += ` AND (
            te.usuario_id = ?
            OR te.usuario_id IN (SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?)
            OR te.usuario_id IN (SELECT id FROM usuarios WHERE jefatura_id IN (SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?))
        )`;
        params.push(usuario_id, usuario_id, usuario_id);
    } else if (rol === 'jefatura') {
        whereClause += ` AND (
            te.usuario_id = ?
            OR te.usuario_id IN (SELECT id FROM usuarios WHERE jefatura_id = ?)
        )`;
        params.push(usuario_id, usuario_id);
    } else if (rol === 'ejecutiva') {
        whereClause += ` AND (
            te.usuario_id = ?
            OR te.asistentes LIKE (SELECT CONCAT('%', correo, '%') FROM usuarios WHERE id = ?)
        )`;
        params.push(usuario_id, usuario_id);
    }

    return { whereClause, params };
};

// ============================================================
// BASE SQL — Reutilizada por listarReuniones y obtenerReunionPorId
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
        j.nombre                        AS jefatura_nombre,

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
        m.programar_encuesta,
        m.encuesta_tipo,
        m.encuesta_programada_para,
        m.encuesta_estado_envio,
        m.encuesta_relacionada,
        m.encuesta_destinatario,
        m.texto_previo,
        m.link_video,
        m.created_at,

        CASE
            WHEN te.estado = 'cancelada'  THEN 'cancelada'
            WHEN te.estado = 'excluida'   THEN 'excluida'
            WHEN m.estado_envio = 'enviado'   THEN 'enviado'
            WHEN m.estado_envio = 'no_aplica' THEN 'no_aplica'
            WHEN m.estado_envio = 'borrador'  THEN 'borrador'
            WHEN te.empresa_id IS NULL        THEN 'huerfana'
            WHEN te.estado = 'pasada'         THEN 'borrador'
            ELSE te.estado
        END                             AS estado_envio,

        te.estado                       AS te_estado,
        (te.empresa_id IS NULL AND te.estado != 'excluida') AS is_huerfana,
        (m.id IS NOT NULL)              AS tiene_minuta,
        (te.empresa_id IS NOT NULL)     AS tiene_empresa

    FROM teams_eventos te
    LEFT JOIN empresas emp ON te.empresa_id = emp.id
    LEFT JOIN usuarios u ON te.usuario_id = u.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    LEFT JOIN minutas m ON m.teams_evento_id = te.id
`;

// ============================================================
// GET /reuniones — Listar reuniones (teams_eventos + minutas)
// ============================================================
exports.listarReuniones = async (req, res) => {
    const { usuario_id, rol } = req.query;
    const { whereClause, params } = buildRoleWhereClause(usuario_id, rol);

    const sql = `${BASE_REUNION_SQL} ${whereClause} ORDER BY te.fecha DESC, te.hora DESC`;

    try {
        const [result] = await db.query(sql, params);
        res.json(result);
    } catch (err) {
        console.error("Error en listarReuniones:", err);
        return res.status(500).json({ error: "Error en la BD" });
    }
};

// ============================================================
// GET /reuniones/resumen — KPIs del dashboard
// ============================================================
exports.obtenerStats = async (req, res) => {
    const { usuario_id, rol } = req.query;
    const { whereClause, params } = buildRoleWhereClause(usuario_id, rol);

    try {
        const stats = {};

        // 1. Conteo por tipo de reunión (desde minutas que tienen tipo_reu)
        const [porTipo] = await db.query(`
            SELECT m.tipo_reu AS name, COUNT(*) AS value
            FROM teams_eventos te
            LEFT JOIN minutas m ON m.teams_evento_id = te.id
            LEFT JOIN empresas emp ON te.empresa_id = emp.id
            ${whereClause}
            AND m.tipo_reu IS NOT NULL AND m.tipo_reu != ''
            AND te.estado NOT IN ('excluida', 'cancelada')
            GROUP BY m.tipo_reu
            ORDER BY value DESC
        `, params);
        stats.porTipo = porTipo;

        // 2. Conteo total de eventos por ejecutiva (todos los eventos de Teams)
        const [porEjecutiva] = await db.query(`
            SELECT u.nombre AS name, COUNT(*) AS value
            FROM teams_eventos te
            LEFT JOIN usuarios u ON te.usuario_id = u.id
            LEFT JOIN empresas emp ON te.empresa_id = emp.id
            ${whereClause}
            AND te.estado NOT IN ('excluida', 'cancelada')
            GROUP BY u.id, u.nombre
            ORDER BY value DESC
        `, params);
        stats.porEjecutiva = porEjecutiva;

        // 3. Resumen general (base: todos los eventos Teams)
        const [resumen] = await db.query(`
            SELECT
                COUNT(*)                                                                        AS total_eventos,
                COUNT(CASE WHEN YEAR(te.fecha) = YEAR(CURDATE()) THEN 1 END)                   AS este_ano,
                COUNT(CASE WHEN MONTH(te.fecha) = MONTH(CURDATE()) AND YEAR(te.fecha) = YEAR(CURDATE()) THEN 1 END) AS este_mes,
                COUNT(CASE WHEN m.id IS NOT NULL AND m.estado_envio = 'enviado' THEN 1 END)    AS con_minuta,
                COUNT(CASE WHEN te.estado = 'pasada' AND m.id IS NULL AND te.empresa_id IS NOT NULL THEN 1 END) AS pendiente_minuta,
                COUNT(CASE WHEN te.empresa_id IS NULL AND te.estado != 'cancelada' THEN 1 END) AS sin_empresa
            FROM teams_eventos te
            LEFT JOIN minutas m ON m.teams_evento_id = te.id
            LEFT JOIN empresas emp ON te.empresa_id = emp.id
            ${whereClause}
            AND te.estado NOT IN ('excluida', 'cancelada')
        `, params);
        stats.resumen = resumen[0];

        // 4. Tendencia últimos 6 meses (por fecha del evento Teams)
        const [tendencia] = await db.query(`
            SELECT
                DATE_FORMAT(te.fecha, '%Y-%m') AS mes,
                COUNT(*) AS total
            FROM teams_eventos te
            LEFT JOIN empresas emp ON te.empresa_id = emp.id
            ${whereClause}
            AND te.estado NOT IN ('excluida', 'cancelada')
            AND te.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY mes
            ORDER BY mes ASC
        `, params);
        stats.tendencia = tendencia;

        res.json(stats);
    } catch (err) {
        console.error("Error en obtenerStats:", err);
        res.status(500).json({ error: "Error obteniendo estadísticas" });
    }
};

// ============================================================
// GENERAR ID MINUTA (correlativo anual)
// ============================================================
const generarIdMinuta = async () => {
    const year = new Date().getFullYear();

    const [result] = await db.query(`
        SELECT id_minuta
        FROM minutas
        WHERE id_minuta LIKE ?
        ORDER BY CAST(SUBSTRING(id_minuta, 10) AS UNSIGNED) DESC
        LIMIT 1
    `, [`REU-${year}-%`]);

    let maxNum = 0;
    if (result.length > 0 && result[0].id_minuta) {
        const parts = result[0].id_minuta.split('-');
        if (parts.length === 3) maxNum = parseInt(parts[2], 10) || 0;
    }

    const correlativo = String(maxNum + 1).padStart(4, "0");
    return `REU-${year}-${correlativo}`;
};

// ============================================================
// CALCULAR CC POR DEFECTO para envío de minutas
// ============================================================
const calcularDefaultCc = async (empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id) => {
    const [gerenteRows] = await db.query("SELECT correo FROM usuarios WHERE nombre = 'Lilian Ortega' LIMIT 1");
    const lilianCorreo = gerenteRows[0]?.correo || "lortega@proforma.cl";

    let userPermisos = 'ejecutiva';
    let loggedInUser = null;

    // Unifica la búsqueda del usuario logueado en una sola query (id tiene prioridad sobre correo)
    if (enviado_por_id || enviado_por_correo) {
        const [userRows] = enviado_por_id
            ? await db.query("SELECT id, permisos, jefatura_id, correo FROM usuarios WHERE id = ? LIMIT 1", [enviado_por_id])
            : await db.query("SELECT id, permisos, jefatura_id, correo FROM usuarios WHERE correo = ? LIMIT 1", [enviado_por_correo]);
        if (userRows.length > 0) { loggedInUser = userRows[0]; userPermisos = loggedInUser.permisos || 'ejecutiva'; }
    }

    let correosCcArray = [];

    if (userPermisos === 'ejecutiva') {
        let jefaturaId = loggedInUser?.jefatura_id;
        if (!jefaturaId && ejecutiva_id) {
            const [ejRows] = await db.query("SELECT jefatura_id FROM usuarios WHERE id = ? LIMIT 1", [ejecutiva_id]);
            jefaturaId = ejRows[0]?.jefatura_id;
        }
        if (jefaturaId) {
            const [jefRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [jefaturaId]);
            if (jefRows[0]?.correo) correosCcArray.push(jefRows[0].correo);
        }
        correosCcArray.push(lilianCorreo);
    } else if (userPermisos === 'jefatura') {
        // CC ejecutiva responsable de la reunión
        if (ejecutiva_id) {
            const [ejRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [ejecutiva_id]);
            if (ejRows[0]?.correo) correosCcArray.push(ejRows[0].correo);
        } else if (loggedInUser?.id) {
            const [ejRows] = await db.query("SELECT correo FROM usuarios WHERE permisos = 'ejecutiva' AND jefatura_id = ? LIMIT 1", [loggedInUser.id]);
            if (ejRows[0]?.correo) correosCcArray.push(ejRows[0].correo);
        }
        
        // CC gerencia desde usuario_gerencias
        if (loggedInUser?.id) {
            const [gerRows] = await db.query(`
                SELECT u.correo FROM usuario_gerencias ug
                JOIN usuarios u ON ug.gerencia_id = u.id
                WHERE ug.usuario_id = ? LIMIT 1
            `, [loggedInUser.id]);
            if (gerRows[0]?.correo) correosCcArray.push(gerRows[0].correo);
        }
    } else if (userPermisos === 'gerencia') {
        // CC gerencia superior automáticamente si corresponde
        if (loggedInUser?.jefatura_id) {
            const [supRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [loggedInUser.jefatura_id]);
            if (supRows[0]?.correo) correosCcArray.push(supRows[0].correo);
        }
        // CC ejecutiva y su jefatura si se seleccionó una
        if (ejecutiva_id) {
            const [ejRows] = await db.query("SELECT correo, jefatura_id FROM usuarios WHERE id = ? LIMIT 1", [ejecutiva_id]);
            if (ejRows[0]) {
                if (ejRows[0].correo) correosCcArray.push(ejRows[0].correo);
                if (ejRows[0].jefatura_id) {
                    const [jefRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [ejRows[0].jefatura_id]);
                    if (jefRows[0]?.correo) correosCcArray.push(jefRows[0].correo);
                }
            }
        }
    } else {
        if (ejecutiva_id) {
            const [ejRows] = await db.query("SELECT correo, jefatura_id FROM usuarios WHERE id = ? LIMIT 1", [ejecutiva_id]);
            if (ejRows[0]) {
                if (ejRows[0].correo) correosCcArray.push(ejRows[0].correo);
                if (ejRows[0].jefatura_id) {
                    const [jefRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [ejRows[0].jefatura_id]);
                    if (jefRows[0]?.correo) correosCcArray.push(jefRows[0].correo);
                }
            }
        }
        correosCcArray.push(lilianCorreo);
    }

    const correosCcFiltered = [...new Set(correosCcArray.filter(Boolean).map(e => e.trim()))];
    return correosCcFiltered.length > 0 ? correosCcFiltered.join(', ') : lilianCorreo;
};

// ============================================================
// POST /reuniones — Crear / enviar minuta
// ============================================================
exports.crearReunion = async (req, res) => {
    const {
        ejecutiva_id, enviado_a, enviado_por, participantes,
        tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos,
        motivo_reu, minuta, form_f, empresa_id,
        programar_encuesta, encuesta_tipo, encuesta_programada_para, encuesta_destinatario,
        teams_evento_id,  // ID interno de teams_eventos (si viene de un evento Teams)
        asunto_correo,    // Asunto personalizado para minutas sin empresa (excluidas/proforma)
        texto_previo,
        link_video
    } = req.body;

    const archivos = req.files || [];
    const archivosNombres = JSON.stringify(archivos.map(f => f.filename));

    // Validar tamaño total
    const totalSize = archivos.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
        return res.status(400).json({ error: "El tamaño total de los archivos adjuntos supera el límite de 20MB." });
    }

    // empresa_id puede ser null para reuniones excluidas o proforma sin empresa asignada
    if (!ejecutiva_id || !fecha_reu || !hora) {
        return res.status(400).json({ error: "Campos obligatorios faltantes" });
    }

    try {
        const isSurveyProgrammed = programar_encuesta === "true" || programar_encuesta === true;
        const id_minuta = await generarIdMinuta();

        // Resolver teams_evento_id si viene del body
        let teId = teams_evento_id ? parseInt(teams_evento_id) : null;

        // Si el body incluye un event_id de Teams (string largo), buscar el registro correspondiente
        if (!teId && req.body.event_id) {
            const [teRows] = await db.query("SELECT id FROM teams_eventos WHERE event_id = ?", [req.body.event_id]);
            if (teRows.length > 0) teId = teRows[0].id;
        }

        const sql = `
            INSERT INTO minutas (
                id_minuta, teams_evento_id, ejecutiva_id, empresa_id,
                tipo_reu, enviado_a, enviado_por, participantes,
                motivo_reu, minuta, form_f,
                fecha_reu, hora, lugar, documentos_adjuntos,
                estado_envio, archivos_nombres,
                programar_encuesta, encuesta_tipo, encuesta_programada_para,
                encuesta_estado_envio, encuesta_relacionada, encuesta_destinatario,
                texto_previo, link_video
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enviado', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            id_minuta, teId, ejecutiva_id, empresa_id,
            tipo_reu, enviado_a, enviado_por, participantes,
            motivo_reu, minuta, form_f,
            fecha_reu, hora, lugar || 'Teams', documentos_adjuntos,
            archivosNombres,
            isSurveyProgrammed ? 1 : 0,
            isSurveyProgrammed ? encuesta_tipo : null,
            isSurveyProgrammed ? encuesta_programada_para : null,
            isSurveyProgrammed ? 'pendiente' : 'enviado',
            req.body.encuesta_relacionada === true || req.body.encuesta_relacionada === 'true' ? 1 : 0,
            isSurveyProgrammed ? encuesta_destinatario : null,
            texto_previo || null,
            link_video || null
        ];

        await db.query(sql, values);

        // Si viene de un evento Teams, marcar ese evento como 'pasada'
        if (teId) {
            await db.query("UPDATE teams_eventos SET estado = 'pasada' WHERE id = ?", [teId]);
        }

        // Registrar en empresa_seguimiento_log (solo si hay empresa)
        if (empresa_id) {
            await db.query(
                "UPDATE empresas SET estado_seguimiento = 'gestionada', fecha_concretada = COALESCE(fecha_concretada, ?) WHERE id = ?",
                [fecha_reu, empresa_id]
            );
            await db.query(
                "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'gestionada', ?, ?, ?, ?)",
                [empresa_id, fecha_reu, ejecutiva_id, id_minuta, motivo_reu || 'Minuta de reunión registrada']
            );
        }

        // Auto-aprendizaje de dominios/contactos
        if (enviado_a) {
            try {
                let correos = [];
                if (typeof enviado_a === 'string') {
                    correos = enviado_a.startsWith('[') ? JSON.parse(enviado_a) : enviado_a.split(',').map(e => e.trim());
                } else if (Array.isArray(enviado_a)) {
                    correos = enviado_a;
                }

                const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];

                for (const correo of correos) {
                    if (correo && correo.includes('@') && empresa_id) {
                        const dominio = '@' + correo.split('@')[1].toLowerCase();
                        const domSinArroba = dominio.substring(1);
                        if (!dominiosGenericos.includes(domSinArroba)) {
                            await db.query("INSERT IGNORE INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)", [empresa_id, dominio]);
                            await db.query("INSERT IGNORE INTO empresa_contactos (empresa_id, correo) VALUES (?, ?)", [empresa_id, correo.toLowerCase()]);
                        }
                    }
                }
            } catch (errDom) {
                console.error("Error aprendiendo dominios:", errDom);
            }
        }

        // Enviar correo
        const [result2] = await db.query(`
            SELECT 
                m.*, 
                emp.nombre AS empresa_nombre,
                z.nombre AS zona_nombre,
                e.nombre AS ejecutiva_nombre,
                e.correo AS ejecutiva_correo,
                j.correo AS jefatura_correo
            FROM minutas m
            LEFT JOIN empresas emp ON m.empresa_id = emp.id
            LEFT JOIN zonas z ON emp.zona_id = z.id
            JOIN usuarios e ON m.ejecutiva_id = e.id
            LEFT JOIN usuarios j ON e.jefatura_id = j.id
            WHERE m.id_minuta = ?
        `, [id_minuta]);

        if (result2.length > 0) {
            const data = result2[0];
            const attachments = archivos.map(file => ({ filename: file.originalname, path: file.path }));

            try {
                const enviado_por_correo = req.body.enviado_por_correo;
                const enviado_por_id = req.body.enviado_por_id;

                // Si hay empresa, usar el CC normal; si no, solo el ejecutivo
                const correosCc = req.body.correos_cc !== undefined
                    ? req.body.correos_cc
                    : (empresa_id
                        ? await calcularDefaultCc(data.empresa_id, data.ejecutiva_id, enviado_por_correo, enviado_por_id)
                        : (data.ejecutiva_correo || ''));

                // Asunto del correo: personalizado si no hay empresa
                const asuntoCorreo = asunto_correo
                    ? asunto_correo
                    : (data.empresa_nombre
                        ? `Minuta de reunión ${data.tipo_reu} - ${data.empresa_nombre} - ${data.id_minuta}`
                        : `${data.motivo_reu || 'Minuta de Reunión'} - ${data.id_minuta}`);

                enviarCorreo({
                    to: data.enviado_a,
                    cc: correosCc,
                    userEmail: req.usuario?.correo,
                    subject: asuntoCorreo,
                    data: {
                        id_reunion: data.id_minuta,
                        participantes: data.participantes,
                        empresa: data.empresa_nombre || '',
                        ejecutiva: data.ejecutiva_nombre,
                        fecha_reu: data.fecha_reu,
                        hora: data.hora,
                        lugar: data.lugar,
                        motivo_reu: data.motivo_reu,
                        minuta: data.minuta,
                        enviado_por: data.enviado_por,
                        documentos_adjuntos: data.documentos_adjuntos,
                        texto_previo: data.texto_previo,
                        link_video: data.link_video
                    },
                    attachments
                }).catch(error => {
                    console.error("Error enviando correo:", error);
                });
            } catch (error) {
                console.error("Error al preparar envío de correo:", error);
            }
        }

        res.json({ msg: "Minuta creada y enviada", id_reunion: id_minuta });

    } catch (error) {
        console.error("Error al crear minuta:", error);
        return res.status(500).json({ error: "Error interno al crear la minuta" });
    }
};

// ============================================================
// GET /reuniones/destinatarios
// ============================================================
exports.obtenerDestinatarios = async (req, res) => {
    const { empresa_id } = req.query;
    if (!empresa_id) return res.status(400).json({ error: "empresa_id es requerido" });

    try {
        const [result] = await db.query(
            "SELECT correo FROM empresa_contactos WHERE empresa_id = ? ORDER BY correo ASC",
            [empresa_id]
        );
        res.json(result.map(r => r.correo));
    } catch (err) {
        console.error("Error en obtenerDestinatarios:", err);
        res.status(500).json({ error: "Error en la BD" });
    }
};

// ============================================================
// GET /reuniones/tipos
// ============================================================
exports.obtenerTiposReunion = async (req, res) => {
    try {
        const [result] = await db.query(`
            SELECT DISTINCT tipo_reu
            FROM minutas
            WHERE tipo_reu IS NOT NULL AND tipo_reu != ''
            ORDER BY tipo_reu ASC
        `);
        res.json(result.map(r => r.tipo_reu));
    } catch (err) {
        console.error("Error en obtenerTiposReunion:", err);
        res.status(500).json({ error: "Error en la BD" });
    }
};

// ============================================================
// GET /reuniones/default-cc
// ============================================================
exports.obtenerDefaultCc = async (req, res) => {
    const { empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id } = req.query;

    try {
        const cc = await calcularDefaultCc(empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id);
        res.json({ cc });
    } catch (err) {
        console.error("Error en obtenerDefaultCc:", err);
        res.status(500).json({ error: "Error obteniendo CC" });
    }
};

// ============================================================
// GET /reuniones/test-smtp
// ============================================================
exports.testSmtp = async (req, res) => {
    const targetEmail = req.query.email || "camilorivera.bravo@gmail.com";
    const transporter = require("../../config/mailer");
    const diagnostic = {
        config: {
            tenantId: process.env.AZURE_TENANT_ID ? "Configured" : "Missing",
            clientId: process.env.AZURE_CLIENT_ID ? "Configured" : "Missing",
            user: process.env.SMTP_USER,
            redirect_to: process.env.REDIRECT_EMAILS_TO || "None"
        },
        verify: null, send: null, error: null
    };

    try {
        await transporter.verify();
        diagnostic.verify = "SUCCESS";
    } catch (err) {
        diagnostic.verify = "FAILED";
        diagnostic.error = `Verify error: ${err.message || err}`;
        return res.json(diagnostic);
    }

    try {
        const sent = await enviarCorreo({
            to: targetEmail,
            userEmail: req.usuario?.correo,
            subject: "Test de Diagnóstico SMTP - Core360",
            data: {
                id_reunion: "TEST-1234",
                participantes: "Usuario de Prueba",
                empresa: "Empresa Demo",
                ejecutiva: "Ejecutiva de Prueba",
                fecha_reu: new Date().toISOString().split('T')[0],
                hora: "12:00",
                lugar: "Microsoft Teams",
                motivo_reu: "Prueba de Diagnóstico",
                minuta: "<h3>Minuta de prueba</h3><p>Esto es un test del sistema de correos.</p>",
                enviado_por: "Sistema de Diagnóstico",
                documentos_adjuntos: "Ninguno"
            },
            attachments: []
        });
        diagnostic.send = sent ? "SUCCESS" : "FAILED (enviarCorreo returned false)";
    } catch (err) {
        diagnostic.send = "FAILED";
        diagnostic.error = `Send error: ${err.message || err}`;
    }

    res.json(diagnostic);
};

// ============================================================
// PUT /reuniones/:id/no-aplica — Marcar evento/minuta como no aplica
// ============================================================
exports.marcarNoAplica = async (req, res) => {
    const { id } = req.params;
    const { noAplica } = req.body;

    try {
        // Intentar como id_minuta primero
        const [minutaRows] = await db.query("SELECT id, teams_evento_id FROM minutas WHERE id_minuta = ?", [id]);

        if (minutaRows.length > 0) {
            const nuevoEstado = noAplica ? 'no_aplica' : 'borrador';
            await db.query("UPDATE minutas SET estado_envio = ? WHERE id_minuta = ?", [nuevoEstado, id]);

            if (noAplica && minutaRows[0].teams_evento_id) {
                const [teRows] = await db.query("SELECT event_id, empresa_id, fecha, asunto FROM teams_eventos WHERE id = ?", [minutaRows[0].teams_evento_id]);
                if (teRows.length > 0 && teRows[0].empresa_id) {
                    await db.query(
                        "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'no_aplica', ?, ?, ?, ?)",
                        [teRows[0].empresa_id, teRows[0].fecha, req.usuario.id, teRows[0].event_id, teRows[0].asunto || 'Reunión No Aplica']
                    );
                }
            }

            return res.json({ success: true, message: "Estado de minuta actualizado" });
        }

        // Intentar como teams_evento_id (número)
        const teId = parseInt(id);
        if (!isNaN(teId)) {
            if (noAplica) {
                // En lugar de cambiar te.estado a 'excluida' (lo que la borraría de los KPIs),
                // creamos una minuta con estado_envio = 'no_aplica' para que el evento siga activo y sumando a los KPIs.
                const [teRows] = await db.query("SELECT event_id, empresa_id, fecha, hora, asunto, usuario_id FROM teams_eventos WHERE id = ?", [teId]);
                if (teRows.length > 0) {
                    const teRow = teRows[0];
                    const idMinuta = `minuta-${teId}-${Date.now()}`;
                    await db.query(`
                        INSERT INTO minutas (id_minuta, teams_evento_id, estado_envio, enviado_por, ejecutiva_id, fecha_reu, hora, empresa_id)
                        VALUES (?, ?, 'no_aplica', ?, ?, ?, ?, ?)
                    `, [
                        idMinuta, 
                        teId, 
                        req.usuario.id, 
                        teRow.usuario_id || req.usuario.id,
                        teRow.fecha,
                        teRow.hora || '00:00',
                        teRow.empresa_id || null
                    ]);

                    if (teRow.empresa_id) {
                        await db.query(
                            "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'no_aplica', ?, ?, ?, ?)",
                            [teRow.empresa_id, teRow.fecha, req.usuario.id, teRow.event_id, teRow.asunto || 'Reunión No Aplica']
                        );
                    }
                }
            } else {
                // Si por alguna razón se intentaba revertir un evento puro
                await db.query("UPDATE teams_eventos SET estado = 'pasada' WHERE id = ?", [teId]);
            }

            return res.json({ success: true, message: "Estado de reunión actualizado (se conservó en los KPIs)" });
        }

        return res.status(404).json({ error: "Registro no encontrado" });
    } catch (err) {
        console.error("Error en marcarNoAplica:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// ============================================================
// GET /reuniones/detail/:id_reunion — Obtener una reunión por id_reunion
// ============================================================
exports.obtenerReunionPorId = async (req, res) => {
    const { id_reunion } = req.params;

    const sql = `${BASE_REUNION_SQL}
        WHERE m.id_minuta = ? OR CAST(te.id AS CHAR) = ?
        LIMIT 1`;

    try {
        const [result] = await db.query(sql, [id_reunion, id_reunion]);
        if (result.length === 0) {
            return res.status(404).json({ error: "Reunión no encontrada" });
        }
        res.json(result[0]);
    } catch (err) {
        console.error("Error en obtenerReunionPorId:", err);
        return res.status(500).json({ error: "Error en la BD" });
    }
};
