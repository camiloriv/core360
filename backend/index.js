const app = require("./app");
const { startScheduler } = require("./services/scheduler/scheduler.service");
const { poolPromise } = require("./database/mssql");

if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET no está definido en el archivo .env. Por seguridad, el servidor no puede iniciar.");
}

const PORT = process.env.PORT || 8080;

(async () => {
  try {
    console.log("⏳ Conectando a la base de datos...");
    await poolPromise;
  } catch (err) {
    console.error("❌ Fallo crítico de conexión a DB:", err);
    process.exit(1);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en puerto ${PORT} (${process.env.NODE_ENV || "development"})`);
    startScheduler();
  });
})();
