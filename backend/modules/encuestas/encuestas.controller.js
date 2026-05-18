const service = require("./encuestas.service");
const dashboardService = require("./encuestas.dashboard.service");
const editorService = require("./encuestas.editor.service");

// 🔹 Crear encuesta
const crearEncuesta = async (req, res) => {
  try {
    const data = await service.crearEncuesta(req.body);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear encuesta" });
  }
};

// 🔹 Obtener templates activos
const obtenerTemplates = async (req, res) => {
  try {
    const templates = await service.obtenerTemplates();
    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener templates" });
  }
};

// 🔹 Obtener encuesta completa
const obtenerEncuesta = async (req, res) => {
  try {
    const encuesta = await service.obtenerEncuestaPorToken(
      req.params.token
    );

    if (!encuesta) {
      return res.status(404).json({
        error: "Encuesta no encontrada",
      });
    }

    res.json(encuesta);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener encuesta",
    });
  }
};

// 🔹 Guardar respuesta
const responderEncuesta = async (req, res) => {
  try {
    await service.guardarRespuesta(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al guardar respuesta",
    });
  }
};

const emailService = require("../../services/email/email.service");

// 🔹 Enviar correo con link de encuesta
const enviarCorreo = async (req, res) => {
  try {
    const { email, url, encuesta_id, user_nombre } = req.body;
    if (!email || !url) {
      return res.status(400).json({ error: "Email y URL son requeridos" });
    }

    let bcc = null;
    if (encuesta_id) {
      bcc = await service.obtenerCorreosBcc(encuesta_id);
    }

    const enviado = await emailService.enviarCorreoEncuesta(email, url, bcc, user_nombre);
    if (enviado) {
      // Si se envió, registrar el correo en la tabla encuestas
      if (encuesta_id) {
        await service.registrarEnvio(encuesta_id, email);
      }
      res.json({ success: true, message: "Correo enviado correctamente" });
    } else {
      res.status(500).json({ error: "No se pudo enviar el correo" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno al enviar correo" });
  }
};

const obtenerRespuestas = async (req, res) => {
  try {
    const respuestas = await service.obtenerTodasLasRespuestas();
    res.json(respuestas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener respuestas" });
  }
};

const obtenerStats = async (req, res) => {
  try {
    const total = await service.obtenerTotalEnvios();
    res.json({ total_envios: total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};

const obtenerPreguntas = async (req, res) => {
  try {
    const preguntas = await service.obtenerCatalogoPreguntas();
    res.json(preguntas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener catálogo de preguntas" });
  }
};

const obtenerKpis = async (req, res) => {
  try {
    const [promedios, ranking, detalles, dimensiones] = await Promise.all([
      dashboardService.obtenerPromediosPorDimension(),
      dashboardService.obtenerRankingEjecutivas(),
      dashboardService.obtenerDetalleRespuestas(),
      editorService.listarDimensiones()
    ]);
    res.json({ promedios, ranking, detalles, dimensiones });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener KPIs del dashboard" });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const { id, activo } = req.body;
    await service.toggleEstadoEncuesta(id, activo);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cambiar estado de la encuesta" });
  }
};

// --- MÉTODOS DEL EDITOR ---
const listarTemplatesFull = async (req, res) => {
    try { res.json(await editorService.listarTemplates()); }
    catch (err) { res.status(500).json({ error: err.message }); }
};

const crearTemplateBase = async (req, res) => {
    try { res.json(await editorService.crearTemplate(req.body.nombre)); }
    catch (err) { res.status(500).json({ error: err.message }); }
};

const actualizarTemplateBase = async (req, res) => {
    try {
        const { id, nombre, activo } = req.body;
        await editorService.actualizarTemplate(id, nombre, activo);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const listarDimensiones = async (req, res) => {
    try { res.json(await editorService.listarDimensiones()); }
    catch (err) { res.status(500).json({ error: err.message }); }
};

const crearDimension = async (req, res) => {
    try { res.json(await editorService.crearDimension(req.body.nombre)); }
    catch (err) { res.status(500).json({ error: err.message }); }
};

const listarPreguntasTemplate = async (req, res) => {
    try { res.json(await editorService.listarPreguntasPorTemplate(req.params.id)); }
    catch (err) { res.status(500).json({ error: err.message }); }
};

const guardarPregunta = async (req, res) => {
    try { res.json(await editorService.guardarPregunta(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
};

const eliminarPregunta = async (req, res) => {
    try {
        const { templateId, preguntaId } = req.params;
        await editorService.eliminarPregunta(templateId, preguntaId);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const vincularPregunta = async (req, res) => {
    try {
        const { templateId, preguntaId } = req.body;
        res.json(await editorService.vincularPreguntaATemplate(templateId, preguntaId));
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = {
  crearEncuesta,
  obtenerTemplates,
  obtenerEncuesta,
  responderEncuesta,
  enviarCorreo,
  obtenerRespuestas,
  obtenerStats,
  obtenerPreguntas,
  obtenerKpis,
  toggleEstado,
  listarTemplatesFull,
  crearTemplateBase,
  actualizarTemplateBase,
  listarDimensiones,
  crearDimension,
  listarPreguntasTemplate,
  guardarPregunta,
  eliminarPregunta,
  vincularPregunta
};
