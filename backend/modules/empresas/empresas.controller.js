const db = require("../../database/connection");

exports.listarEmpresas = async (req, res) => {
  try {
    const { gerencia_id, jefatura_id } = req.query;
    let whereClause = "";
    const params = [];
    if (gerencia_id) {
      whereClause = ` WHERE j.id IN (
        SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?
        UNION
        SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
          SELECT ug.usuario_id FROM usuario_gerencias ug 
          JOIN usuarios u ON ug.usuario_id = u.id 
          WHERE ug.gerencia_id = ? AND u.permisos = 'gerencia'
        )
      )`;
      params.push(gerencia_id, gerencia_id);
    } else if (jefatura_id) {
      whereClause = " WHERE e.jefatura_id = ?";
      params.push(jefatura_id);
    }
    const [rows] = await db.query(`
      SELECT e.*, j.nombre as jefatura_nombre, z.nombre as zona_nombre
      FROM empresas e 
      LEFT JOIN usuarios j ON e.jefatura_id = j.id
      LEFT JOIN zonas z ON e.zona_id = z.id
      ${whereClause}
      ORDER BY e.nombre ASC
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerEmpresasPorEjecutiva = async (req, res) => {
  try {
    const { id_ejecutiva } = req.params;
    const [rows] = await db.query(
      `SELECT emp.* 
       FROM empresas emp
       JOIN usuarios e ON emp.jefatura_id = e.jefatura_id
       WHERE e.id = ?
       ORDER BY emp.nombre ASC`,
      [id_ejecutiva]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerEmpresasPorJefatura = async (req, res) => {
  try {
    const { id_jefatura } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM empresas WHERE jefatura_id = ? ORDER BY nombre ASC",
      [id_jefatura]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEmpresa = async (req, res) => {
  const { id } = req.params;
  const { nombre, jefatura_id, zona_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    await db.query("UPDATE empresas SET nombre = ?, jefatura_id = ?, zona_id = ? WHERE id = ?", [nombre, jefatura_id || null, zona_id || null, id]);
    res.json({ msg: "Actualizada" });
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEstadoEmpresa = async (req, res) => {
  const { id } = req.params;
  const { estado_seguimiento } = req.body;
  try {
    let query = "UPDATE empresas SET estado_seguimiento = ? WHERE id = ?";
    let params = [estado_seguimiento, id];

    if (estado_seguimiento === 'solicitada') {
      query = "UPDATE empresas SET estado_seguimiento = ?, fecha_solicitada = NOW(), fecha_concretada = NULL WHERE id = ?";
      params = [estado_seguimiento, id];
    } else if (estado_seguimiento === 'concretada') {
      query = "UPDATE empresas SET estado_seguimiento = ?, fecha_solicitada = COALESCE(fecha_solicitada, NOW()), fecha_concretada = NOW() WHERE id = ?";
      params = [estado_seguimiento, id];
    } else if (estado_seguimiento === 'pendiente') {
      query = "UPDATE empresas SET estado_seguimiento = ?, fecha_solicitada = NULL, fecha_concretada = NULL WHERE id = ?";
      params = [estado_seguimiento, id];
    }

    await db.query(query, params);
    const [[updatedEmp]] = await db.query("SELECT fecha_solicitada, fecha_concretada FROM empresas WHERE id = ?", [id]);
    res.json({ 
      msg: "Estado actualizado", 
      fecha_solicitada: updatedEmp ? updatedEmp.fecha_solicitada : null, 
      fecha_concretada: updatedEmp ? updatedEmp.fecha_concretada : null 
    });
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearEmpresa = async (req, res) => {
  const { nombre, jefatura_id, zona_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    const [result] = await db.query(
      "INSERT INTO empresas (nombre, jefatura_id, zona_id, estado_seguimiento) VALUES (?, ?, ?, 'pendiente')",
      [nombre, jefatura_id || null, zona_id || null]
    );
    res.json({ id: result.insertId, msg: "Empresa creada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarEmpresa = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM empresas WHERE id = ?", [id]);
    res.json({ msg: "Empresa eliminada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.traspasoMasivo = async (req, res) => {
  const { source_jefatura_id, target_jefatura_id, empresa_ids } = req.body;
  if (!target_jefatura_id) {
    return res.status(400).json({ error: "Jefatura de destino requerida" });
  }
  try {
    if (empresa_ids && empresa_ids.length > 0) {
      // Traspaso de empresas seleccionadas
      await db.query(
        "UPDATE empresas SET jefatura_id = ? WHERE id IN (?)",
        [target_jefatura_id, empresa_ids]
      );
    } else if (source_jefatura_id) {
      // Traspaso de TODAS las empresas de una jefatura a otra
      await db.query(
        "UPDATE empresas SET jefatura_id = ? WHERE jefatura_id = ?",
        [target_jefatura_id, source_jefatura_id]
      );
    } else {
      return res.status(400).json({ error: "Debe especificar empresa_ids o source_jefatura_id" });
    }
    res.json({ msg: "Traspaso masivo realizado con éxito" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.traspasoExcel = async (req, res) => {
  const { traspasos } = req.body;
  if (!traspasos || !Array.isArray(traspasos)) {
    return res.status(400).json({ error: "Datos de traspaso inválidos" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const t of traspasos) {
      const { empresa_id, target_jefatura_id } = t;
      await connection.query(
        "UPDATE empresas SET jefatura_id = ? WHERE id = ?",
        [target_jefatura_id || null, empresa_id]
      );
    }
    await connection.commit();
    res.json({ msg: "Traspaso por Excel completado con éxito" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: "Error en la BD al procesar el Excel" });
  } finally {
    connection.release();
  }
};


