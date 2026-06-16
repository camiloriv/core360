const db = require("../../database/connection");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) return res.status(400).json({ error: "Correo y contraseña requeridos" });

  try {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    if (rows.length === 0) return res.status(401).json({ error: "Credenciales incorrectas" });

    const usuario = rows[0];

    const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!validPassword) return res.status(401).json({ error: "Credenciales incorrectas" });
    
    // Generamos el token JWT
    const payload = {
      id: usuario.id,
      correo: usuario.correo,
      permisos: usuario.permisos
    };
    
    const token = jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'secretKey_temporal_123', 
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        permisos: usuario.permisos,
        cargos: usuario.cargos,
        jefatura_id: usuario.jefatura_id,
        vistas_permitidas: usuario.vistas_permitidas
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};
