const db = require("../../database/connection");

exports.obtenerEjecutivas = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, c.nombre as cargo_nombre, j.nombre as jefatura_nombre
      FROM ejecutivas e 
      LEFT JOIN ejecutiva_cargos c ON e.cargo_id = c.id 
      LEFT JOIN jefaturas j ON e.jefatura_id = j.id
      ORDER BY e.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearEjecutiva = async (req, res) => {
  const { nombre, correo, jefatura_id, cargo_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    const [result] = await db.query(
      "INSERT INTO ejecutivas (nombre, correo, jefatura_id, cargo_id) VALUES (?, ?, ?, ?)",
      [nombre, correo || null, jefatura_id || null, cargo_id || 2]
    );
    res.json({ id: result.insertId, msg: "Creada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEjecutiva = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, jefatura_id, cargo_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    await db.query(
      "UPDATE ejecutivas SET nombre = ?, correo = ?, jefatura_id = ?, cargo_id = ? WHERE id = ?",
      [nombre, correo || null, jefatura_id || null, cargo_id || 2, id]
    );
    res.json({ msg: "Actualizada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarEjecutiva = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM ejecutivas WHERE id = ?", [id]);
    res.json({ msg: "Eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
