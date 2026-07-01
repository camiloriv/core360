const { Router } = require("express");
const adminController = require("./admin.controller");

const router = Router();

// GET /admin/diagnostico - Estado de la BD para diagnóstico
router.get("/diagnostico", adminController.diagnostico);

// POST /admin/reset-meeting-data - Limpia TODOS los datos de reuniones y empieza en blanco
router.post("/reset-meeting-data", adminController.resetMeetingData);

// POST /admin/cleanup-dev - Alias de reset-meeting-data (compatibilidad)
router.post("/cleanup-dev", adminController.cleanupDev);

// POST /admin/reset-passwords - Resetea masivamente las contraseñas a 123
router.post("/reset-passwords", adminController.resetPasswords);

module.exports = router;
