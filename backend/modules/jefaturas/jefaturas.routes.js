const { Router } = require("express");
const controller = require("./jefaturas.controller");

const router = Router();

router.get("/", controller.obtenerJefaturas);
router.post("/", controller.crearJefatura);
router.put("/:id", controller.actualizarJefatura);
router.delete("/:id", controller.eliminarJefatura);

module.exports = router;
