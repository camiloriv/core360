const { Router } = require("express");
const adminController = require("./admin.controller");

const router = Router();

// GET /admin/diagnostico - Estado de la BD para comparación entre entornos
router.get("/diagnostico", adminController.diagnostico);

// POST /admin/cleanup-dev - Limpia BD del entorno de desarrollo
router.post("/cleanup-dev", adminController.cleanupDev);

// POST /admin/reset-passwords - Resetea masivamente las contraseñas a 123
router.post("/reset-passwords", adminController.resetPasswords);

module.exports = router;
