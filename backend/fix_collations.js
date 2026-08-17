const db = require('./database/connection');

async function fixCollations() {
    console.log("Iniciando normalización de collations...");
    try {
        // 1. Cambiar collation de la base de datos completa
        await db.query("ALTER DATABASE core360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        console.log("✅ Base de datos actualizada a utf8mb4_unicode_ci");

        // 2. Obtener todas las tablas
        const [tables] = await db.query("SHOW TABLES");
        const tableNames = tables.map(row => Object.values(row)[0]);
        
        console.log(`Encontradas ${tableNames.length} tablas. Procesando...`);

        // 3. Modificar cada tabla individualmente
        for (const tableName of tableNames) {
            await db.query(`ALTER TABLE ${tableName} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log(`✅ Tabla procesada: ${tableName}`);
        }

        console.log("🎉 Todas las tablas han sido normalizadas correctamente.");
    } catch (err) {
        console.error("❌ Error durante la normalización:", err);
    } finally {
        process.exit();
    }
}

fixCollations();
