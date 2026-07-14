const { Router } = require("express");
const controller = require("./nuevos_negocios.controller");

const router = Router();

// Rutas que no usan :id deben ir ANTES de las que sí
router.get("/stats", controller.stats);
router.get("/opciones", controller.opciones);
router.get("/export/excel", controller.exportExcel);

router.get("/", controller.listar);
router.post("/", controller.crear);

router.get("/:id", controller.detalle);
router.get("/:id/historial", controller.historial);
router.put("/:id", controller.actualizar);
router.patch("/:id/estado", controller.cambiarEstado);
router.delete("/:id", controller.eliminar);

module.exports = router;
