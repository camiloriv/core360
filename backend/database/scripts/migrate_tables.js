const db = require("../connection");

const migrate = async () => {
  try {
    console.log("🚀 Iniciando migración y renombramiento...");

    // 1. Renombrar encuestas_envio a encuestas (si existe)
    try {
      await db.query("ALTER TABLE encuestas_envio RENAME TO encuestas");
      console.log("✅ Tabla encuestas_envio renombrada a encuestas.");
    } catch (e) {
      console.log("ℹ️ La tabla encuestas_envio no existe o ya fue renombrada.");
    }

    // 2. Agregar columnas necesarias a encuestas
    const columnsToAdd = [
      "ALTER TABLE encuestas ADD COLUMN estado ENUM('pendiente', 'completada') DEFAULT 'pendiente'",
      "ALTER TABLE encuestas ADD COLUMN fecha_respuesta TIMESTAMP NULL",
      "ALTER TABLE encuestas ADD COLUMN template_id INT NULL"
    ];

    for (const sql of columnsToAdd) {
      try {
        await db.query(sql);
        console.log(`✅ Columna procesada.`);
      } catch (e) {
        if (e.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`ℹ️ La columna ya existía.`);
        } else {
          console.error(`❌ Error en columna: ${e.message}`);
        }
      }
    }

    // 3. Crear tabla de respuestas atómicas si no existe
    const createRespuestasDetalle = `
      CREATE TABLE IF NOT EXISTS encuesta_respuestas (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          encuesta_id INT NOT NULL,
          pregunta_id INT NOT NULL,
          valor_texto TEXT,
          valor_numerico DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (encuesta_id),
          INDEX (pregunta_id)
      )
    `;
    await db.query(createRespuestasDetalle);
    console.log("✅ Tabla encuesta_respuestas asegurada.");

    // 4. Actualizar estado de encuestas existentes que ya tienen respuestas
    const updateEstado = `
      UPDATE encuestas e
      SET e.estado = 'completada'
      WHERE EXISTS (SELECT 1 FROM respuestas r WHERE r.encuesta_id = e.id)
    `;
    await db.query(updateEstado);
    console.log("✅ Estados de encuestas actualizados según respuestas existentes.");

    console.log("✨ Migración completada con éxito.");
  } catch (err) {
    console.error("❌ Error durante la migración:", err);
  } finally {
    process.exit(0);
  }
};

migrate();
