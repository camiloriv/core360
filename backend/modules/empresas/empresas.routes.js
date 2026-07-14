const { Router } = require("express");
const controller = require("./empresas.controller");

const router = Router();

router.get("/", controller.listarEmpresas);
router.get("/vinculaciones", controller.obtenerVinculaciones);
router.put("/:id/vinculaciones", controller.actualizarVinculaciones);
router.get("/seguimiento-logs", controller.obtenerLogsEmpresas);
router.get("/jefatura/:id_jefatura", controller.obtenerEmpresasPorJefatura);
router.get("/:id/historial", controller.obtenerHistorialSeguimiento);
router.get("/:id/usuarios-asignados", controller.obtenerUsuariosAsignados);
router.get("/:id_ejecutiva", controller.obtenerEmpresasPorEjecutiva);
router.post("/", controller.crearEmpresa);
router.put("/:id", controller.actualizarEmpresa);
router.delete("/:id", controller.eliminarEmpresa);
router.patch("/:id/estado", controller.actualizarEstadoEmpresa);
router.post("/traspaso-masivo", controller.traspasoMasivo);
router.post("/carga-masiva", controller.cargaMasivaEmpresas);
router.post("/traspaso-excel", controller.traspasoExcel);

module.exports = router;

