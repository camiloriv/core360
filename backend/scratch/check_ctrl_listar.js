require('dotenv').config();
const { listarReuniones } = require('../modules/reuniones/reuniones.controller');

async function test() {
  const req = { query: {} };
  const res = {
    json: (data) => {
      console.log("R620:", data.find(r => r.id_reunion == 620));
      console.log("R619:", data.find(r => r.id_reunion == 619));
      process.exit(0);
    },
    status: () => res
  };
  await listarReuniones(req, res);
}
test();
