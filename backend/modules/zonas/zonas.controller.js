const db = require("../../database/connection");

exports.obtenerZonas = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM zonas ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo zonas:", err);
    res.status(500).json({ error: "Error en la base de datos al obtener zonas" });
  }
};
