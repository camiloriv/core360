const jwt = require('jsonwebtoken');

async function test() {
  try {
    const token = jwt.sign({ id: 9, rol: 'admin' }, 'core360_secreto_desarrollo_temporal_2026_super_seguro', { expiresIn: '1h' });
    const res = await fetch("http://127.0.0.1:8080/reuniones", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const r620 = data.find(r => r.id_reunion == 620);
    const r619 = data.find(r => r.id_reunion == 619);
    console.log("R620 from RUNNING server:", r620.estado_envio, r620.estado_teams);
    console.log("R619 from RUNNING server:", r619.estado_envio, r619.estado_teams);
  } catch(e) {
    console.error(e);
  }
}
test();
