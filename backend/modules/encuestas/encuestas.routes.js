const express = require("express");
const router = express.Router();
const controller = require("./encuestas.controller");
const { verificarToken } = require("../../middleware/auth.middleware");

// 1. RUTAS ESTÁTICAS / ESPECÍFICAS (Deben ir primero)
router.get("/templates", verificarToken, controller.obtenerTemplates);
router.get("/catalogo-preguntas", verificarToken, controller.obtenerPreguntas);
router.get("/respuestas/all", verificarToken, controller.obtenerRespuestas);
router.get("/resumen/general", verificarToken, controller.obtenerStats);
router.get("/resumen/kpis", verificarToken, controller.obtenerKpis);

// 2. RUTAS DEL EDITOR
router.get("/editor/templates", verificarToken, controller.listarTemplatesFull);
router.post("/editor/templates", verificarToken, controller.crearTemplateBase);
router.patch("/editor/templates", verificarToken, controller.actualizarTemplateBase);
router.delete("/editor/templates/:id", verificarToken, controller.eliminarTemplate);
router.get("/editor/dimensiones", verificarToken, controller.listarDimensiones);
router.post("/editor/dimensiones", verificarToken, controller.crearDimension);
router.delete("/editor/dimensiones/:id", verificarToken, controller.eliminarDimension);
router.get("/editor/preguntas/:id", verificarToken, controller.listarPreguntasTemplate);
router.post("/editor/preguntas", verificarToken, controller.guardarPregunta);
router.delete("/editor/preguntas/:templateId/:preguntaId", verificarToken, controller.eliminarPregunta);
router.delete("/editor/catalogo-preguntas/:id", verificarToken, controller.eliminarPreguntaCatalogo);
router.post("/editor/preguntas/vincular", verificarToken, controller.vincularPregunta);

// 3. RUTAS DE ACCIÓN
router.post("/crear", verificarToken, controller.crearEncuesta);
router.post("/enviar-correo", verificarToken, controller.enviarCorreo);
router.patch("/toggle-estado", verificarToken, controller.toggleEstado);

// PÚBLICAS
router.post("/responder", controller.responderEncuesta);

// 4. RUTAS PARAMETRIZADAS (Deben ir al final)
router.get("/:token", controller.obtenerEncuesta);

module.exports = router;
