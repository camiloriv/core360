const jefaturasRepository = require("../../database/repositories/jefaturas.repository");
const bcrypt = require('bcrypt');

exports.obtenerJefaturas = async (req, res) => {
  try {
    const { gerencia_id, jefatura_id } = req.query;
    const jefaturas = await jefaturasRepository.getJefaturas(gerencia_id, jefatura_id);
    res.json(jefaturas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearJefatura = async (req, res) => {
  const { nombre, correo, contrasena } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    const rawContrasena = contrasena || process.env.DEFAULT_PASSWORD || '123456';
    const hashedContrasena = await bcrypt.hash(rawContrasena, 10);
    
    const insertId = await jefaturasRepository.insertJefatura(nombre, correo, hashedContrasena);
    res.json({ id: insertId, nombre, correo });
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
    let hashedContrasena = null;
    if (contrasena) {
      hashedContrasena = await bcrypt.hash(contrasena, 10);
    }
    
    await jefaturasRepository.updateJefatura(id, nombre, correo, hashedContrasena);
    res.json({ msg: "Actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarJefatura = async (req, res) => {
  const { id } = req.params;
  try {
    await jefaturasRepository.deleteJefatura(id);
    res.json({ msg: "Eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
