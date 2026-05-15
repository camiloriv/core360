const db = require("../connection");

async function migrate() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log("1. Creando nuevas tablas...");

        // Catálogo de preguntas
        await connection.query(`
            CREATE TABLE IF NOT EXISTS encuesta_catalogo_preguntas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                dimension_id INT,
                subdimension VARCHAR(100),
                texto TEXT NOT NULL,
                tipo VARCHAR(50) NOT NULL,
                escala INT DEFAULT 5,
                es_nps TINYINT(1) DEFAULT 0,
                opciones_json JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dimension_id) REFERENCES encuesta_dimensiones(id) ON DELETE SET NULL
            )
        `);

        // Tabla de asignación a templates
        await connection.query(`
            CREATE TABLE IF NOT EXISTS encuesta_template_preguntas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id INT NOT NULL,
                pregunta_id INT NOT NULL,
                orden INT DEFAULT 1,
                requerida TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES encuesta_templates(id) ON DELETE CASCADE,
                FOREIGN KEY (pregunta_id) REFERENCES encuesta_catalogo_preguntas(id) ON DELETE CASCADE,
                UNIQUE KEY unique_template_pregunta (template_id, pregunta_id)
            )
        `);

        console.log("2. Migrando datos desde encuesta_preguntas...");
        
        // Obtener todas las preguntas actuales
        const [oldPreguntas] = await connection.query("SELECT * FROM encuesta_preguntas");

        for (const p of oldPreguntas) {
            // Insertar en el catálogo
            const [catRes] = await connection.query(`
                INSERT INTO encuesta_catalogo_preguntas (dimension_id, subdimension, texto, tipo, escala, es_nps, opciones_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                p.dimension_id, 
                p.subdimension || null, 
                p.texto, 
                p.tipo, 
                p.escala || (p.tipo === 'escala' ? 5 : null), 
                p.es_nps || 0, 
                p.opciones_json ? (typeof p.opciones_json === 'string' ? p.opciones_json : JSON.stringify(p.opciones_json)) : null
            ]);

            const newPreguntaId = catRes.insertId;

            // Insertar vínculo
            await connection.query(`
                INSERT INTO encuesta_template_preguntas (template_id, pregunta_id, orden, requerida)
                VALUES (?, ?, ?, ?)
            `, [p.template_id, newPreguntaId, p.orden, p.requerida || 1]);
        }

        console.log(`✅ Se migraron ${oldPreguntas.length} preguntas.`);

        // Renombrar tabla vieja por seguridad
        await connection.query("RENAME TABLE encuesta_preguntas TO encuesta_preguntas_old");
        console.log("3. Tabla encuesta_preguntas renombrada a encuesta_preguntas_old.");

        await connection.commit();
        console.log("🚀 Migración completada con éxito.");
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error("❌ Error en la migración:", err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
