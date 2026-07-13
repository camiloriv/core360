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
        vistas_permitidas: usuario.vistas_permitidas,
        requiere_cambio_clave: usuario.requiere_cambio_clave === 1,
        preferencias: (() => {
          try {
            return typeof usuario.preferencias === 'string'
              ? JSON.parse(usuario.preferencias)
              : (usuario.preferencias || {});
          } catch { return {}; }
        })()
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ error: "Correo requerido" });

  try {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    if (rows.length === 0) {
      // Para evitar enumeración de usuarios, siempre decimos que se envió
      return res.json({ message: "Si el correo está registrado, se han enviado las instrucciones." });
    }

    const usuario = rows[0];

    // Generar clave temporal
    const tempPassword = Math.random().toString(36).slice(-8); // 8 caracteres aleatorios
    const hashedTemp = await bcrypt.hash(tempPassword, 10);

    // Actualizar usuario
    await db.query("UPDATE usuarios SET contrasena = ?, requiere_cambio_clave = 1 WHERE id = ?", [hashedTemp, usuario.id]);

    // Enviar correo
    const mailer = require("../../config/mailer");
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

    const mailOptions = {
      to: usuario.correo,
      subject: "Recuperación de Contraseña - CORE 360",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="text-align: center; padding: 20px;">
            <h2 style="color: #124842;">CORE 360</h2>
          </div>
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px;">
            <h3>Hola ${usuario.nombre},</h3>
            <p>Se ha solicitado el restablecimiento de contraseña para tu cuenta.</p>
            <p>Tu nueva clave temporal es:</p>
            <div style="background: #e2e8f0; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 2px; font-weight: bold; border-radius: 6px; margin: 20px 0;">
              ${tempPassword}
            </div>
            <p>Por motivos de seguridad, el sistema te pedirá cambiar esta clave temporal al iniciar sesión.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${FRONTEND_URL}/" style="background-color: #124842; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">Ir a CORE 360</a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
            Si no solicitaste este cambio, por favor contacta al administrador.
          </div>
        </div>
      `
    };

    await mailer.sendMail(mailOptions);

    res.json({ message: "Si el correo está registrado, se han enviado las instrucciones." });
  } catch (err) {
    console.error("Error en forgotPassword:", err);
    res.status(500).json({ error: "Error interno del servidor al procesar la solicitud." });
  }
};
