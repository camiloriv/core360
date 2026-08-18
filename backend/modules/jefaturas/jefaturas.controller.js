const db = require("../../database/knex");
const bcrypt = require('bcrypt');

exports.obtenerJefaturas = async (req, res) => {
  try {
    const { gerencia_id, jefatura_id } = req.query;
    
    const query = db('usuarios')
      .select('id', 'nombre', 'correo', 'permisos', 'cargos', 'jefatura_id', 'gerencia_id', 'zona_id', 'vistas_permitidas')
      .whereIn('permisos', ['jefatura', 'gerencia']);

    if (gerencia_id) {
      query.andWhere(function() {
        this.where('id', gerencia_id)
          .orWhereIn('id', function() {
            this.select('usuario_id').from('usuario_gerencias').where('gerencia_id', gerencia_id)
            .union(function() {
              this.select('ug2.usuario_id')
                .from('usuario_gerencias as ug2')
                .whereIn('ug2.gerencia_id', function() {
                  this.select('ug.usuario_id')
                    .from('usuario_gerencias as ug')
                    .join('usuarios as u', 'ug.usuario_id', 'u.id')
                    .where('ug.gerencia_id', gerencia_id)
                    .andWhere('u.permisos', 'gerencia');
                });
            });
          });
      });
    } else if (jefatura_id) {
      query.andWhere('id', jefatura_id);
    }
    
    query.orderBy('nombre', 'asc');
    
    const rows = await query;
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
    const rawContrasena = contrasena || process.env.DEFAULT_PASSWORD || '123456';
    const hashedContrasena = await bcrypt.hash(rawContrasena, 10);
    
    const result = await db('usuarios').insert({
      nombre,
      correo: correo || null,
      permisos: 'jefatura',
      contrasena: hashedContrasena,
      requiere_cambio_clave: 1
    }, ['id']);
    
    const insertId = Array.isArray(result) && result.length > 0 ? result[0].id : null;
    
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
    const updateData = { nombre, correo: correo || null };

    if (contrasena) {
      updateData.contrasena = await bcrypt.hash(contrasena, 10);
      updateData.requiere_cambio_clave = 1;
    }

    await db('usuarios')
      .where({ id, permisos: 'jefatura' })
      .update(updateData);
      
    res.json({ msg: "Actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarJefatura = async (req, res) => {
  const { id } = req.params;
  try {
    await db('usuarios').where({ id, permisos: 'jefatura' }).del();
    res.json({ msg: "Eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
