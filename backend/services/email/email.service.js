const transporter = require("../../config/mailer");
const fs = require("fs");
const path = require("path");

// ============================================================
// HELPERS PRIVADOS
// ============================================================

/**
 * Resuelve la ruta de la imagen de firma de un usuario.
 * Busca .jpg primero, luego .png, luego default.png.
 */
const resolverFirma = (nombreRaw) => {
  const nombreNormalizado = (nombreRaw || "default")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

  const firmasDir = path.join(__dirname, "../../assets/firmas");
  const firmaJpg = path.join(firmasDir, `${nombreNormalizado}.jpg`);
  const firmaPng = path.join(firmasDir, `${nombreNormalizado}.png`);
  const defaultPng = path.join(firmasDir, "default.png");

  if (fs.existsSync(firmaJpg)) return firmaJpg;
  if (fs.existsSync(firmaPng)) return firmaPng;
  if (fs.existsSync(defaultPng)) return defaultPng;
  return null;
};

/**
 * Aplica la redireccion de destinatarios si REDIRECT_EMAILS_TO esta configurado.
 */
const aplicarRedirect = (to, ccOrBcc, subject, type = "cc") => {
  if (!process.env.REDIRECT_EMAILS_TO) {
    return { to, [type]: ccOrBcc, subject };
  }
  console.log(`[REDIRECT] Redireccionando correo de [${to}] (${type.toUpperCase()}: ${ccOrBcc || "Ninguno"}) a [${process.env.REDIRECT_EMAILS_TO}]`);
  return {
    to: process.env.REDIRECT_EMAILS_TO,
    subject: `[DEV - Destinatario Original: ${to}] ${subject}`,
  };
};

// ============================================================
// ENVIAR CORREO DE MINUTA
// ============================================================
const enviarCorreo = async ({ to, cc, subject, data, attachments = [], userEmail }) => {
  try {
    const templatePath = path.join(__dirname, "../templates/minuta.html");
    let html = fs.readFileSync(templatePath, "utf8");

    const fechaFormateada = new Date(data.fecha_reu)
      .toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      .replace(",", "");
    const horaFormateada = (data.hora || "").slice(0, 5);

    const videoHtml = data.link_video
      ? `<p style="font-weight:bold; color:#8b5cf6; text-transform:uppercase; font-size:12px; margin: 0 0 8px 0; letter-spacing: 1px;">Grabacion de la Reunion (Teams):</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0; border-radius: 4px; margin-bottom: 25px; background-color: #f5f3ff;">
          <tr><td style="padding: 15px 20px; font-size: 14px;">
            <a href="${data.link_video}" target="_blank" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);">
              Ver Grabacion de la Reunion
            </a>
          </td></tr>
        </table>`
      : "";

    html = html
      .replace(/{{id}}/g, data.id_reunion || "")
      .replace(/{{participantes}}/g, data.participantes || "")
      .replace(/{{empresa}}/g, data.empresa || "")
      .replace(/{{ejecutiva}}/g, data.ejecutiva || "")
      .replace(/{{fecha}}/g, fechaFormateada || "")
      .replace(/{{hora}}/g, horaFormateada || "")
      .replace(/{{lugar}}/g, data.lugar || "")
      .replace(/{{motivo}}/g, data.motivo_reu || "")
      .replace(/{{documentos_adjuntos}}/g, data.documentos_adjuntos || "")
      .replace(/{{texto_previo}}/g, data.texto_previo || "")
      .replace(/{{link_video_section}}/g, videoHtml)
      .replace(/{{minuta}}/g, data.minuta || "");

    const baseAttachments = [
      { filename: "banner-header.png", path: path.join(__dirname, "../../assets/images/banner-header.png"), cid: "banner-header" },
      { filename: "banner-footer.png", path: path.join(__dirname, "../../assets/images/banner-footer.png"), cid: "banner-footer" },
      ...(attachments || []).map(file => {
        const adj = { filename: file.filename || file.originalname };
        if (file.content || file.buffer) adj.content = file.content || file.buffer;
        if (file.path) adj.path = file.path;
        if (file.contentType || file.mimetype) adj.contentType = file.contentType || file.mimetype;
        return adj;
      }),
    ];

    const firmaPath = resolverFirma(data.ejecutiva || data.enviado_por);
    if (firmaPath) {
      baseAttachments.push({ filename: "firma.png", path: firmaPath, cid: "firma" });
    }

    const senderEmail = (userEmail && userEmail.endsWith("@proforma.cl")) ? userEmail : process.env.SMTP_USER;
    const { to: recipientTo, cc: recipientCc, subject: emailSubject } = aplicarRedirect(to, cc, subject, "cc");

    const info = await transporter.sendMail({
      from: `"Sistema Reuniones" <${senderEmail}>`,
      to: recipientTo,
      ...(recipientCc && { cc: recipientCc }),
      subject: emailSubject,
      html,
      attachments: baseAttachments,
    });

    console.log("Correo enviado:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error enviando correo:", error);
    return false;
  }
};

// ============================================================
// ENVIAR CORREO DE ENCUESTA
// ============================================================
const enviarCorreoEncuesta = async (to, url, bcc, user_nombre, userEmail) => {
  try {
    const firmaPath = resolverFirma(user_nombre);
    const baseAttachments = [
      { filename: "banner-header.png", path: path.join(__dirname, "../../assets/images/banner-header.png"), cid: "banner-header" },
      { filename: "banner-footer.png", path: path.join(__dirname, "../../assets/images/banner-footer.png"), cid: "banner-footer" },
    ];

    let firmaHtml = "";
    if (firmaPath) {
      baseAttachments.push({ filename: "firma.png", path: firmaPath, cid: "firma" });
      firmaHtml = `<div style="margin-top: 20px;"><img src="cid:firma" style="display:block; border:0; max-width: 480px; height:auto;"></div>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; font-family:Segoe UI, Arial, sans-serif; background:#f4f6f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;">
    <tr><td height="20"></td></tr>
    <tr><td align="center">
      <table width="800" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid #e2e8f0; text-align: left;">
        <tr><td align="center" style="background-color: #ffffff; border-bottom: 2px solid #e2e8f0;">
          <img src="cid:banner-header" width="800" style="display:block; border:0; width:100%; max-width:800px; height:auto;">
        </td></tr>
        <tr><td style="padding: 40px 50px;">
          <p style="color:#334155; font-size:16px; margin-bottom:20px;">Estimadas/os,</p>
          <p style="color:#334155; font-size:16px; margin-bottom:20px;">Esperamos que se encuentren muy bien.</p>
          <p style="color:#334155; font-size:16px; margin-bottom:20px;">Con el objetivo de mejorar continuamente la calidad de nuestros servicios, les solicitamos cordialmente responder la siguiente <b>encuesta</b>.</p>
          <p style="color:#334155; font-size:16px; margin-bottom:40px;">Su opinion es muy importante para nosotros y nos permitira seguir fortaleciendo nuestra relacion y mejorar nuestros procesos de atencion.</p>
          <div style="text-align:center; margin-bottom:30px;">
            <a href="${url}" style="background-color:#3b82f6; color:white; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:16px; display:inline-block;">Ir a la Encuesta</a>
          </div>
          ${firmaHtml}
        </td></tr>
        <tr><td style="padding: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color:#64748b; font-size:14px; margin:0 0 5px 0;">Agradecemos de antemano su tiempo y colaboracion.</p>
          <p style="color:#64748b; font-size:14px; margin:0;">Su opinion es fundamental para seguir mejorando nuestros servicios.</p>
          <img src="cid:banner-footer" width="800" style="display:block; border:0; width:100%; max-width:800px; height:auto; margin-top: 15px;">
        </td></tr>
      </table>
    </td></tr>
    <tr><td height="40"></td></tr>
  </table>
</body>
</html>`;

    const subjectBase = "[Encuesta OTIC Proforma] - Tu opinion es muy importante para nosotros";
    const senderEmail = (userEmail && userEmail.endsWith("@proforma.cl")) ? userEmail : process.env.SMTP_USER;
    const { to: recipientTo, bcc: recipientBcc, subject: emailSubject } = aplicarRedirect(to, bcc, subjectBase, "bcc");

    const info = await transporter.sendMail({
      from: `"Sistema Encuestas" <${senderEmail}>`,
      to: recipientTo,
      ...(recipientBcc && { bcc: recipientBcc }),
      subject: emailSubject,
      html,
      attachments: baseAttachments,
    });

    console.log("Correo de encuesta enviado:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error enviando correo de encuesta:", error);
    return false;
  }
};

module.exports = { enviarCorreo, enviarCorreoEncuesta };
