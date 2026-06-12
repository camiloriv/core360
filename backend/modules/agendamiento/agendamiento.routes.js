const express = require('express');
const router = express.Router();
const agendamientoController = require('./agendamiento.controller');
const { verificarToken } = require('../../middleware/auth.middleware');

// Rutas base: /api/agendamiento
router.post('/', verificarToken, agendamientoController.crearReunionTeams);
router.post('/anular', verificarToken, agendamientoController.anularReunionTeams);
router.get('/calendario', verificarToken, agendamientoController.obtenerEventosCalendario);

module.exports = router;
