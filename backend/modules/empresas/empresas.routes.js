const { Router } = require("express");
const controller = require("./empresas.controller");

const router = Router();

router.get("/", controller.listarEmpresas);
router.get("/:id_ejecutiva", controller.obtenerEmpresasPorEjecutiva);
router.get("/jefatura/:id_jefatura", controller.obtenerEmpresasPorJefatura);
router.put("/:id", controller.actualizarEmpresa);

module.exports = router;
