const express = require("express");
const router = express.Router();
const controller = require("./encuestas.controller");

// 1. RUTAS ESTÁTICAS / ESPECÍFICAS (Deben ir primero)
router.get("/templates", controller.obtenerTemplates);
router.get("/catalogo-preguntas", controller.obtenerPreguntas);
router.get("/respuestas/all", controller.obtenerRespuestas);
router.get("/stats/summary", controller.obtenerStats);
router.get("/stats/kpis", controller.obtenerKpis);

// 2. RUTAS DEL EDITOR
router.get("/editor/templates", controller.listarTemplatesFull);
router.post("/editor/templates", controller.crearTemplateBase);
router.patch("/editor/templates", controller.actualizarTemplateBase);
router.get("/editor/dimensiones", controller.listarDimensiones);
router.post("/editor/dimensiones", controller.crearDimension);
router.get("/editor/preguntas/:id", controller.listarPreguntasTemplate);
router.post("/editor/preguntas", controller.guardarPregunta);
router.delete("/editor/preguntas/:templateId/:preguntaId", controller.eliminarPregunta);
router.post("/editor/preguntas/vincular", controller.vincularPregunta);

// 3. RUTAS DE ACCIÓN
router.post("/crear", controller.crearEncuesta);
router.post("/responder", controller.responderEncuesta);
router.post("/enviar-correo", controller.enviarCorreo);
router.patch("/toggle-estado", controller.toggleEstado);

// 4. RUTAS PARAMETRIZADAS (Deben ir al final)
router.get("/:token", controller.obtenerEncuesta);

module.exports = router;
