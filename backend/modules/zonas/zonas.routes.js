const { Router } = require("express");
const { obtenerZonas } = require("./zonas.controller");

const router = Router();

router.get("/", obtenerZonas);

module.exports = router;
