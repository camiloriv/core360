require('dotenv').config();
const { obtenerReuniones } = require('../modules/reuniones/reuniones.controller');

async function test() {
  const req = { query: {} };
  const res = {
    json: (data) => {
      console.log("R625:", data.find(r => r.id_reunion === 625));
      console.log("R620:", data.find(r => r.id_reunion === 620));
      console.log("R619:", data.find(r => r.id_reunion === 619));
      process.exit(0);
    },
    status: () => res
  };
  await obtenerReuniones(req, res);
}
test();
