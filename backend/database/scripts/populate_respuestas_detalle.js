const db = require("../connection");

const populate = async () => {
  try {
    console.log("🚀 Iniciando normalización de respuestas...");

    // 1. Obtener todas las respuestas antiguas
    const [respuestas] = await db.query("SELECT * FROM respuestas");
    console.log(`Encontradas ${respuestas.length} respuestas para procesar.`);

    for (const r of respuestas) {
      let data = r.respuestas_json;
      
      // Si viene como string, parsear
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch(e) { continue; }
      }

      if (!data) continue;

      for (const [pregunta_id, valor] of Object.entries(data)) {
        let valor_texto = null;
        let valor_numerico = null;

        if (typeof valor === "number") {
          valor_numerico = valor;
        } else if (typeof valor === "string") {
          const num = parseFloat(valor);
          if (!isNaN(num)) valor_numerico = num;
          valor_texto = valor;
        }

        // Insertar si no existe ya para este par (encuesta, pregunta)
        await db.query(
          `INSERT IGNORE INTO encuesta_respuestas (encuesta_id, pregunta_id, valor_texto, valor_numerico)
           VALUES (?, ?, ?, ?)`,
          [r.encuesta_id, pregunta_id, valor_texto, valor_numerico]
        );
      }
    }

    console.log("✅ Proceso completado.");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    process.exit(0);
  }
};

populate();
