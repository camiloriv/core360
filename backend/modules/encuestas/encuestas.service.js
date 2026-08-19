const encuestasRepository = require("../../database/repositories/encuestas.repository");
const { v4: uuidv4 } = require("uuid");
const { sql, poolPromise } = require("../../database/mssql");

const obtenerTemplates = async () => {
  return await encuestasRepository.obtenerTemplatesActivos();
};

const crearEncuesta = async ({ ejecutiva_id, empresa_id, tipo_encuesta, reunion_id, enviado_a }) => {
  const token = uuidv4();
  const template = await encuestasRepository.getTemplateIdByName(tipo_encuesta);

  if (!template) {
    throw new Error("Template no encontrado");
  }

  const result = await encuestasRepository.insertEncuesta({
    ejecutiva_id,
    empresa_id,
    template_id: template.id,
    token,
    estado: 'pendiente',
    reunion_id: reunion_id || null,
    enviado_a: enviado_a || null
  });

  return {
    id: result,
    token,
    url: `\${process.env.FRONTEND_URL || 'http://localhost:5173'}/encuesta/\${token}`,
  };
};

const obtenerEncuestaPorToken = async (token) => {
  const cleanToken = token?.trim();
  if (!cleanToken) throw new Error("Token inválido");

  console.log("🔍 Buscando encuesta con token:", cleanToken);
  const encuesta = await encuestasRepository.getEncuestaConContexto(cleanToken);

  if (!encuesta) {
    console.log("❌ No se encontró encuesta");
    return null;
  }

  console.log("✅ Encuesta encontrada:", encuesta.id);
  const preguntasRaw = await encuestasRepository.getPreguntasPorTemplate(encuesta.template_id);

  const preguntas = preguntasRaw.map((p) => {
    let opciones = [];
    if (p.opciones_json) {
      if (Array.isArray(p.opciones_json)) {
        opciones = p.opciones_json;
      } else if (typeof p.opciones_json === 'string') {
        const trimmed = p.opciones_json.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            opciones = JSON.parse(trimmed);
          } catch (e) {
            opciones = trimmed.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else {
          opciones = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }
    return { ...p, opciones: Array.isArray(opciones) ? opciones : [] };
  });

  return { ...encuesta, preguntas };
};

const guardarRespuesta = async ({ encuesta_id, respuestas_json }) => {
  if (!encuesta_id) throw new Error("encuesta_id requerido");

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();

    await encuestasRepository.marcarEncuestaCompletada(encuesta_id, transaction);

    for (const [pregunta_id, valor] of Object.entries(respuestas_json)) {
      let valor_texto = null;
      let valor_numerico = null;

      if (typeof valor === "number") {
        valor_numerico = valor;
      } else if (Array.isArray(valor)) {
        valor_texto = valor.join(", ");
      } else if (typeof valor === "string") {
        const num = parseFloat(valor);
        if (!isNaN(num) && /^\\d+$/.test(valor)) {
          valor_numerico = num;
        }
        valor_texto = valor;
      }

      await encuestasRepository.insertRespuesta({
        encuesta_id,
        pregunta_id,
        valor_texto,
        valor_numerico
      }, transaction);
    }

    await transaction.commit();
    console.log("✅ Respuesta guardada y normalizada:", encuesta_id);
  } catch (err) {
    await transaction.rollback();
    console.error("❌ Error guardando respuesta:", err);
    throw err;
  }
};

const obtenerTodasLasRespuestas = async (usuario_id, rol) => {
  return await encuestasRepository.getTodasLasRespuestas(usuario_id, rol);
};

const toggleEstadoEncuesta = async (id, activo) => {
  await encuestasRepository.updateEstadoEncuesta(id, activo);
  return { success: true };
};

const registrarEnvio = async (id, email) => {
  await encuestasRepository.updateEnviadoA(id, email);
};

const obtenerTotalEnvios = async () => {
  return await encuestasRepository.countTotalEnvios();
};

const obtenerCatalogoPreguntas = async () => {
  return await encuestasRepository.getCatalogoPreguntas();
};

const obtenerCorreosBcc = async (id) => {
  const result = await encuestasRepository.getCorreosBcc(id);
  if (!result) return null;
  return [result.ejecutiva_correo, result.jefatura_correo].filter(Boolean).join(',');
};

module.exports = {
  crearEncuesta,
  obtenerTemplates,
  obtenerEncuestaPorToken,
  guardarRespuesta,
  obtenerTodasLasRespuestas,
  obtenerTotalEnvios,
  obtenerCatalogoPreguntas,
  toggleEstadoEncuesta,
  registrarEnvio,
  obtenerCorreosBcc
};
