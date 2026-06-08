const transporter = require("../../config/mailer");
const fs = require("fs");
const path = require("path");


const enviarCorreo = async ({ to, cc, subject, data, attachments = [] }) => {

  try {

    // 🔹 1. Leer template HTML
    const templatePath = path.join(__dirname, "../templates/minuta.html");
    let html = fs.readFileSync(templatePath, "utf8");

    // 🔹 2. Formatear fecha
    const fecha = new Date(data.fecha_reu);

    const fechaFormateada = fecha
      .toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      })
      .replace(",", "");

    // 🔹 3. Formatear hora
    const horaFormateada = (data.hora || "").slice(0, 5);

    // 🔹 4. Contenido de Minuta (Ya viene como HTML desde el nuevo editor)
    const htmlMinuta = data.minuta || "";

    console.log(data)

    // 🔹 5. Reemplazo variables
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
      .replace(/{{minuta}}/g, htmlMinuta);

    // 🔹 6. Imágenes base
    const banner = {
      filename: "banner-header.png",
      path: path.join(__dirname, "../../assets/images/banner-header.png"),
      cid: "banner-header"
    };

    const footer = {
      filename: "banner-footer.png",
      path: path.join(__dirname, "../../assets/images/banner-footer.png"),
      cid: "banner-footer"
    };

    // 🔹 7. Firma dinámica
    const nombreRaw = data.ejecutiva || data.enviado_por || "default";
    const nombreNormalizado = nombreRaw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_");

    // Buscamos primero .jpg, luego .png
    const firmaPathJpg = path.join(__dirname, `../../assets/firmas/${nombreNormalizado}.jpg`);
    const firmaPathPng = path.join(__dirname, `../../assets/firmas/${nombreNormalizado}.png`);
    const defaultPath = path.join(__dirname, "../../assets/firmas/default.png");

    let finalFirmaPath = null;
    if (fs.existsSync(firmaPathJpg)) {
      finalFirmaPath = firmaPathJpg;
    } else if (fs.existsSync(firmaPathPng)) {
      finalFirmaPath = firmaPathPng;
    } else if (fs.existsSync(defaultPath)) {
      finalFirmaPath = defaultPath;
    }

    // 🔍 Debug útil para el log de Node
    console.log("🔹 Procesando firma para:", nombreRaw);
    console.log("🔹 Nombre normalizado:", nombreNormalizado);
    console.log("🔹 Ruta final encontrada:", finalFirmaPath || "NINGUNA");

    // 🔥 8. ADJUNTOS DINÁMICOS (los del formulario)
    const adjuntosArchivos = (attachments || []).map(file => {
      const adj = { filename: file.filename || file.originalname };
      if (file.content || file.buffer) adj.content = file.content || file.buffer;
      if (file.path) adj.path = file.path;
      if (file.contentType || file.mimetype) adj.contentType = file.contentType || file.mimetype;
      return adj;
    });

    console.log("📎 Adjuntos finales:", adjuntosArchivos);

    const baseAttachments = [
      banner,
      footer,
      ...adjuntosArchivos // 🔥 AQUÍ SE AGREGAN LOS ARCHIVOS
    ];



    if (finalFirmaPath) {
      baseAttachments.push({
        filename: "firma.png",
        path: finalFirmaPath,
        cid: "firma"
      });
    }

    // 🔹 9. Enviar correo
    let recipientTo = to;
    let recipientCc = cc;
    let emailSubject = subject;

    if (process.env.REDIRECT_EMAILS_TO) {
      console.log(`✉️ [REDIRECT] Redireccionando correo de [${to}] (CC: ${cc || 'Ninguno'}) a [${process.env.REDIRECT_EMAILS_TO}]`);
      recipientTo = process.env.REDIRECT_EMAILS_TO;
      recipientCc = undefined;
      emailSubject = `[DEV - Destinatario Original: ${to}] ${subject}`;
    }

    const info = await transporter.sendMail({
      from: `"Sistema Reuniones" <${process.env.MAIL_USER}>`,
      to: recipientTo,
      ...(recipientCc && { cc: recipientCc }),
      subject: emailSubject,
      html,
      attachments: baseAttachments
    });

    console.log("✅ Correo enviado:", info.messageId);
    return true;

  } catch (error) {

    console.error("❌ Error enviando correo:", error);
    return false;

  }
};

const enviarCorreoEncuesta = async (to, url, bcc, user_nombre) => {
  try {
    const banner = {
      filename: "banner-header.png",
      path: path.join(__dirname, "../../assets/images/banner-header.png"),
      cid: "banner-header"
    };

    const footer = {
      filename: "banner-footer.png",
      path: path.join(__dirname, "../../assets/images/banner-footer.png"),
      cid: "banner-footer"
    };

    // 🔹 Firma dinámica
    const nombreRaw = user_nombre || "default";
    const nombreNormalizado = nombreRaw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_");

    const firmaPathJpg = path.join(__dirname, `../../assets/firmas/${nombreNormalizado}.jpg`);
    const firmaPathPng = path.join(__dirname, `../../assets/firmas/${nombreNormalizado}.png`);
    const defaultPath = path.join(__dirname, "../../assets/firmas/default.png");

    let finalFirmaPath = null;
    if (fs.existsSync(firmaPathJpg)) {
      finalFirmaPath = firmaPathJpg;
    } else if (fs.existsSync(firmaPathPng)) {
      finalFirmaPath = firmaPathPng;
    } else if (fs.existsSync(defaultPath)) {
      finalFirmaPath = defaultPath;
    }

    const baseAttachments = [banner, footer];
    let firmaHtml = "";
    if (finalFirmaPath) {
      baseAttachments.push({
        filename: "firma.png",
        path: finalFirmaPath,
        cid: "firma"
      });
      firmaHtml = `<div style="margin-top: 20px;"><img src="cid:firma" style="display:block; border:0; max-width: 300px; height:auto;"></div>`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin:0; padding:0; font-family:Segoe UI, Arial, sans-serif; background:#f4f6f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;">
    <tr><td height="20"></td></tr>
    <tr>
      <td align="center">
        <!-- CONTENEDOR -->
        <table width="800" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid #e2e8f0; text-align: left;">
          
          <!-- BANNER HEADER -->
          <tr>
            <td align="center" style="background-color: #ffffff; border-bottom: 2px solid #e2e8f0;">
              <img src="cid:banner-header" width="800" style="display:block; border:0; width:100%; max-width:800px; height:auto;">
            </td>
          </tr>

          <!-- CONTENIDO -->
          <tr>
            <td style="padding: 40px 50px;">
              <p style="color:#334155; font-size:16px; margin-bottom:20px;">Estimadas/os,</p>
              <p style="color:#334155; font-size:16px; margin-bottom:20px;">Esperamos que se encuentren muy bien.</p>
              <p style="color:#334155; font-size:16px; margin-bottom:20px;">
                Con el objetivo de mejorar continuamente la calidad de nuestros servicios, les solicitamos cordialmente responder la siguiente <b>encuesta de fidelización</b>.
              </p>
              <p style="color:#334155; font-size:16px; margin-bottom:40px;">
                Su opinión es muy importante para nosotros y nos permitirá seguir fortaleciendo nuestra relación y mejorar nuestros procesos de atención.
              </p>

              <div style="text-align:center; margin-bottom:30px;">
                <a href="${url}" style="background-color:#3b82f6; color:white; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:16px; display:inline-block;">
                  Ir a la Encuesta
                </a>
              </div>
              
              ${firmaHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color:#64748b; font-size:14px; margin:0 0 5px 0;">Agradecemos de antemano su tiempo y colaboración.</p>
              <p style="color:#64748b; font-size:14px; margin:0;">Su opinión es fundamental para seguir mejorando nuestros servicios.</p>
              <img src="cid:banner-footer" width="800" style="display:block; border:0; width:100%; max-width:800px; height:auto; margin-top: 15px;">
            </td>
          </tr>

        </table>
      </td>
    </tr>
    <tr><td height="40"></td></tr>
  </table>
</body>
</html>
    `;

    let recipientTo = to;
    let recipientBcc = bcc;
    let emailSubject = "[Encuesta OTIC Proforma] - Tu opinión es muy importante para nosotros";

    if (process.env.REDIRECT_EMAILS_TO) {
      console.log(`✉️ [REDIRECT] Redireccionando encuesta de [${to}] (BCC: ${bcc || 'Ninguno'}) a [${process.env.REDIRECT_EMAILS_TO}]`);
      recipientTo = process.env.REDIRECT_EMAILS_TO;
      recipientBcc = undefined;
      emailSubject = `[DEV - Destinatario Original: ${to}] ${emailSubject}`;
    }

    const info = await transporter.sendMail({
      from: `"Sistema Encuestas" <${process.env.MAIL_USER}>`,
      to: recipientTo,
      ...(recipientBcc && { bcc: recipientBcc }),
      subject: emailSubject,
      html,
      attachments: baseAttachments
    });

    console.log("✅ Correo de encuesta enviado:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Error enviando correo de encuesta:", error);
    return false;
  }
};

module.exports = { enviarCorreo, enviarCorreoEncuesta };
