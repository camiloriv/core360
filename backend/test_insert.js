const db = require('./database/connection');

async function testInsert() {
  try {
    const id = 1;
    const fechaVal = '2026-07-31';
    const usuario_id = 1;
    
    // First, let's test if the insert alone works
    await db.query(
      "INSERT INTO empresa_seguimiento_log (empresa_id, estado, fecha, usuario_id) VALUES (?, 'solicitada', ?, ?)",
      [id, fechaVal, usuario_id]
    );
    console.log("Insert successful!");
    
    // Test the whole logic
    const estado_seguimiento = 'solicitada';
    let query = "UPDATE empresas SET estado_seguimiento = ?, fecha_solicitada = ?, fecha_concretada = NULL WHERE id = ?";
    let params = [estado_seguimiento, fechaVal, id];
    await db.query(query, params);
    
    const [rows] = await db.query("SELECT fecha_solicitada, fecha_concretada FROM empresas WHERE id = ?", [id]);
    console.log("Update and fetch successful, row:", rows[0]);
    
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    process.exit(0);
  }
}

testInsert();
