const express = require('express');
const router = express.Router();
const agendamientoController = require('./agendamiento.controller');
const { verificarToken } = require('../../middleware/auth.middleware');

// Rutas base: /api/agendamiento
router.post('/', verificarToken, agendamientoController.crearReunionTeams);
router.post('/anular', verificarToken, agendamientoController.anularReunionTeams);
router.get('/calendario', verificarToken, agendamientoController.obtenerEventosCalendario);

// Sincronización híbrida
router.post('/sync-past', verificarToken, agendamientoController.syncEventosPasados);
router.get('/huerfanas', verificarToken, agendamientoController.getHuerfanas);
router.post('/huerfanas/vincular', verificarToken, agendamientoController.vincularHuerfana);
router.post('/huerfanas/descartar', verificarToken, agendamientoController.descartarHuerfana);
router.post('/huerfanas/desvincular', verificarToken, agendamientoController.desvincularBorrador);

module.exports = router;
