const usuariosRepository = require("../../database/repositories/usuarios.repository");
const bcrypt = require('bcrypt');

exports.obtenerUsuarios = async (req, res) => {
  try {
    let rows = await usuariosRepository.getUsuarios();
    // Handle SQL server vs MySQL knex.raw return formats
    if (Array.isArray(rows) && Array.isArray(rows[0])) {
      rows = rows[0];
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearUsuario = async (req, res) => {
  const { nombre, correo, contrasena, permisos, cargos, jefatura_id, gerencia_id, gerencia_ids, zona_id, vistas_permitidas, permite_traspaso } = req.body;
  if (!nombre || !correo || !contrasena || !permisos) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  
  try {
    const counts = await usuariosRepository.countUsuariosByCorreoOrNombre(correo, nombre);
    if (counts > 0) {
      return res.status(400).json({ error: "Ya existe un usuario con este correo o nombre" });
    }

    const fallbackGerenciaId = (permisos === 'jefatura' || permisos === 'gerencia')
      ? (Array.isArray(gerencia_ids)
          ? (gerencia_ids.length > 0 ? gerencia_ids[0] : null)
          : (gerencia_id || null))
      : null;

    const serializedVistas = vistas_permitidas 
      ? (typeof vistas_permitidas === "string" ? vistas_permitidas : JSON.stringify(vistas_permitidas)) 
      : null;

    const hashedContrasena = await bcrypt.hash(contrasena, 10);

    const newUserId = await usuariosRepository.insertUsuario({
      nombre, 
      correo, 
      contrasena: hashedContrasena, 
      permisos, 
      cargos: cargos || null, 
      jefatura_id: jefatura_id || null, 
      gerencia_id: fallbackGerenciaId, 
      zona_id: zona_id || null, 
      vistas_permitidas: serializedVistas, 
      requiere_cambio_clave: 1, 
      permite_traspaso: permite_traspaso ? 1 : 0
    });

    if ((permisos === 'jefatura' || permisos === 'gerencia') && Array.isArray(gerencia_ids)) {
      for (const gid of gerencia_ids) {
        if (gid) {
          await usuariosRepository.insertUsuarioGerencias(newUserId, gid);
        }
      }
    }

    res.json({ id: newUserId, msg: "Usuario creado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, contrasena, permisos, cargos, jefatura_id, gerencia_id, gerencia_ids, zona_id, vistas_permitidas, permite_traspaso } = req.body;
  
  try {
    const counts = await usuariosRepository.countUsuariosByCorreoOrNombre(correo, nombre, id);
    if (counts > 0) {
      return res.status(400).json({ error: "Ya existe otro usuario con este correo o nombre" });
    }

    const fallbackGerenciaId = (permisos === 'jefatura' || permisos === 'gerencia')
      ? (Array.isArray(gerencia_ids)
          ? (gerencia_ids.length > 0 ? gerencia_ids[0] : null)
          : (gerencia_id || null))
      : null;

    const serializedVistas = vistas_permitidas 
      ? (typeof vistas_permitidas === "string" ? vistas_permitidas : JSON.stringify(vistas_permitidas)) 
      : null;

    const updateData = {
      nombre, 
      correo, 
      permisos, 
      cargos: cargos || null, 
      jefatura_id: jefatura_id || null, 
      gerencia_id: fallbackGerenciaId, 
      zona_id: zona_id || null, 
      vistas_permitidas: serializedVistas, 
      permite_traspaso: permite_traspaso ? 1 : 0
    };

    if (contrasena) {
      updateData.contrasena = await bcrypt.hash(contrasena, 10);
      updateData.requiere_cambio_clave = 1;
    }

    await usuariosRepository.updateUsuario(id, updateData);

    if (permisos === 'jefatura' || permisos === 'gerencia') {
      await usuariosRepository.deleteUsuarioGerencias(id);
      if (Array.isArray(gerencia_ids)) {
        for (const gid of gerencia_ids) {
          if (gid) {
            await usuariosRepository.insertUsuarioGerencias(id, gid);
          }
        }
      }
    } else {
      await usuariosRepository.deleteUsuarioGerencias(id);
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
    await usuariosRepository.deleteUsuario(id);
    res.json({ msg: "Usuario eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.cambiarContrasena = async (req, res) => {
  const { usuario_id, contrasena_actual, nueva_contrasena } = req.body;
  if (!usuario_id || !contrasena_actual || !nueva_contrasena) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const usuario = await usuariosRepository.getUsuarioById(usuario_id);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isValidPassword = await bcrypt.compare(contrasena_actual, usuario.contrasena);
    if (!isValidPassword) {
      return res.status(400).json({ error: "La contraseña actual es incorrecta" });
    }

    const hashedNuevaContrasena = await bcrypt.hash(nueva_contrasena, 10);
    await usuariosRepository.updateContrasena(usuario_id, hashedNuevaContrasena);
    
    res.json({ msg: "Contraseña actualizada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD al cambiar la contraseña" });
  }
};

exports.actualizarPreferencias = async (req, res) => {
  const { id } = req.params;
  const { preferencias } = req.body;

  if (!id || !preferencias) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const prefResult = await usuariosRepository.getPreferencias(id);
    if (!prefResult) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    let current = {};
    try {
      current = typeof prefResult.preferencias === 'string'
        ? JSON.parse(prefResult.preferencias)
        : (prefResult.preferencias || {});
    } catch { current = {}; }

    const merged = { ...current, ...preferencias };
    await usuariosRepository.updatePreferencias(id, JSON.stringify(merged));

    res.json({ msg: "Preferencias actualizadas", preferencias: merged });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar preferencias" });
  }
};
