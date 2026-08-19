const ejecutivasRepository = require("../../database/repositories/ejecutivas.repository");
const bcrypt = require('bcrypt');

exports.obtenerEjecutivas = async (req, res) => {
  try {
    const ejecutivas = await ejecutivasRepository.getEjecutivas();
    res.json(ejecutivas);
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
    
    const insertId = await ejecutivasRepository.insertEjecutiva(nombre, correo, jefatura_id, cargo_id, hashedContrasena);
    
    res.json({ id: insertId, msg: "Creada" });
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
    let hashedContrasena = null;
    if (contrasena) {
      hashedContrasena = await bcrypt.hash(contrasena, 10);
    }

    await ejecutivasRepository.updateEjecutiva(id, nombre, correo, jefatura_id, cargo_id, hashedContrasena);
      
    res.json({ msg: "Actualizada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarEjecutiva = async (req, res) => {
  const { id } = req.params;
  try {
    await ejecutivasRepository.deleteEjecutiva(id);
    res.json({ msg: "Eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
