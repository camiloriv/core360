const db = require("../../database/connection");

exports.listarEmpresas = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, j.nombre as jefatura_nombre 
      FROM empresas e 
      LEFT JOIN jefaturas j ON e.jefatura_id = j.id
      ORDER BY e.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerEmpresasPorEjecutiva = async (req, res) => {
  try {
    const { id_ejecutiva } = req.params;
    const [rows] = await db.query(
      `SELECT emp.* 
       FROM empresas emp
       JOIN ejecutivas e ON emp.jefatura_id = e.jefatura_id
       WHERE e.id = ?
       ORDER BY emp.nombre ASC`,
      [id_ejecutiva]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerEmpresasPorJefatura = async (req, res) => {
  try {
    const { id_jefatura } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM empresas WHERE jefatura_id = ? ORDER BY nombre ASC",
      [id_jefatura]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEmpresa = async (req, res) => {
  const { id } = req.params;
  const { jefatura_id } = req.body;
  try {
    await db.query("UPDATE empresas SET jefatura_id = ? WHERE id = ?", [jefatura_id || null, id]);
    res.json({ msg: "Actualizada" });
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};
