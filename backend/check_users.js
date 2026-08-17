const db = require('./database/connection');

async function run() {
  try {
    const [u1] = await db.query("SELECT id, nombre, correo, permisos, jefatura_id, zona_id, gerencia_id FROM usuarios WHERE correo = 'crivera@proforma.cl'");
    console.log('crivera:', u1);

    const [u2] = await db.query("SELECT id, nombre, correo, permisos, jefatura_id, zona_id, gerencia_id FROM usuarios WHERE nombre LIKE '%Beatriz%'");
    console.log('beatriz:', u2);
    
    // Veamos si hay empresas asignadas a crivera o beatriz
    if (u1.length) {
      const [emp1] = await db.query("SELECT count(*) as count FROM empresas WHERE jefatura_id = ?", [u1[0].id]);
      console.log('empresas crivera:', emp1);
    }
    if (u2.length) {
      const [emp2] = await db.query("SELECT count(*) as count FROM empresas WHERE jefatura_id = ?", [u2[0].id]);
      console.log('empresas beatriz:', emp2);
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

run();
