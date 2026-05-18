const db = require("../../database/connection");

exports.obtenerJefaturas = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE permisos = 'jefatura' ORDER BY nombre ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearJefatura = async (req, res) => {
  const { nombre, correo, contrasena } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    const [result] = await db.query("INSERT INTO usuarios (nombre, correo, permisos, contrasena) VALUES (?, ?, 'jefatura', ?)", [nombre, correo, contrasena || '123456']);
    res.json({ id: result.insertId, nombre, correo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarJefatura = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, contrasena } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    if (contrasena) {
      await db.query("UPDATE usuarios SET nombre = ?, correo = ?, contrasena = ? WHERE id = ? AND permisos = 'jefatura'", [nombre, correo, contrasena, id]);
    } else {
      await db.query("UPDATE usuarios SET nombre = ?, correo = ? WHERE id = ? AND permisos = 'jefatura'", [nombre, correo, id]);
    }
    res.json({ msg: "Actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarJefatura = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM usuarios WHERE id = ? AND permisos = 'jefatura'", [id]);
    res.json({ msg: "Eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
