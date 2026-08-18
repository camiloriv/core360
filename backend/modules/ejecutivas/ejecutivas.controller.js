const db = require("../../database/knex");
const bcrypt = require('bcrypt');

exports.obtenerEjecutivas = async (req, res) => {
  try {
    const rows = await db('usuarios as u')
      .leftJoin('ejecutiva_cargos as c', 'u.cargo_id', 'c.id')
      .leftJoin('usuarios as j', 'u.jefatura_id', 'j.id')
      .select(
        'u.id', 'u.nombre', 'u.correo', 'u.jefatura_id', 'u.cargo_id',
        'u.permisos', 'u.gerencia_id', 'u.zona_id', 'u.vistas_permitidas',
        'c.nombre as cargo_nombre', 'j.nombre as jefatura_nombre'
      )
      .where('u.permisos', 'ejecutiva')
      .orderBy('u.nombre', 'asc');
      
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
    
    const result = await db('usuarios').insert({
      nombre,
      correo: correo || null,
      jefatura_id: jefatura_id || null,
      cargo_id: cargo_id || 2,
      permisos: 'ejecutiva',
      contrasena: hashedContrasena,
      requiere_cambio_clave: 1
    }, ['id']);
    
    // En SQL Server / Knex mssql, returning / ['id'] devuelve un array de objetos
    const insertId = Array.isArray(result) && result.length > 0 ? result[0].id : null;
    
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
    const updateData = {
      nombre,
      correo: correo || null,
      jefatura_id: jefatura_id || null,
      cargo_id: cargo_id || 2
    };

    if (contrasena) {
      updateData.contrasena = await bcrypt.hash(contrasena, 10);
      updateData.requiere_cambio_clave = 1;
    }

    await db('usuarios')
      .where({ id, permisos: 'ejecutiva' })
      .update(updateData);
      
    res.json({ msg: "Actualizada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarEjecutiva = async (req, res) => {
  const { id } = req.params;
  try {
    await db('usuarios').where({ id, permisos: 'ejecutiva' }).del();
    res.json({ msg: "Eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
