const db = require("../../database/connection");

exports.obtenerUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.nombre, u.correo, u.permisos, u.cargos, u.jefatura_id, u.contrasena, j.nombre as jefatura_nombre 
      FROM usuarios u 
      LEFT JOIN usuarios j ON u.jefatura_id = j.id
      ORDER BY u.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearUsuario = async (req, res) => {
  const { nombre, correo, contrasena, permisos, cargos, jefatura_id } = req.body;
  if (!nombre || !correo || !contrasena || !permisos) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  
  try {
    const [existentes] = await db.query("SELECT id FROM usuarios WHERE correo = ? OR nombre = ?", [correo, nombre]);
    if (existentes.length > 0) {
      return res.status(400).json({ error: "Ya existe un usuario con este correo o nombre" });
    }

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, correo, contrasena, permisos, cargos, jefatura_id) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, correo, contrasena, permisos, cargos || null, jefatura_id || null]
    );
    res.json({ id: result.insertId, msg: "Usuario creado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, contrasena, permisos, cargos, jefatura_id } = req.body;
  
  try {
    const [existentes] = await db.query("SELECT id FROM usuarios WHERE (correo = ? OR nombre = ?) AND id != ?", [correo, nombre, id]);
    if (existentes.length > 0) {
      return res.status(400).json({ error: "Ya existe otro usuario con este correo o nombre" });
    }

    if (contrasena) {
      await db.query(
        "UPDATE usuarios SET nombre = ?, correo = ?, contrasena = ?, permisos = ?, cargos = ?, jefatura_id = ? WHERE id = ?",
        [nombre, correo, contrasena, permisos, cargos || null, jefatura_id || null, id]
      );
    } else {
      await db.query(
        "UPDATE usuarios SET nombre = ?, correo = ?, permisos = ?, cargos = ?, jefatura_id = ? WHERE id = ?",
        [nombre, correo, permisos, cargos || null, jefatura_id || null, id]
      );
    }
    res.json({ msg: "Usuario actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM usuarios WHERE id = ?", [id]);
    res.json({ msg: "Usuario eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
