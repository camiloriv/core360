const db = require("../../database/connection");
const bcrypt = require('bcrypt');

exports.obtenerUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.nombre, u.correo, u.permisos, u.cargos, u.jefatura_id, u.gerencia_id, u.zona_id, u.vistas_permitidas,
             j.nombre as jefatura_nombre, 
             COALESCE(
               (SELECT GROUP_CONCAT(g2.nombre SEPARATOR ', ')
                FROM usuario_gerencias ug
                JOIN usuarios g2 ON ug.gerencia_id = g2.id
                WHERE ug.usuario_id = u.id),
               g.nombre
             ) as gerencia_nombre,
             (
               SELECT GROUP_CONCAT(ug.gerencia_id)
               FROM usuario_gerencias ug
               WHERE ug.usuario_id = u.id
             ) as gerencia_ids,
              CASE
                WHEN u.permisos = 'gerencia' THEN (
                  SELECT GROUP_CONCAT(DISTINCT z2.nombre SEPARATOR ', ')
                  FROM usuarios j2
                  JOIN zonas z2 ON j2.zona_id = z2.id
                  WHERE j2.id IN (
                    SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = u.id
                    UNION
                    SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
                      SELECT ug.usuario_id FROM usuario_gerencias ug 
                      JOIN usuarios usr ON ug.usuario_id = usr.id 
                      WHERE ug.gerencia_id = u.id AND usr.permisos = 'gerencia'
                    )
                  )
                )
               WHEN u.permisos = 'ejecutiva' THEN zj.nombre
               ELSE z.nombre
             END as zona_nombre
      FROM usuarios u 
      LEFT JOIN usuarios j ON u.jefatura_id = j.id
      LEFT JOIN usuarios g ON u.gerencia_id = g.id
      LEFT JOIN zonas z ON u.zona_id = z.id
      LEFT JOIN zonas zj ON j.zona_id = zj.id
      ORDER BY u.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearUsuario = async (req, res) => {
  const { nombre, correo, contrasena, permisos, cargos, jefatura_id, gerencia_id, gerencia_ids, zona_id, vistas_permitidas } = req.body;
  if (!nombre || !correo || !contrasena || !permisos) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  
  try {
    const [existentes] = await db.query("SELECT id FROM usuarios WHERE correo = ? OR nombre = ?", [correo, nombre]);
    if (existentes.length > 0) {
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

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, correo, contrasena, permisos, cargos, jefatura_id, gerencia_id, zona_id, vistas_permitidas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [nombre, correo, hashedContrasena, permisos, cargos || null, jefatura_id || null, fallbackGerenciaId, zona_id || null, serializedVistas]
    );

    const newUserId = result.insertId;

    if ((permisos === 'jefatura' || permisos === 'gerencia') && Array.isArray(gerencia_ids)) {
      for (const gid of gerencia_ids) {
        if (gid) {
          await db.query("INSERT IGNORE INTO usuario_gerencias (usuario_id, gerencia_id) VALUES (?, ?)", [newUserId, gid]);
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
  const { nombre, correo, contrasena, permisos, cargos, jefatura_id, gerencia_id, gerencia_ids, zona_id, vistas_permitidas } = req.body;
  
  try {
    const [existentes] = await db.query("SELECT id FROM usuarios WHERE (correo = ? OR nombre = ?) AND id != ?", [correo, nombre, id]);
    if (existentes.length > 0) {
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

    if (contrasena) {
      const hashedContrasena = await bcrypt.hash(contrasena, 10);
      await db.query(
        "UPDATE usuarios SET nombre = ?, correo = ?, contrasena = ?, permisos = ?, cargos = ?, jefatura_id = ?, gerencia_id = ?, zona_id = ?, vistas_permitidas = ? WHERE id = ?",
        [nombre, correo, hashedContrasena, permisos, cargos || null, jefatura_id || null, fallbackGerenciaId, zona_id || null, serializedVistas, id]
      );
    } else {
      await db.query(
        "UPDATE usuarios SET nombre = ?, correo = ?, permisos = ?, cargos = ?, jefatura_id = ?, gerencia_id = ?, zona_id = ?, vistas_permitidas = ? WHERE id = ?",
        [nombre, correo, permisos, cargos || null, jefatura_id || null, fallbackGerenciaId, zona_id || null, serializedVistas, id]
      );
    }

    if (permisos === 'jefatura' || permisos === 'gerencia') {
      await db.query("DELETE FROM usuario_gerencias WHERE usuario_id = ?", [id]);
      if (Array.isArray(gerencia_ids)) {
        for (const gid of gerencia_ids) {
          if (gid) {
            await db.query("INSERT IGNORE INTO usuario_gerencias (usuario_id, gerencia_id) VALUES (?, ?)", [id, gid]);
          }
        }
      }
    } else {
      await db.query("DELETE FROM usuario_gerencias WHERE usuario_id = ?", [id]);
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

exports.cambiarContrasena = async (req, res) => {
  const { usuario_id, contrasena_actual, nueva_contrasena } = req.body;
  if (!usuario_id || !contrasena_actual || !nueva_contrasena) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    // Buscar usuario por ID
    const [rows] = await db.query("SELECT contrasena FROM usuarios WHERE id = ?", [usuario_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const usuario = rows[0];

    // Validar contraseña actual
    const isValidPassword = await bcrypt.compare(contrasena_actual, usuario.contrasena);
    if (!isValidPassword) {
      return res.status(400).json({ error: "La contraseña actual es incorrecta" });
    }

    // Actualizar contraseña
    const hashedNuevaContrasena = await bcrypt.hash(nueva_contrasena, 10);
    await db.query("UPDATE usuarios SET contrasena = ? WHERE id = ?", [hashedNuevaContrasena, usuario_id]);
    
    res.json({ msg: "Contraseña actualizada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD al cambiar la contraseña" });
  }
};

