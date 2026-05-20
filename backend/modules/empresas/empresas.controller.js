const db = require("../../database/connection");

exports.listarEmpresas = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, j.nombre as jefatura_nombre 
      FROM empresas e 
      LEFT JOIN usuarios j ON e.jefatura_id = j.id
      ORDER BY e.nombre ASC
    `);
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
  const { jefatura_id } = req.body;
  try {
    await db.query("UPDATE empresas SET jefatura_id = ? WHERE id = ?", [jefatura_id || null, id]);
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
