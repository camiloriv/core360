const db = require("../../database/connection");

exports.obtenerJefaturas = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM jefaturas ORDER BY nombre ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearJefatura = async (req, res) => {
  const { nombre, correo } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    const [result] = await db.query("INSERT INTO jefaturas (nombre, correo) VALUES (?, ?)", [nombre, correo]);
    res.json({ id: result.insertId, nombre, correo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarJefatura = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    await db.query("UPDATE jefaturas SET nombre = ?, correo = ? WHERE id = ?", [nombre, correo, id]);
    res.json({ msg: "Actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarJefatura = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM jefaturas WHERE id = ?", [id]);
    res.json({ msg: "Eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
