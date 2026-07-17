const db = require("./database/connection");

async function showDatabases() {
  try {
    const [rows] = await db.query("SHOW DATABASES");
    console.log("=== BASES DE DATOS EN MYSQL ===");
    console.log(rows);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

showDatabases();
