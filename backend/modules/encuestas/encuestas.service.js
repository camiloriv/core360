const db = require("../../database/connection");
const { v4: uuidv4 } = require("uuid");

// ======================================================
// 🔹 OBTENER TEMPLATES
// ======================================================
const obtenerTemplates = async () => {
  const [rows] = await db.query(
    "SELECT id, nombre, version FROM encuesta_templates WHERE activo = 1"
  );
  return rows;
};

// ======================================================
// 🔹 CREAR ENCUESTA
// ======================================================
const crearEncuesta = async ({ ejecutiva_id, empresa_id, tipo_encuesta, reunion_id, enviado_a }) => {
  const token = uuidv4();

  // 🔹 Buscar template activo
  const [[template]] = await db.query(
    `SELECT id FROM encuesta_templates 
     WHERE nombre = ? AND activo = 1`,
    [tipo_encuesta]
  );

  if (!template) {
    throw new Error("Template no encontrado");
  }

  const sql = `
    INSERT INTO encuestas 
    (ejecutiva_id, empresa_id, template_id, token, estado, reunion_id, enviado_a)
    VALUES (?, ?, ?, ?, 'pendiente', ?, ?)
  `;

  const [result] = await db.query(sql, [
    ejecutiva_id,
    empresa_id,
    template.id,
    token,
    reunion_id || null,
    enviado_a || null,
  ]);

  return {
    id: result.insertId,
    token,
    url: `http://localhost:5173/encuesta/${token}`,
  };
};

// ======================================================
// 🔹 OBTENER ENCUESTA POR TOKEN (DINÁMICA)
// ======================================================
const obtenerEncuestaPorToken = async (token) => {
  const cleanToken = token?.trim();

  if (!cleanToken) {
    throw new Error("Token inválido");
  }

  console.log("🔍 Buscando encuesta con token:", cleanToken);

  // 🔹 1. Obtener encuesta + contexto
  const [rows] = await db.query(
    `
    SELECT 
      e.id,
      e.template_id,
      emp.nombre AS empresa,
      ej.nombre AS ejecutiva,
      t.nombre AS template,
      IF(e.estado = 'completada', 1, 0) AS completada
    FROM encuestas e
    LEFT JOIN empresas emp ON emp.id = e.empresa_id
    LEFT JOIN usuarios ej ON ej.id = e.ejecutiva_id
    LEFT JOIN encuesta_templates t ON t.id = e.template_id
    WHERE e.token = ? AND e.activo = 1
    `,
    [cleanToken]
  );

  if (rows.length === 0) {
    console.log("❌ No se encontró encuesta");
    return null;
  }

  const encuesta = rows[0];

  console.log("✅ Encuesta encontrada:", encuesta.id);

  // 🔹 2. Obtener preguntas desde la biblioteca (vía tabla de asignación)
  const [preguntasRaw] = await db.query(
    `
    SELECT 
      p.id,
      p.texto,
      p.tipo,
      p.opciones_json,
      tp.requerida,
      p.escala
    FROM encuesta_template_preguntas tp
    JOIN encuesta_catalogo_preguntas p ON tp.pregunta_id = p.id
    WHERE tp.template_id = ?
    ORDER BY tp.orden
    `,
    [encuesta.template_id]
  );

  const preguntas = preguntasRaw.map((p) => {
    let opciones = [];

    if (p.opciones_json) {
      // 1. Si ya es un array (mysql2 a veces lo parsea solo)
      if (Array.isArray(p.opciones_json)) {
        opciones = p.opciones_json;
      } 
      // 2. Si es un string (puede ser JSON o Comas)
      else if (typeof p.opciones_json === 'string') {
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

    return {
      ...p,
      opciones: Array.isArray(opciones) ? opciones : []
    };
  });

  return {
    ...encuesta,
    preguntas,
  };
};

// ======================================================
// 🔹 GUARDAR RESPUESTA
// ======================================================
const guardarRespuesta = async ({ encuesta_id, respuestas_json }) => {
  if (!encuesta_id) {
    throw new Error("encuesta_id requerido");
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Marcar encuesta como completada
    await connection.query(
      "UPDATE encuestas SET estado = 'completada', fecha_respuesta = NOW() WHERE id = ?",
      [encuesta_id]
    );

    // 2. Insertar cada respuesta de forma atómica
    for (const [pregunta_id, valor] of Object.entries(respuestas_json)) {
      let valor_texto = null;
      let valor_numerico = null;

      if (typeof valor === "number") {
        valor_numerico = valor;
      } else if (Array.isArray(valor)) {
        valor_texto = valor.join(", ");
      } else if (typeof valor === "string") {
        // Intentar convertir a número si es posible (ej. NPS "10")
        const num = parseFloat(valor);
        if (!isNaN(num) && /^\d+$/.test(valor)) { // Solo si es un entero puro
          valor_numerico = num;
        }
        valor_texto = valor;
      }

      await connection.query(
        `INSERT INTO encuesta_respuestas (encuesta_id, pregunta_id, valor_texto, valor_numerico)
         VALUES (?, ?, ?, ?)`,
        [encuesta_id, pregunta_id, valor_texto, valor_numerico]
      );
    }

    await connection.commit();
    console.log("✅ Respuesta guardada y normalizada:", encuesta_id);
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error guardando respuesta:", err);
    throw err;
  } finally {
    connection.release();
  }
};

const obtenerTodasLasRespuestas = async (usuario_id, rol) => {
  let whereClause = "WHERE 1=1";
  let params = [];

  if (rol === 'ejecutiva') {
      whereClause += " AND e.ejecutiva_id = ?";
      params.push(usuario_id);
  } else if (rol === 'jefatura') {
      whereClause += " AND emp.jefatura_id = ?";
      params.push(usuario_id);
  } else if (rol === 'gerencia') {
      whereClause += " AND j.id IN (SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = ?)";
      params.push(usuario_id);
  }

  const sql = `
    SELECT 
      e.id,
      e.token,
      e.estado,
      e.activo,
      e.enviado_a,
      e.reunion_id,
      e.fecha_creacion,
      e.fecha_respuesta,
      t.nombre AS titulo,
      emp.nombre AS empresa,
      ej.nombre AS ejecutiva,
      j.nombre AS jefatura
    FROM encuestas e
    JOIN encuesta_templates t ON e.template_id = t.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios ej ON e.ejecutiva_id = ej.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    ${whereClause}
    ORDER BY e.fecha_creacion DESC
  `;
  const [result] = await db.query(sql, params);
  return result;
};

const toggleEstadoEncuesta = async (id, activo) => {
  const sql = "UPDATE encuestas SET activo = ? WHERE id = ?";
  await db.query(sql, [activo ? 1 : 0, id]);
  return { success: true };
};

const registrarEnvio = async (id, email) => {
  const sql = "UPDATE encuestas SET enviado_a = ? WHERE id = ?";
  await db.query(sql, [email, id]);
};

const obtenerTotalEnvios = async () => {
  const [rows] = await db.query("SELECT COUNT(*) as total FROM encuestas");
  return rows[0].total;
};

const obtenerCatalogoPreguntas = async () => {
  const sql = `
    SELECT q.id, q.texto, q.tipo, d.nombre as dimension 
    FROM encuesta_catalogo_preguntas q 
    LEFT JOIN encuesta_dimensiones d ON q.dimension_id = d.id
    WHERE COALESCE(q.activo, 1) != 2
  `;
  const [result] = await db.query(sql);
  return result;
};

const obtenerCorreosBcc = async (id) => {
  const sql = `
    SELECT e.correo as ejecutiva_correo, j.correo as jefatura_correo
    FROM encuestas enc
    JOIN usuarios e ON enc.ejecutiva_id = e.id
    LEFT JOIN usuarios j ON e.jefatura_id = j.id
    WHERE enc.id = ?
  `;
  const [rows] = await db.query(sql, [id]);
  if (rows.length === 0) return null;
  return [rows[0].ejecutiva_correo, rows[0].jefatura_correo].filter(Boolean).join(',');
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
