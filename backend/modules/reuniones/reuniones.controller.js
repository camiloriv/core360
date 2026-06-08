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

// 🔹 LISTAR REUNIONES
exports.listarReuniones = async (req, res) => {
    const { usuario_id, rol } = req.query;
    const { whereClause, params } = buildRoleWhereClause(usuario_id, rol);

    const sql = `
        SELECT 
            r.*, 
            e.nombre AS ejecutiva_nombre, 
            emp.nombre AS empresa_nombre,
            j.nombre AS jefatura_nombre
        FROM reuniones r
        LEFT JOIN usuarios e ON r.ejecutiva_id = e.id
        LEFT JOIN empresas emp ON r.empresa_id = emp.id
        LEFT JOIN usuarios j ON emp.jefatura_id = j.id
        ${whereClause}
        ORDER BY r.fecha_reu DESC, r.hora DESC
    `;

    try {
        const [result] = await db.query(sql, params);
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
        SELECT COUNT(*) AS total 
        FROM reuniones 
        WHERE YEAR(created_at) = ?
    `;

    const [result] = await db.query(sql, [year]);

    const total = result[0].total + 1;
    const correlativo = String(total).padStart(4, "0");

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
        const id_reunion = await generarIdReunion();
        const isSurveyProgrammed = programar_encuesta === "true" || programar_encuesta === true;

        const sql = `
            INSERT INTO reuniones (
                id_reunion, ejecutiva_id, enviado_a, enviado_por, participantes,
                tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos,
                motivo_reu, minuta, form_f, empresa_id, programado_para,
                estado_envio, archivos_nombres, programar_encuesta,
                encuesta_tipo, encuesta_programada_para, encuesta_estado_envio, encuesta_relacionada,
                encuesta_destinatario
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            id_reunion, ejecutiva_id, enviado_a, enviado_por, participantes,
            tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos,
            motivo_reu, minuta, form_f, empresa_id, null,
            'enviado', archivosNombres, isSurveyProgrammed ? 1 : 0,
            isSurveyProgrammed ? encuesta_tipo : null,
            isSurveyProgrammed ? encuesta_programada_para : null,
            isSurveyProgrammed ? 'pendiente' : 'enviado',
            req.body.encuesta_relacionada === true || req.body.encuesta_relacionada === 'true' ? 1 : 0,
            isSurveyProgrammed ? encuesta_destinatario : null
        ];

        await db.query(sql, values);

        // Auto-mark empresa as 'gestionada' with the meeting date (NOT server date)
        await db.query(
          "UPDATE empresas SET estado_seguimiento = 'gestionada', fecha_concretada = COALESCE(fecha_concretada, ?) WHERE id = ?",
          [fecha_reu, empresa_id]
        );
        await db.query(
          "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id, reunion_id) VALUES (?, 'gestionada', ?, ?, ?)",
          [empresa_id, fecha_reu, ejecutiva_id, id_reunion]
        );

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
                const correosCcArray = [data.ejecutiva_correo, data.jefatura_correo];
                
                if (enviado_por_correo) {
                    correosCcArray.push(enviado_por_correo);
                }

                const isTest = data.empresa_nombre?.toLowerCase().includes("demo") || 
                               data.empresa_nombre?.toLowerCase().includes("prueba") || 
                               enviado_por_correo?.toLowerCase().includes("prueba") ||
                               data.ejecutiva_correo?.toLowerCase().includes("prueba");

                if (data.zona_nombre && data.zona_nombre.toLowerCase().includes("matriz") && !isTest) {
                    correosCcArray.push("lortega@proforma.cl");
                }
                
                // Deduplicate emails and remove any null/undefined
                const correosCc = [...new Set(correosCcArray.filter(Boolean))].join(',');
                // Enviar en segundo plano para evitar colgar la respuesta HTTP si el SMTP falla o demora
                enviarCorreo({
                    to: data.enviado_a,
                    cc: correosCc,
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

// 🔹 OBTENER DESTINATARIOS POR EMPRESA (Para Autocompletado)
exports.obtenerDestinatarios = async (req, res) => {
    const { empresa_id } = req.query;
    
    if (!empresa_id) {
        return res.status(400).json({ error: "empresa_id es requerido" });
    }

    const sql = `
        SELECT DISTINCT enviado_a 
        FROM reuniones 
        WHERE empresa_id = ? 
        AND enviado_a IS NOT NULL 
        AND enviado_a != ''
        ORDER BY enviado_a ASC
    `;

    try {
        const [result] = await db.query(sql, [empresa_id]);
        res.json(result.map(r => r.enviado_a));
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
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            user: process.env.MAIL_USER,
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

