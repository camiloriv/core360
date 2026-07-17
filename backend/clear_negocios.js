const db = require("./database/connection");

async function clearData() {
  try {
    console.log("Desactivando chequeo de claves foráneas...");
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    
    console.log("Limpiando tabla nuevos_negocios...");
    await db.query("TRUNCATE TABLE nuevos_negocios");
    
    console.log("Limpiando tabla nuevos_negocios_historial...");
    await db.query("TRUNCATE TABLE nuevos_negocios_historial");
    
    console.log("Activando chequeo de claves foráneas...");
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    
    console.log("¡Tablas limpiadas y AUTO_INCREMENT reiniciado con éxito!");
  } catch (error) {
    console.error("Error al limpiar las tablas:", error);
  } finally {
    process.exit(0);
  }
}

clearData();
