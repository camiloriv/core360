const { Router } = require("express");
const controller = require("./ejecutivas.controller");

const router = Router();

router.get("/", controller.obtenerEjecutivas);
router.post("/", controller.crearEjecutiva);
router.put("/:id", controller.actualizarEjecutiva);
router.delete("/:id", controller.eliminarEjecutiva);

module.exports = router;
