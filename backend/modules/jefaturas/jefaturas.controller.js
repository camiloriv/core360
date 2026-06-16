const db = require("../../database/connection");
const bcrypt = require('bcrypt');

exports.obtenerJefaturas = async (req, res) => {
  try {
    const { gerencia_id, jefatura_id } = req.query;
    let query = "SELECT id, nombre, correo, permisos, cargos, jefatura_id, gerencia_id, zona_id, vistas_permitidas FROM usuarios WHERE (permisos = 'jefatura' OR permisos = 'gerencia')";
    const params = [];
    if (gerencia_id) {
      query += ` AND (id = ? OR id IN (
        SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?
        UNION
        SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
          SELECT ug.usuario_id FROM usuario_gerencias ug 
          JOIN usuarios u ON ug.usuario_id = u.id 
          WHERE ug.gerencia_id = ? AND u.permisos = 'gerencia'
        )
      ))`;
      params.push(gerencia_id, gerencia_id, gerencia_id);
    } else if (jefatura_id) {
      query += " AND id = ?";
      params.push(jefatura_id);
    }
    query += " ORDER BY nombre ASC";
    const [rows] = await db.query(query, params);
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
    const rawContrasena = contrasena || '123456';
    const hashedContrasena = await bcrypt.hash(rawContrasena, 10);
    const [result] = await db.query("INSERT INTO usuarios (nombre, correo, permisos, contrasena, requiere_cambio_clave) VALUES (?, ?, 'jefatura', ?, 1)", [nombre, correo, hashedContrasena]);
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
      const hashedContrasena = await bcrypt.hash(contrasena, 10);
      await db.query("UPDATE usuarios SET nombre = ?, correo = ?, contrasena = ?, requiere_cambio_clave = 1 WHERE id = ? AND permisos = 'jefatura'", [nombre, correo, hashedContrasena, id]);
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
