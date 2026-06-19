const { syncEventosPasados } = require('./modules/reuniones/agendamiento.service');
const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

async function run() {
  try {
    console.log("Iniciando sync para usuario_id=9");
    await syncEventosPasados(9);
    console.log("Sync finalizada.");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

run();
