const app = require("./app");
const { startScheduler } = require("./services/scheduler/scheduler.service");

const PORT = 8080;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  startScheduler();
});
