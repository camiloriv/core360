const db = require("../backend/database/connection");

(async () => {
  try {
    const [rows] = await db.query(`
      SELECT j.id AS jefatura_id, j.nombre AS jefatura_nombre, COUNT(e.id) AS ejecutivas_count
      FROM usuarios j
      LEFT JOIN usuarios e ON e.jefatura_id = j.id AND e.permisos = 'ejecutiva'
      WHERE j.permisos = 'jefatura'
      GROUP BY j.id
    `);
    console.log("EXECUTIVAS PER JEFATURA:", rows);

    const [allExecutivas] = await db.query(`
      SELECT id, nombre, correo, jefatura_id
      FROM usuarios
      WHERE permisos = 'ejecutiva'
    `);
    console.log("ALL EXECUTIVAS:", allExecutivas);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
