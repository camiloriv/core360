const db = require("../backend/database/connection");

async function optimizeDb() {
    try {
        console.log("Creando índices para optimizar búsquedas en DB...");

        const queries = [
            // Índice para acelerar los filtros por jefatura en empresas
            "CREATE INDEX IF NOT EXISTS idx_empresas_jefatura ON empresas(jefatura_id);",
            
            // Índice para acelerar las búsquedas de reuniones por ejecutiva
            "CREATE INDEX IF NOT EXISTS idx_reuniones_ejecutiva ON reuniones(ejecutiva_id);",
            
            // Índice para acelerar búsquedas de reuniones por empresa
            "CREATE INDEX IF NOT EXISTS idx_reuniones_empresa ON reuniones(empresa_id);",

            // Índice para relacionar usuarios y gerencias rápidamente (evitar table scans en el dashboard de gerentes)
            "CREATE INDEX IF NOT EXISTS idx_usuario_gerencias_usuario ON usuario_gerencias(usuario_id);",
            "CREATE INDEX IF NOT EXISTS idx_usuario_gerencias_gerencia ON usuario_gerencias(gerencia_id);"
        ];

        for (const sql of queries) {
            console.log(`Ejecutando: ${sql}`);
            try {
                await db.query(sql);
                console.log("✅ OK");
            } catch (err) {
                if (err.code === 'ER_DUP_KEYNAME') {
                    console.log("✅ Índice ya existe (omitido).");
                } else {
                    console.error("❌ Error en índice:", err.message);
                }
            }
        }

        console.log("Optimización de Base de Datos finalizada.");
        process.exit(0);
    } catch (error) {
        console.error("Error crítico:", error);
        process.exit(1);
    }
}

optimizeDb();
