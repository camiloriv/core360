const editorRepository = require("../../database/repositories/encuestas.editor.repository");

// --- GESTIÓN DE TEMPLATES ---
const listarTemplates = async () => {
    return await editorRepository.listarTemplates();
};

const crearTemplate = async (nombre) => {
    return await editorRepository.crearTemplate(nombre);
};

const actualizarTemplate = async (id, nombre, activo) => {
    await editorRepository.actualizarTemplate(id, nombre, activo);
};

// --- GESTIÓN DE DIMENSIONES ---
const listarDimensiones = async () => {
    return await editorRepository.listarDimensiones();
};

const crearDimension = async (nombre) => {
    return await editorRepository.crearDimension(nombre);
};

// --- GESTIÓN DE PREGUNTAS (BIBLIOTECA) ---

const listarPreguntasPorTemplate = async (templateId) => {
    return await editorRepository.listarPreguntasPorTemplate(templateId);
};

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
        solo_este_template
    } = data;

    let finalPreguntaId = pregunta_id;

    const preguntaData = {
        dimension_id,
        subdimension: subdimension || null,
        texto,
        tipo,
        escala: escala || 5,
        es_nps: es_nps ? 1 : 0,
        opciones_json: typeof opciones_json === 'string' ? opciones_json : JSON.stringify(opciones_json || [])
    };

    // 1. LÓGICA DE CATÁLOGO (MASTER)
    if (!pregunta_id) {
        finalPreguntaId = await editorRepository.insertPreguntaCatalogo(preguntaData);
    } 
    else if (solo_este_template) {
        finalPreguntaId = await editorRepository.insertPreguntaCatalogo(preguntaData);
        await editorRepository.updateVinculoTemplatePregunta(template_id, pregunta_id, finalPreguntaId);
    }
    else {
        await editorRepository.updatePreguntaCatalogo(pregunta_id, preguntaData);
    }

    if (!template_id) {
        return { id: finalPreguntaId };
    }

    // 2. LÓGICA DE ASIGNACIÓN (TEMPLATE-PREGUNTA)
    let finalOrden = orden;
    if (!pregunta_id) {
        finalOrden = (await editorRepository.getMaxOrdenTemplate(template_id)) + 1;
    }

    await editorRepository.upsertTemplatePregunta(
        template_id, 
        finalPreguntaId, 
        finalOrden || 1, 
        requerida !== undefined ? (requerida ? 1 : 0) : 1
    );

    return { id: finalPreguntaId };
};

const eliminarPregunta = async (template_id, pregunta_id) => {
    await editorRepository.eliminarPreguntaTemplate(template_id, pregunta_id);
};

const eliminarPreguntaCatalogo = async (preguntaId) => {
    await editorRepository.unlinkPreguntaFromAllTemplates(preguntaId);
    await editorRepository.softDeletePreguntaCatalogo(preguntaId);
    return { success: true };
};

const vincularPreguntaATemplate = async (template_id, pregunta_id) => {
    const nextOrder = (await editorRepository.getMaxOrdenTemplate(template_id)) + 1;
    await editorRepository.upsertTemplatePregunta(template_id, pregunta_id, nextOrder, 1);
    return { success: true };
};

const eliminarTemplate = async (id) => {
    await editorRepository.softDeleteTemplate(id);
    return { success: true };
};

const eliminarDimension = async (id) => {
    await editorRepository.eliminarDimension(id);
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
    eliminarPreguntaCatalogo,
    vincularPreguntaATemplate,
    eliminarTemplate,
    eliminarDimension
};

