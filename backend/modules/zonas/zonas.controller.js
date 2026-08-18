const zonasRepository = require("../../database/repositories/zonas.repository");

exports.obtenerZonas = async (req, res) => {
  try {
    const zonas = await zonasRepository.findAll();
    res.json(zonas);
  } catch (err) {
    console.error("Error obteniendo zonas:", err);
    res.status(500).json({ error: "Error en la base de datos al obtener zonas" });
  }
};
