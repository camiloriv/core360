const db = require("../database/connection");

async function check() {
  try {
    // Buscar específicamente huérfanas de las últimas 48 horas
    const [huerfanas] = await db.query(`
      SELECT id, event_id, asunto, fecha, hora, estado, asistentes, usuario_id, created_at
      FROM reuniones_huerfanas
      WHERE fecha >= '2026-06-24' 
      ORDER BY fecha DESC, hora DESC
    `);
    console.log("\n=== TODAS LAS HUERFANAS RECIENTES ===");
    huerfanas.forEach(h => {
      console.log(`  id:${h.id} | estado:${h.estado} | ${h.fecha?.toISOString?.()?.split('T')[0] || h.fecha} ${h.hora} | asunto:${h.asunto} | usuario_id:${h.usuario_id}`);
    });

    // Buscar reunión a las 18:00 ayer
    const [ayer18] = await db.query(`
      SELECT r.*, e.nombre as empresa_nombre
      FROM reuniones r
      LEFT JOIN empresas e ON r.empresa_id = e.id
      WHERE DATE(r.fecha_reu) = '2026-06-25' AND TIME(r.hora) >= '17:30:00'
    `);
    console.log("\n=== REUNIONES AYER TARDE (18:00) ===");
    if (ayer18.length === 0) console.log("  (ninguna en la tabla reuniones)");
    ayer18.forEach(r => {
      console.log(`  ${r.id_reunion} | ${r.empresa_nombre} | estado: ${r.estado_envio} | ${r.hora} | ${r.asunto_teams}`);
    });

    // Ver el log de "Induccion CBC" que apareció
    const [logCBC] = await db.query(`
      SELECT l.*, e.nombre as empresa_nombre
      FROM empresa_seguimiento_log l
      LEFT JOIN empresas e ON l.empresa_id = e.id
      WHERE l.asunto LIKE '%CBC%' OR l.asunto LIKE '%HDI%' OR l.asunto LIKE '%18%'
      ORDER BY l.created_at DESC
      LIMIT 10
    `);
    console.log("\n=== LOGS RELACIONADOS ===");
    logCBC.forEach(l => {
      console.log(`  [${l.estado}] ${l.empresa_nombre} | ${l.asunto} | fecha:${l.fecha} | reunion_id:${l.reunion_id}`);
    });

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
}
check();
