const express = require('express');
const router = express.Router();
const agendamientoController = require('./agendamiento.controller');
const { verificarToken } = require('../../middleware/auth.middleware');

// Rutas base: /api/agendamiento

// Crear y anular reuniones en Teams
router.post('/', verificarToken, agendamientoController.crearReunionTeams);
router.post('/anular', verificarToken, agendamientoController.anularReunionTeams);

// Vista de calendario (consulta directa a Graph)
router.get('/calendario', verificarToken, agendamientoController.obtenerEventosCalendario);

// Sincronización con Microsoft Graph → teams_eventos
router.get('/sync-status', verificarToken, agendamientoController.getSyncStatus);
router.post('/sync-past', verificarToken, agendamientoController.syncEventosPasados);

// CRUD de teams_eventos (vinculación de empresa a evento de Teams)
router.get('/teams-eventos', verificarToken, agendamientoController.getTeamsEventos);
router.post('/teams-eventos/:id/vincular', verificarToken, agendamientoController.vincularEmpresaAEvento);
router.post('/teams-eventos/:id/desvincular', verificarToken, agendamientoController.desvincularEmpresaDeEvento);

// Debug (mantener temporalmente)
router.get('/debug', agendamientoController.debugProforma);

module.exports = router;
