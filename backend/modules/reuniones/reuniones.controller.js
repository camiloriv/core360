const db = require("../../database/connection");
const { enviarCorreo } = require("../../services/email/email.service");

// 🔹 Función auxiliar para DRY: Construye WHERE según el rol
const buildRoleWhereClause = (usuario_id, rol) => {
    let whereClause = "WHERE 1=1";
    let params = [];

    if (rol === 'ejecutiva') {
        whereClause += ` AND (
            emp.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?) 
            OR emp.jefatura_id IN (
                SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)
            )
            OR r.ejecutiva_id = ?
        )`;
        params.push(usuario_id, usuario_id, usuario_id);
    } else if (rol === 'jefatura') {
        whereClause += ` AND (emp.jefatura_id = ? OR emp.jefatura_id IN (
            SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = ?
        ))`;
        params.push(usuario_id, usuario_id);
    } else if (rol === 'gerencia') {
        whereClause += ` AND (j.id IN (
            SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?
            UNION
            SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
                SELECT ug.usuario_id FROM usuario_gerencias ug 
                JOIN usuarios u ON ug.usuario_id = u.id 
                WHERE ug.gerencia_id = ? AND u.permisos = 'gerencia'
            )
        ) OR emp.jefatura_id = ?)`;
        params.push(usuario_id, usuario_id, usuario_id);
    }
    
    return { whereClause, params };
};

const buildHuerfanasRoleWhereClause = (usuario_id, rol) => {
    let whereClause = "WHERE 1=1";
    let params = [];

    if (rol === 'ejecutiva') {
        whereClause += ` AND h.usuario_id = ?`;
        params.push(usuario_id);
    } else if (rol === 'jefatura') {
        whereClause += ` AND (u.jefatura_id = ? OR h.usuario_id = ?)`;
        params.push(usuario_id, usuario_id);
    } else if (rol === 'gerencia') {
        whereClause += ` AND (
            u.id IN (
                SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?
                UNION
                SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
                    SELECT ug.usuario_id FROM usuario_gerencias ug 
                    JOIN usuarios u ON ug.usuario_id = u.id 
                    WHERE ug.gerencia_id = ? AND u.permisos = 'gerencia'
                )
            ) OR u.jefatura_id = ? OR h.usuario_id = ?
        )`;
        params.push(usuario_id, usuario_id, usuario_id, usuario_id);
    }
    
    return { whereClause, params };
};

const calcularDefaultCc = async (empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id) => {
    // 1. Obtener datos de Lilian Ortega (Gerencia)
    const [gerenteRows] = await db.query("SELECT correo FROM usuarios WHERE nombre = 'Lilian Ortega' LIMIT 1");
    const lilianCorreo = gerenteRows[0]?.correo || "lortega@proforma.cl";

    // 2. Obtener el perfil del usuario logueado
    let userPermisos = 'ejecutiva';
    let loggedInUser = null;
    if (enviado_por_id) {
        const [userRows] = await db.query("SELECT id, permisos, jefatura_id, correo FROM usuarios WHERE id = ? LIMIT 1", [enviado_por_id]);
        if (userRows.length > 0) {
            loggedInUser = userRows[0];
            userPermisos = loggedInUser.permisos || 'ejecutiva';
        }
    } else if (enviado_por_correo) {
        const [userRows] = await db.query("SELECT id, permisos, jefatura_id, correo FROM usuarios WHERE correo = ? LIMIT 1", [enviado_por_correo]);
        if (userRows.length > 0) {
            loggedInUser = userRows[0];
            userPermisos = loggedInUser.permisos || 'ejecutiva';
        }
    }

    let correosCcArray = [];


    if (userPermisos === 'ejecutiva') {
        // Ejecutiva: su jefatura y gerencia (Lilian Ortega)
        let jefaturaId = loggedInUser?.jefatura_id;
        if (!jefaturaId && ejecutiva_id) {
            const [ejRows] = await db.query("SELECT jefatura_id FROM usuarios WHERE id = ? LIMIT 1", [ejecutiva_id]);
            jefaturaId = ejRows[0]?.jefatura_id;
        }

        if (jefaturaId) {
            const [jefRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [jefaturaId]);
            if (jefRows[0]?.correo) {
                correosCcArray.push(jefRows[0].correo);
            }
        }
        correosCcArray.push(lilianCorreo);

    } else if (userPermisos === 'jefatura') {
        // Jefatura: su ejecutiva(s) y gerencia (Lilian Ortega)
        const jefaturaId = loggedInUser?.id || ejecutiva_id;
        const [ejRows] = await db.query("SELECT correo FROM usuarios WHERE jefatura_id = ? AND permisos = 'ejecutiva'", [jefaturaId]);
        ejRows.forEach(row => {
            if (row.correo) correosCcArray.push(row.correo);
        });
        correosCcArray.push(lilianCorreo);

    } else {
        // Gerencia / Admin: jefatura y ejecutiva + gerencia
        if (ejecutiva_id) {
            const [ejRows] = await db.query("SELECT correo, jefatura_id FROM usuarios WHERE id = ? LIMIT 1", [ejecutiva_id]);
            if (ejRows[0]) {
                const ejCorreo = ejRows[0].correo;
                const jefId = ejRows[0].jefatura_id;
                if (ejCorreo) correosCcArray.push(ejCorreo);

                if (jefId) {
                    const [jefRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [jefId]);
                    if (jefRows[0]?.correo) {
                        correosCcArray.push(jefRows[0].correo);
                    }
                }
            }
        }
        correosCcArray.push(lilianCorreo);
    }

    // Limpiar duplicados y valores vacíos
    let correosCcFiltered = [...new Set(correosCcArray.filter(Boolean).map(email => email.trim()))];

    // En todos los casos debe estar uno en copia siempre
    if (correosCcFiltered.length === 0) {
        correosCcFiltered.push(lilianCorreo);
    }

    return correosCcFiltered.join(', ');
};

// 📋 LISTAR REUNIONES
exports.listarReuniones = async (req, res) => {
    const { usuario_id, rol } = req.query;
    const { whereClause, params } = buildRoleWhereClause(usuario_id, rol);
    const { whereClause: huerfanasWhereClause, params: huerfanasParams } = buildHuerfanasRoleWhereClause(usuario_id, rol);

    const columnasReuniones = `
        r.id, r.id_reunion, r.ejecutiva_id, r.enviado_a, r.enviado_por,
        r.participantes, r.tipo_reu, r.fecha_reu, r.hora, r.lugar,
        r.documentos_adjuntos, r.motivo_reu, r.minuta, r.form_f, r.created_at,
        r.empresa_id, r.direccion, r.programado_para, r.estado_envio, r.archivos_nombres,
        r.programar_encuesta, r.encuesta_tipo, r.encuesta_programada_para, r.encuesta_estado_envio,
        r.encuesta_relacionada, r.encuesta_destinatario, r.event_id, r.asunto_teams,
        e.nombre AS ejecutiva_nombre, 
        emp.nombre AS empresa_nombre,
        j.nombre AS jefatura_nombre,
        FALSE AS is_huerfana
    `;

    const sqlReuniones = `
        SELECT ${columnasReuniones}
        FROM reuniones r
        LEFT JOIN usuarios e ON r.ejecutiva_id = e.id
        LEFT JOIN empresas emp ON r.empresa_id = emp.id
        LEFT JOIN usuarios j ON emp.jefatura_id = j.id
        ${whereClause}
    `;

    const sqlAgendadas = `
        SELECT 
            0 AS id,
            log.reunion_id AS id_reunion,
            log.usuario_id AS ejecutiva_id,
            NULL AS enviado_a,
            NULL AS enviado_por,
            '' AS participantes,
            '' AS tipo_reu,
            log.fecha AS fecha_reu,
            '12:00' AS hora,
            'Teams' AS lugar,
            NULL AS documentos_adjuntos,
            COALESCE(log.asunto, 'Reunión agendada en Teams') AS motivo_reu,
            NULL AS minuta,
            NULL AS form_f,
            log.created_at,
            log.empresa_id,
            NULL AS direccion,
            NULL AS programado_para,
            log.estado AS estado_envio,
            NULL AS archivos_nombres,
            0 AS programar_encuesta,
            NULL AS encuesta_tipo,
            NULL AS encuesta_programada_para,
            NULL AS encuesta_estado_envio,
            0 AS encuesta_relacionada,
            NULL AS encuesta_destinatario,
            NULL AS event_id,
            COALESCE(log.asunto, 'Reunión agendada en Teams') AS asunto_teams,
            u.nombre AS ejecutiva_nombre,
            emp.nombre AS empresa_nombre,
            j.nombre AS jefatura_nombre,
            FALSE AS is_huerfana
        FROM empresa_seguimiento_log log
        JOIN empresas emp ON log.empresa_id = emp.id
        JOIN usuarios u ON log.usuario_id = u.id
        LEFT JOIN usuarios j ON emp.jefatura_id = j.id
        WHERE log.estado IN ('agendada', 'no_aplica')
          AND log.reunion_id IS NOT NULL
          AND log.reunion_id NOT IN (
              SELECT event_id FROM reuniones WHERE event_id IS NOT NULL
          )
          AND NOT EXISTS (
              SELECT 1 FROM empresa_seguimiento_log log2
              WHERE log2.reunion_id = log.reunion_id AND log2.estado = 'cancelada'
          )
          ${whereClause.replace('WHERE 1=1', 'AND 1=1').replace(/r\./g, 'log.').replace(/empresa_id/g, 'log.empresa_id').replace(/ejecutiva_id/g, 'usuario_id')}
    `;

    const sqlHuerfanas = `
        SELECT 
            h.id AS id,
            CONCAT('huerfana-', h.id) AS id_reunion,
            h.usuario_id AS ejecutiva_id,
            NULL AS enviado_a,
            NULL AS enviado_por,
            h.asistentes AS participantes,
            'No clasificada' AS tipo_reu,
            h.fecha AS fecha_reu,
            h.hora AS hora,
            'Teams' AS lugar,
            NULL AS documentos_adjuntos,
            h.asunto AS motivo_reu,
            NULL AS minuta,
            NULL AS form_f,
            h.created_at,
            NULL AS empresa_id,
            NULL AS direccion,
            NULL AS programado_para,
            IF(h.estado = 'no_aplica', 'no_aplica', 'huerfana') AS estado_envio,
            NULL AS archivos_nombres,
            0 AS programar_encuesta,
            NULL AS encuesta_tipo,
            NULL AS encuesta_programada_para,
            NULL AS encuesta_estado_envio,
            0 AS encuesta_relacionada,
            NULL AS encuesta_destinatario,
            h.event_id AS event_id,
            h.asunto AS asunto_teams,
            u.nombre AS ejecutiva_nombre,
            'Sin empresa asignada' AS empresa_nombre,
            NULL AS jefatura_nombre,
            TRUE AS is_huerfana
        FROM reuniones_huerfanas h
        JOIN usuarios u ON h.usuario_id = u.id
        ${huerfanasWhereClause.replace('WHERE 1=1', "WHERE h.estado IN ('pendiente', 'no_aplica')")}
    `;

    const sqlCombined = `
        (${sqlReuniones})
        UNION ALL
        (${sqlAgendadas})
        UNION ALL
        (${sqlHuerfanas})
        ORDER BY fecha_reu DESC, hora DESC
    `;

    try {
        const combinedParams = [...params, ...params, ...huerfanasParams];
        const [result] = await db.query(sqlCombined, combinedParams);
        res.json(result);
    } catch (err) {
        console.error("Error en listarReuniones:", err);
        return res.status(500).json({ error: "Error en la BD" });
    }
};

// 🔹 ESTADÍSTICAS PARA DASHBOARD
exports.obtenerStats = async (req, res) => {
    const { usuario_id, rol } = req.query;

    let joinClause = `
        LEFT JOIN usuarios e ON r.ejecutiva_id = e.id
        LEFT JOIN empresas emp ON r.empresa_id = emp.id
        LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    `;
    const { whereClause, params } = buildRoleWhereClause(usuario_id, rol);

    try {
        const stats = {};

        // 1. Conteo por tipo
        const [porTipo] = await db.query(`
            SELECT r.tipo_reu as name, COUNT(*) as value 
            FROM reuniones r
            ${joinClause}
            ${whereClause}
            GROUP BY r.tipo_reu
        `, params);
        stats.porTipo = porTipo;

        // 2. Conteo por ejecutiva
        const [porEjecutiva] = await db.query(`
            SELECT e.nombre as name, COUNT(*) as value 
            FROM reuniones r
            ${joinClause}
            ${whereClause}
            GROUP BY e.id, e.nombre
            ORDER BY value DESC
        `, params);
        stats.porEjecutiva = porEjecutiva;

        // 3. Resumen general
        const [resumen] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN YEAR(r.created_at) = YEAR(CURDATE()) THEN 1 END) as este_ano,
                COUNT(CASE WHEN MONTH(r.created_at) = MONTH(CURDATE()) AND YEAR(r.created_at) = YEAR(CURDATE()) THEN 1 END) as este_mes
            FROM reuniones r
            ${joinClause}
            ${whereClause}
        `, params);
        stats.resumen = resumen[0];

        // 4. Últimos 6 meses (Tendencia)
        const [tendencia] = await db.query(`
            SELECT 
                DATE_FORMAT(r.created_at, '%Y-%m') as mes,
                COUNT(*) as total
            FROM reuniones r
            ${joinClause}
            ${whereClause} AND r.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
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

// 🔹 GENERAR ID REUNIÓN
const generarIdReunion = async () => {
    const year = new Date().getFullYear();

    const sql = `
        SELECT id_reunion 
        FROM reuniones 
        WHERE id_reunion LIKE ? 
        ORDER BY CAST(SUBSTRING(id_reunion, 10) AS UNSIGNED) DESC 
        LIMIT 1
    `;

    const [result] = await db.query(sql, [`REU-${year}-%`]);

    let maxNum = 0;
    if (result.length > 0 && result[0].id_reunion) {
        const parts = result[0].id_reunion.split('-');
        if (parts.length === 3) {
            maxNum = parseInt(parts[2], 10) || 0;
        }
    }

    const correlativo = String(maxNum + 1).padStart(4, "0");
    return `REU-${year}-${correlativo}`;
};

// 🔥 CREAR REUNIÓN + ARCHIVOS
exports.crearReunion = async (req, res) => {
    const {
        ejecutiva_id,
        enviado_a,
        enviado_por,
        participantes,
        tipo_reu,
        fecha_reu,
        hora,
        lugar,
        documentos_adjuntos,
        motivo_reu,
        minuta,
        form_f,
        empresa_id,
        programar_encuesta,
        encuesta_tipo,
        encuesta_programada_para,
        encuesta_destinatario
    } = req.body;

    const archivos = req.files || [];
    const archivosNombres = JSON.stringify(archivos.map(f => f.filename));

    // Validar peso total de los archivos (Max 20MB)
    const totalSize = archivos.reduce((acc, file) => acc + file.size, 0);
    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

    if (totalSize > MAX_SIZE) {
        return res.status(400).json({
            error: "El tamaño total de los archivos adjuntos supera el límite permitido de 20MB."
        });
    }

    if (!ejecutiva_id || !empresa_id || !fecha_reu || !hora) {
        return res.status(400).json({
            error: "Campos obligatorios faltantes"
        });
    }

    try {
        const isSurveyProgrammed = programar_encuesta === "true" || programar_encuesta === true;
        let id_reunion = req.body.id_reunion;
        let event_id = null;
        let exists = false;

        if (id_reunion) {
            const [rows] = await db.query("SELECT id_reunion FROM reuniones WHERE id_reunion = ?", [id_reunion]);
            if (rows.length > 0) {
                exists = true;
            } else {
                event_id = id_reunion;
                id_reunion = null; // Fuerza un insert nuevo
            }
        }

        if (exists && id_reunion) {
            // Es un update de un borrador existente en la tabla reuniones
            const sql = `
                UPDATE reuniones SET 
                    ejecutiva_id=?, enviado_a=?, enviado_por=?, participantes=?,
                    tipo_reu=?, fecha_reu=?, hora=?, lugar=?, documentos_adjuntos=?,
                    motivo_reu=?, minuta=?, form_f=?, empresa_id=?, programado_para=?,
                    estado_envio='enviado', archivos_nombres=?, programar_encuesta=?,
                    encuesta_tipo=?, encuesta_programada_para=?, encuesta_estado_envio=?, encuesta_relacionada=?,
                    encuesta_destinatario=?
                WHERE id_reunion=?
            `;
            const values = [
                ejecutiva_id, enviado_a, enviado_por, participantes,
                tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos,
                motivo_reu, minuta, form_f, empresa_id, null,
                archivosNombres, isSurveyProgrammed ? 1 : 0,
                isSurveyProgrammed ? encuesta_tipo : null,
                isSurveyProgrammed ? encuesta_programada_para : null,
                isSurveyProgrammed ? 'pendiente' : 'enviado',
                req.body.encuesta_relacionada === true || req.body.encuesta_relacionada === 'true' ? 1 : 0,
                isSurveyProgrammed ? encuesta_destinatario : null,
                id_reunion
            ];
            await db.query(sql, values);
        } else {
            // Es un insert nuevo (incluye el caso de registrar minuta para una reunión agendada)
            id_reunion = await generarIdReunion();
            const sql = `
                INSERT INTO reuniones (
                    id_reunion, ejecutiva_id, enviado_a, enviado_por, participantes,
                    tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos,
                    motivo_reu, minuta, form_f, empresa_id, programado_para,
                    estado_envio, archivos_nombres, programar_encuesta,
                    encuesta_tipo, encuesta_programada_para, encuesta_estado_envio, encuesta_relacionada,
                    encuesta_destinatario, event_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enviado', ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [
                id_reunion, ejecutiva_id, enviado_a, enviado_por, participantes,
                tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos,
                motivo_reu, minuta, form_f, empresa_id, null,
                archivosNombres, isSurveyProgrammed ? 1 : 0,
                isSurveyProgrammed ? encuesta_tipo : null,
                isSurveyProgrammed ? encuesta_programada_para : null,
                isSurveyProgrammed ? 'pendiente' : 'enviado',
                req.body.encuesta_relacionada === true || req.body.encuesta_relacionada === 'true' ? 1 : 0,
                isSurveyProgrammed ? encuesta_destinatario : null,
                event_id
            ];
            await db.query(sql, values);
        }

        // Auto-mark empresa as 'gestionada' with the meeting date (NOT server date)
        await db.query(
          "UPDATE empresas SET estado_seguimiento = 'gestionada', fecha_concretada = COALESCE(fecha_concretada, ?) WHERE id = ?",
          [fecha_reu, empresa_id]
        );
        await db.query(
          "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id, asunto) VALUES (?, 'gestionada', ?, ?, ?, ?)",
          [empresa_id, fecha_reu, ejecutiva_id, id_reunion, motivo_reu || 'Minuta de reunión registrada']
        );

        // Auto-learning de dominios
        if (enviado_a) {
            try {
                let correos = [];
                if (typeof enviado_a === 'string') {
                    if (enviado_a.startsWith('[')) {
                        correos = JSON.parse(enviado_a);
                    } else {
                        correos = enviado_a.split(',').map(e => e.trim());
                    }
                } else if (Array.isArray(enviado_a)) {
                    correos = enviado_a;
                }

                const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];
                
                for (const correo of correos) {
                    if (correo && correo.includes('@')) {
                        const dominio = '@' + correo.split('@')[1].toLowerCase();
                        const domSinArroba = dominio.substring(1);
                        
                        if (!dominiosGenericos.includes(domSinArroba)) {
                            // Aprender dominio
                            await db.query(
                                "INSERT IGNORE INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)",
                                [empresa_id, dominio]
                            );
                            
                            // Aprender contacto exacto
                            await db.query(
                                "INSERT IGNORE INTO empresa_contactos (empresa_id, correo) VALUES (?, ?)",
                                [empresa_id, correo.toLowerCase()]
                            );
                        }
                    }
                }
            } catch (errDom) {
                console.error("Error aprendiendo dominios:", errDom);
            }
        }

        // Enviar inmediatamente
        const sqlDetalle = `
            SELECT 
                r.*, 
                emp.nombre AS empresa_nombre,
                z.nombre AS zona_nombre,
                e.nombre AS ejecutiva_nombre,
                e.correo AS ejecutiva_correo,
                j.correo AS jefatura_correo
            FROM reuniones r
            JOIN empresas emp ON r.empresa_id = emp.id
            LEFT JOIN zonas z ON emp.zona_id = z.id
            JOIN usuarios e ON r.ejecutiva_id = e.id
            LEFT JOIN usuarios j ON e.jefatura_id = j.id
            WHERE r.id_reunion = ?
        `;

        const [result2] = await db.query(sqlDetalle, [id_reunion]);

        if (result2.length > 0) {
            const data = result2[0];
            const attachments = archivos.map(file => ({
                filename: file.originalname,
                path: file.path
            }));

            try {
                const enviado_por_correo = req.body.enviado_por_correo;
                const enviado_por_id = req.body.enviado_por_id;
                
                // Use frontend-provided CCs if available, otherwise generate default
                const correosCc = req.body.correos_cc !== undefined 
                    ? req.body.correos_cc 
                    : await calcularDefaultCc(data.empresa_id, data.ejecutiva_id, enviado_por_correo, enviado_por_id);

                // Enviar en segundo plano para evitar colgar la respuesta HTTP si el SMTP falla o demora
                enviarCorreo({
                    to: data.enviado_a,
                    cc: correosCc,
                    userEmail: req.usuario?.correo,
                    subject: `Reunión ${data.tipo_reu} - ${data.empresa_nombre} - ${data.id_reunion}`,
                    data: {
                        id_reunion: data.id_reunion,
                        participantes: data.participantes,
                        empresa: data.empresa_nombre,
                        ejecutiva: data.ejecutiva_nombre,
                        fecha_reu: data.fecha_reu,
                        hora: data.hora,
                        lugar: data.lugar,
                        motivo_reu: data.motivo_reu,
                        minuta: data.minuta,
                        enviado_por: data.enviado_por,
                        documentos_adjuntos: data.documentos_adjuntos
                    },
                    attachments
                }).catch(error => {
                    console.error("Error enviando correo inmediato:", error);
                });
            } catch (error) {
                console.error("Error al preparar envío de correo:", error);
            }
        }

        res.json({
            msg: "Reunión creada y minuto enviado",
            id_reunion
        });

    } catch (error) {
        console.error("Error al crear reunión:", error);
        return res.status(500).json({ error: "Error interno al crear la reunión" });
    }
};

// ­ƒö╣ OBTENER DESTINATARIOS POR EMPRESA (Para Autocompletado)
exports.obtenerDestinatarios = async (req, res) => {
    const { empresa_id } = req.query;
    
    if (!empresa_id) {
        return res.status(400).json({ error: "empresa_id es requerido" });
    }

    const sql = `
        SELECT correo 
        FROM empresa_contactos 
        WHERE empresa_id = ? 
        ORDER BY correo ASC
    `;

    try {
        const [result] = await db.query(sql, [empresa_id]);
        res.json(result.map(r => r.correo));
    } catch (err) {
        console.error("Error en obtenerDestinatarios:", err);
        res.status(500).json({ error: "Error en la BD" });
    }
};

// 🔹 OBTENER TIPOS DE REUNIÓN UNICOS
exports.obtenerTiposReunion = async (req, res) => {
    const sql = `
        SELECT DISTINCT tipo_reu 
        FROM reuniones 
        WHERE tipo_reu IS NOT NULL 
        AND tipo_reu != ''
        ORDER BY tipo_reu ASC
    `;

    try {
        const [result] = await db.query(sql);
        res.json(result.map(r => r.tipo_reu));
    } catch (err) {
        console.error("Error en obtenerTiposReunion:", err);
        res.status(500).json({ error: "Error en la BD" });
    }
};

// 🔹 PROBAR SMTP (Para diagnóstico)
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
        verify: null,
        send: null,
        error: null
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

exports.obtenerDefaultCc = async (req, res) => {
    const { empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id } = req.query;

    if (!empresa_id || !ejecutiva_id) {
        return res.json({ cc: enviado_por_correo || "" });
    }

    try {
        const cc = await calcularDefaultCc(empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id);
        res.json({ cc });
    } catch (err) {
        console.error("Error en obtenerDefaultCc:", err);
        res.status(500).json({ error: "Error obteniendo CC por defecto" });
    }
};

exports.marcarNoAplica = async (req, res) => {
    const { id } = req.params;
    const { isHuerfana, noAplica } = req.body;

    try {
        if (isHuerfana) {
            const realId = id.replace("huerfana-", "");
            const nuevoEstado = noAplica ? 'no_aplica' : 'pendiente';
            await db.query("UPDATE reuniones_huerfanas SET estado = ? WHERE id = ?", [nuevoEstado, realId]);
            return res.json({ success: true, message: "Estado de huérfana actualizado" });
        } else {
            const nuevoEstadoEnvio = noAplica ? 'no_aplica' : 'borrador';
            const [resultReuniones] = await db.query("UPDATE reuniones SET estado_envio = ? WHERE id_reunion = ?", [nuevoEstadoEnvio, id]);
            
            if (resultReuniones.affectedRows > 0) {
                return res.json({ success: true, message: "Estado de minuta actualizado" });
            }

            const nuevoEstadoLog = noAplica ? 'no_aplica' : 'agendada';
            const [resultLog] = await db.query(
                "UPDATE empresa_seguimiento_log SET estado = ? WHERE reunion_id = ? AND estado IN ('agendada', 'no_aplica')",
                [nuevoEstadoLog, id]
            );

            if (resultLog.affectedRows > 0) {
                return res.json({ success: true, message: "Estado de agendamiento actualizado" });
            }

            return res.status(404).json({ error: "Reunión no encontrada" });
        }
    } catch (err) {
        console.error("Error en marcarNoAplica:", err);
        res.status(500).json({ error: "Error interno" });
    }
};
