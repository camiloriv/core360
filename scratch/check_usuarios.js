const db = require("../backend/database/connection");

(async () => {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM usuarios");
    console.log("COLUMNS IN usuarios:", columns.map(c => `${c.Field} (${c.Type})`));

    const [users] = await db.query("SELECT id, nombre, correo, permisos, jefatura_id FROM usuarios LIMIT 10");
    console.log("SAMPLE USERS:", users);
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
