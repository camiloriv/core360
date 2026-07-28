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
const auditController = require("./audit.controller");

// ... (existing routes)
// GET /admin/audit-log - Obtener logs de auditoría
router.get("/audit-log", auditController.getAuditLog);

// GET /admin/audit-log/acciones - Obtener acciones disponibles para filtros
router.get("/audit-log/acciones", auditController.getAccionesDisponibles);

module.exports = router;
