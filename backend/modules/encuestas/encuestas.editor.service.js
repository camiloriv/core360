const db = require("../../database/connection");

// --- GESTIÓN DE TEMPLATES ---
const listarTemplates = async () => {
    const [rows] = await db.query("SELECT * FROM encuesta_templates ORDER BY id DESC");
    return rows;
};

const crearTemplate = async (nombre) => {
    const [result] = await db.query("INSERT INTO encuesta_templates (nombre, activo) VALUES (?, 1)", [nombre]);
    return { id: result.insertId, nombre };
};

const actualizarTemplate = async (id, nombre, activo) => {
    await db.query("UPDATE encuesta_templates SET nombre = ?, activo = ? WHERE id = ?", [nombre, activo, id]);
};

// --- GESTIÓN DE DIMENSIONES ---
const listarDimensiones = async () => {
    const [rows] = await db.query("SELECT * FROM encuesta_dimensiones ORDER BY nombre ASC");
    return rows;
};

const crearDimension = async (nombre) => {
    const [result] = await db.query("INSERT INTO encuesta_dimensiones (nombre) VALUES (?)", [nombre]);
    return { id: result.insertId, nombre };
};

// --- GESTIÓN DE PREGUNTAS (BIBLIOTECA) ---

/**
 * Lista las preguntas de un template específico uniendo con el catálogo
 */
const listarPreguntasPorTemplate = async (templateId) => {
    const [rows] = await db.query(`
        SELECT 
            tp.id as assignment_id,
            tp.template_id,
            tp.pregunta_id,
            tp.orden,
            tp.requerida,
            p.texto,
            p.tipo,
            p.escala,
            p.es_nps,
            p.subdimension,
            p.dimension_id,
            p.opciones_json,
            d.nombre as dimension_nombre,
            (SELECT COUNT(*) FROM encuesta_template_preguntas WHERE pregunta_id = p.id) as shared_count
        FROM encuesta_template_preguntas tp
        JOIN encuesta_catalogo_preguntas p ON tp.pregunta_id = p.id
        LEFT JOIN encuesta_dimensiones d ON p.dimension_id = d.id
        WHERE tp.template_id = ?
        ORDER BY tp.orden ASC
    `, [templateId]);
    return rows;
};

/**
 * Guarda una pregunta (Crear nueva o Editar existente con lógica de clonación)
 */
const guardarPregunta = async (data) => {
    const { 
        pregunta_id, 
        template_id, 
        dimension_id, 
        subdimension, 
        texto, 
        tipo, 
        escala, 
        es_nps, 
        opciones_json, 
        orden, 
        requerida,
        solo_este_template // Flag para clonación
    } = data;

    let finalPreguntaId = pregunta_id;

    // 1. LÓGICA DE CATÁLOGO (MASTER)
    if (!pregunta_id) {
        // Crear nueva pregunta en la biblioteca
        const [res] = await db.query(`
            INSERT INTO encuesta_catalogo_preguntas (dimension_id, subdimension, texto, tipo, escala, es_nps, opciones_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [dimension_id, subdimension || null, texto, tipo, escala || 5, es_nps || 0, JSON.stringify(opciones_json || [])]);
        finalPreguntaId = res.insertId;
    } 
    else if (solo_este_template) {
        // CLONACIÓN: Crear una copia para este template específico
        const [res] = await db.query(`
            INSERT INTO encuesta_catalogo_preguntas (dimension_id, subdimension, texto, tipo, escala, es_nps, opciones_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [dimension_id, subdimension || null, texto, tipo, escala || 5, es_nps || 0, JSON.stringify(opciones_json || [])]);
        
        finalPreguntaId = res.insertId;
        
        // Actualizar el vínculo para que apunte a la nueva pregunta clonada
        await db.query(`
            UPDATE encuesta_template_preguntas 
            SET pregunta_id = ? 
            WHERE template_id = ? AND pregunta_id = ?
        `, [finalPreguntaId, template_id, pregunta_id]);
    }
    else {
        // ACTUALIZAR MASTER: Modifica la pregunta original en la biblioteca
        await db.query(`
            UPDATE encuesta_catalogo_preguntas 
            SET dimension_id = ?, subdimension = ?, texto = ?, tipo = ?, escala = ?, es_nps = ?, opciones_json = ?
            WHERE id = ?
        `, [dimension_id, subdimension || null, texto, tipo, escala || 5, es_nps || 0, JSON.stringify(opciones_json || []), pregunta_id]);
    }

    // 2. LÓGICA DE ASIGNACIÓN (TEMPLATE-PREGUNTA)
    // Asegurar que existe el vínculo (para nuevos) o actualizar orden/requerida
    await db.query(`
        INSERT INTO encuesta_template_preguntas (template_id, pregunta_id, orden, requerida)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE orden = ?, requerida = ?
    `, [template_id, finalPreguntaId, orden || 1, requerida !== undefined ? requerida : 1, orden || 1, requerida !== undefined ? requerida : 1]);

    return { id: finalPreguntaId };
};

const eliminarPregunta = async (template_id, pregunta_id) => {
    // Solo eliminamos el vínculo del template. 
    // La pregunta permanece en la biblioteca (catalogo) a menos que se quiera una limpieza profunda.
    await db.query("DELETE FROM encuesta_template_preguntas WHERE template_id = ? AND pregunta_id = ?", [template_id, pregunta_id]);
};

const vincularPreguntaATemplate = async (template_id, pregunta_id) => {
    // Buscar el último orden para ponerla al final
    const [[lastOrder]] = await db.query("SELECT MAX(orden) as max_o FROM encuesta_template_preguntas WHERE template_id = ?", [template_id]);
    const nextOrder = (lastOrder?.max_o || 0) + 1;

    await db.query(`
        INSERT INTO encuesta_template_preguntas (template_id, pregunta_id, orden, requerida)
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE template_id = template_id
    `, [template_id, pregunta_id, nextOrder]);

    return { success: true };
};

module.exports = {
    listarTemplates,
    crearTemplate,
    actualizarTemplate,
    listarDimensiones,
    crearDimension,
    listarPreguntasPorTemplate,
    guardarPregunta,
    eliminarPregunta,
    vincularPreguntaATemplate
};
