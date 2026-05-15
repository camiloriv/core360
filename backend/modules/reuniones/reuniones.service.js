const emailService = require("../../services/email/email.service");

exports.crearReunion = async (req) => {
  const { body, files } = req;

  // lógica
  await emailService.enviarCorreo({
    data: body,
    archivos: files
  });

  return { ok: true };
};
