const db = require("../connection");
const fs = require("fs");
const path = require("path");

const runInit = async () => {
  try {
    console.log("🚀 Iniciando creación de tablas...");
    
    const sqlPath = path.join(__dirname, "init_schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Dividir el script por punto y coma (;) para ejecutar comandos individualmente
    // Filtramos líneas vacías y comentarios
    const queries = sql
      .split(";")
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith("--"));

    for (const query of queries) {
      console.log(`Executing: ${query.substring(0, 50)}...`);
      await db.query(query);
    }

    console.log("✅ Tablas creadas/actualizadas correctamente.");
  } catch (err) {
    console.error("❌ Error inicializando base de datos:", err);
  } finally {
    process.exit(0);
  }
};

runInit();
