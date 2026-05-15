const db = require("../connection");

const cleanData = async () => {
  try {
    console.log("🚀 Iniciando limpieza total de datos de encuestas...");

    // Deshabilitar check de llaves foráneas para poder truncar
    await db.query("SET FOREIGN_KEY_CHECKS = 0");

    const tables = [
      "encuesta_respuestas",
      "respuestas",
      "encuestas"
    ];

    for (const table of tables) {
      try {
        await db.query(`TRUNCATE TABLE ${table}`);
        console.log(`✅ Tabla ${table} vaciada.`);
      } catch (e) {
        console.error(`❌ Error vaciando ${table}: ${e.message}`);
      }
    }

    // Re-habilitar check de llaves foráneas
    await db.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("✨ Base de datos de encuestas limpia y lista para datos reales.");
  } catch (err) {
    console.error("❌ Error crítico:", err);
  } finally {
    process.exit(0);
  }
};

cleanData();
