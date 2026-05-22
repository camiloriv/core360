const express = require("express");
const router = express.Router();
const usuariosController = require("./usuarios.controller");

router.get("/", usuariosController.obtenerUsuarios);
router.post("/", usuariosController.crearUsuario);
router.post("/cambiar-contrasena", usuariosController.cambiarContrasena);
router.put("/:id", usuariosController.actualizarUsuario);
router.delete("/:id", usuariosController.eliminarUsuario);

module.exports = router;
