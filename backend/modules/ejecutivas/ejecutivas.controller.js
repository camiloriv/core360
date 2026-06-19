const db = require("../../database/connection");
const bcrypt = require('bcrypt');

exports.obtenerEjecutivas = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.nombre, u.correo, u.jefatura_id, u.cargo_id, u.permisos, u.gerencia_id, u.zona_id, u.vistas_permitidas, c.nombre as cargo_nombre, j.nombre as jefatura_nombre
      FROM usuarios u 
      LEFT JOIN ejecutiva_cargos c ON u.cargo_id = c.id 
      LEFT JOIN usuarios j ON u.jefatura_id = j.id
      WHERE u.permisos = 'ejecutiva'
      ORDER BY u.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearEjecutiva = async (req, res) => {
  const { nombre, correo, jefatura_id, cargo_id, contrasena } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    const rawContrasena = contrasena || process.env.DEFAULT_PASSWORD || '123456';
    const hashedContrasena = await bcrypt.hash(rawContrasena, 10);
    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, correo, jefatura_id, cargo_id, permisos, contrasena, requiere_cambio_clave) VALUES (?, ?, ?, ?, 'ejecutiva', ?, 1)",
      [nombre, correo || null, jefatura_id || null, cargo_id || 2, hashedContrasena]
    );
    res.json({ id: result.insertId, msg: "Creada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEjecutiva = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, jefatura_id, cargo_id, contrasena } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    if (contrasena) {
      const hashedContrasena = await bcrypt.hash(contrasena, 10);
      await db.query(
        "UPDATE usuarios SET nombre = ?, correo = ?, jefatura_id = ?, cargo_id = ?, contrasena = ?, requiere_cambio_clave = 1 WHERE id = ? AND permisos = 'ejecutiva'",
        [nombre, correo || null, jefatura_id || null, cargo_id || 2, hashedContrasena, id]
      );
    } else {
      await db.query(
        "UPDATE usuarios SET nombre = ?, correo = ?, jefatura_id = ?, cargo_id = ? WHERE id = ? AND permisos = 'ejecutiva'",
        [nombre, correo || null, jefatura_id || null, cargo_id || 2, id]
      );
    }
    res.json({ msg: "Actualizada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarEjecutiva = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM usuarios WHERE id = ? AND permisos = 'ejecutiva'", [id]);
    res.json({ msg: "Eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
