const { Router } = require("express");
const controller = require("./empresas.controller");

const router = Router();

router.get("/", controller.listarEmpresas);
router.get("/:id_ejecutiva", controller.obtenerEmpresasPorEjecutiva);
router.get("/jefatura/:id_jefatura", controller.obtenerEmpresasPorJefatura);
router.post("/", controller.crearEmpresa);
router.put("/:id", controller.actualizarEmpresa);
router.delete("/:id", controller.eliminarEmpresa);
router.patch("/:id/estado", controller.actualizarEstadoEmpresa);
router.post("/traspaso-masivo", controller.traspasoMasivo);
router.post("/traspaso-excel", controller.traspasoExcel);

module.exports = router;
