const db = require("../../database/connection");

exports.login = async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) return res.status(400).json({ error: "Correo y contraseña requeridos" });

  try {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE correo = ? AND contrasena = ?", [correo, contrasena]);
    if (rows.length === 0) return res.status(401).json({ error: "Credenciales incorrectas" });

    const usuario = rows[0];
    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      permisos: usuario.permisos,
      cargos: usuario.cargos,
      jefatura_id: usuario.jefatura_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
