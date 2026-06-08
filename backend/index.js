const app = require("./app");
const { startScheduler } = require("./services/scheduler/scheduler.service");
const { runMigrations } = require("./database/migrate");

const PORT = process.env.PORT || 8080;

(async () => {
  try {
    console.log("🚀 Ejecutando migraciones de base de datos en inicio...");
    await runMigrations();
  } catch (err) {
    console.error("❌ Fallaron las migraciones de inicio:", err);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en puerto ${PORT} (${process.env.NODE_ENV || "development"})`);
    startScheduler();
  });
})();
