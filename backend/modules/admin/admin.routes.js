const { Router } = require("express");
const adminController = require("./admin.controller");

const router = Router();

// POST /admin/cleanup-dev - Limpia BD del entorno de desarrollo
router.post("/cleanup-dev", adminController.cleanupDev);

module.exports = router;
