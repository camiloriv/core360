const db = require("../../database/connection");
const { enviarCorreo } = require("../../services/email/email.service");

// 🔹 LISTAR REUNIONES
exports.listarReuniones = async (req, res) => {
    const sql = `
        SELECT 
            r.*, 
            e.nombre AS ejecutiva_nombre, 
            emp.nombre AS empresa_nombre,
            j.nombre AS jefatura_nombre
        FROM reuniones r
        JOIN usuarios e ON r.ejecutiva_id = e.id
        JOIN empresas emp ON r.empresa_id = emp.id
        LEFT JOIN usuarios j ON e.jefatura_id = j.id
        ORDER BY r.fecha_reu DESC, r.hora DESC
    `;

    try {
        const [result] = await db.query(sql);
        res.json(result);
    } catch (err) {
        console.error("Error en listarReuniones:", err);
        return res.status(500).json({ error: "Error en la BD" });
    }
};

// 🔹 ESTADÍSTICAS PARA DASHBOARD
exports.obtenerStats = async (req, res) => {
    try {
        const stats = {};

        // 1. Conteo por tipo
        const [porTipo] = await db.query(`
            SELECT tipo_reu as name, COUNT(*) as value 
            FROM reuniones 
            GROUP BY tipo_reu
        `);
        stats.porTipo = porTipo;

        // 2. Conteo por ejecutiva
        const [porEjecutiva] = await db.query(`
            SELECT e.nombre as name, COUNT(*) as value 
            FROM reuniones r
            JOIN usuarios e ON r.ejecutiva_id = e.id
            GROUP BY e.id, e.nombre
            ORDER BY value DESC
        `);
        stats.porEjecutiva = porEjecutiva;

        // 3. Resumen general
        const [resumen] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as este_ano,
                COUNT(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as este_mes
            FROM reuniones
        `);
        stats.resumen = resumen[0];

        // 4. Últimos 6 meses (Tendencia)
        const [tendencia] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as mes,
                COUNT(*) as total
            FROM reuniones
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY mes
            ORDER BY mes ASC
        `);
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
        encuesta_programada_para
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
                encuesta_tipo, encuesta_programada_para, encuesta_estado_envio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            id_reunion, ejecutiva_id, enviado_a, enviado_por, participantes,
            tipo_reu, fecha_reu, hora, lugar, documentos_adjuntos,
            motivo_reu, minuta, form_f, empresa_id, null,
            'enviado', archivosNombres, isSurveyProgrammed ? 1 : 0,
            isSurveyProgrammed ? encuesta_tipo : null,
            isSurveyProgrammed ? encuesta_programada_para : null,
            isSurveyProgrammed ? 'pendiente' : 'enviado'
        ];

        await db.query(sql, values);

        // Enviar inmediatamente
        const sqlDetalle = `
            SELECT 
                r.*, 
                emp.nombre AS empresa_nombre,
                e.nombre AS ejecutiva_nombre,
                e.correo AS ejecutiva_correo,
                j.correo AS jefatura_correo
            FROM reuniones r
            JOIN empresas emp ON r.empresa_id = emp.id
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
                const correosCc = [data.ejecutiva_correo, data.jefatura_correo].filter(Boolean).join(',');
                await enviarCorreo({
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
                });
            } catch (error) {
                console.error("Error enviando correo inmediato:", error);
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

