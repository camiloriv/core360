require('dotenv').config();
const db = require('../database/connection');

async function insertDummy() {
  await db.query(`
    INSERT INTO teams_eventos (event_id, usuario_id, asunto, fecha, hora, estado, asistentes)
    VALUES ('DUMMY-123', 1, 'Reunión de prueba huérfana', '2026-06-30', '10:00', 'pasada', '[]')
  `);
  console.log("Dummy insertado.");
  process.exit(0);
}
insertDummy().catch(console.error);
