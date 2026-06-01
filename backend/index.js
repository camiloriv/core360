const app = require("./app");
const { startScheduler } = require("./services/scheduler/scheduler.service");

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT} (${process.env.NODE_ENV || "development"})`);
  startScheduler();
});
