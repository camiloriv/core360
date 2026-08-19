const { sql, poolPromise } = require('../mssql');

const obtenerTemplatesActivos = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT id, nombre, version FROM encuesta_templates WHERE activo = 1');
  return result.recordset;
};

const getTemplateIdByName = async (tipo_encuesta) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('tipo_encuesta', sql.VarChar, tipo_encuesta)
    .query('SELECT TOP 1 id FROM encuesta_templates WHERE nombre = @tipo_encuesta AND activo = 1');
  return result.recordset[0];
};

const insertEncuesta = async (data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  const values = Object.values(data);
  let q = `INSERT INTO encuestas (${keys.join(', ')}) OUTPUT INSERTED.id VALUES (${keys.map((_, i) => `@p${i}`).join(', ')})`;
  const req = pool.request();
  values.forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(q);
  return result.recordset[0]?.id;
};

const getEncuestaConContexto = async (token) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('token', sql.VarChar, token)
    .query(`
      SELECT TOP 1
        e.id,
        e.template_id,
        emp.nombre as empresa,
        ej.nombre as ejecutiva,
        t.nombre as template,
        CASE WHEN e.estado = 'completada' THEN 1 ELSE 0 END as completada
      FROM encuestas e
      LEFT JOIN empresas emp ON emp.id = e.empresa_id
      LEFT JOIN usuarios ej ON ej.id = e.ejecutiva_id
      LEFT JOIN encuesta_templates t ON t.id = e.template_id
      WHERE e.token = @token AND e.activo = 1
    `);
  return result.recordset[0];
};

const getPreguntasPorTemplate = async (template_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('template_id', sql.Int, template_id)
    .query(`
      SELECT p.id, p.texto, p.tipo, p.opciones_json, tp.requerida, p.escala
      FROM encuesta_template_preguntas tp
      JOIN encuesta_catalogo_preguntas p ON tp.pregunta_id = p.id
      WHERE tp.template_id = @template_id
      ORDER BY tp.orden ASC
    `);
  return result.recordset;
};

const marcarEncuestaCompletada = async (encuesta_id, trx = null) => {
  const pool = await poolPromise;
  const req = trx ? new sql.Request(trx) : pool.request();
  const result = await req
    .input('encuesta_id', sql.Int, encuesta_id)
    .query("UPDATE encuestas SET estado = 'completada', fecha_respuesta = GETDATE() WHERE id = @encuesta_id");
  return result.rowsAffected[0];
};

const insertRespuesta = async (data, trx = null) => {
  const pool = await poolPromise;
  const req = trx ? new sql.Request(trx) : pool.request();
  const keys = Object.keys(data);
  const values = Object.values(data);
  let q = `INSERT INTO encuesta_respuestas (${keys.join(', ')}) VALUES (${keys.map((_, i) => `@p${i}`).join(', ')})`;
  values.forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const getTodasLasRespuestas = async (usuario_id, rol) => {
  const pool = await poolPromise;
  let q = `
    SELECT 
      e.id, e.token, e.estado, e.activo, e.enviado_a, e.reunion_id,
      e.fecha_creacion, e.fecha_respuesta,
      t.nombre as titulo,
      emp.nombre as empresa, e.empresa_id, e.ejecutiva_id,
      emp.jefatura_id as jefatura_id,
      ej.nombre as ejecutiva,
      j.nombre as jefatura
    FROM encuestas e
    JOIN encuesta_templates t ON e.template_id = t.id
    LEFT JOIN empresas emp ON e.empresa_id = emp.id
    LEFT JOIN usuarios ej ON e.ejecutiva_id = ej.id
    LEFT JOIN usuarios j ON emp.jefatura_id = j.id
    WHERE 1=1
  `;
  const req = pool.request();

  if (rol === 'ejecutiva') {
    q += `
      AND (
        emp.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = @usuario_id)
        OR emp.jefatura_id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = @usuario_id))
        OR e.ejecutiva_id = @usuario_id
      )
    `;
    req.input('usuario_id', sql.Int, usuario_id);
  } else if (rol === 'jefatura') {
    q += `
      AND (
        emp.jefatura_id = @usuario_id
        OR emp.jefatura_id IN (SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = @usuario_id)
      )
    `;
    req.input('usuario_id', sql.Int, usuario_id);
  } else if (rol === 'gerencia') {
    q += `
      AND (
        j.id IN (
          SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = @usuario_id
          UNION
          SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
            SELECT ug.usuario_id FROM usuario_gerencias ug
            JOIN usuarios u ON ug.usuario_id = u.id
            WHERE ug.gerencia_id = @usuario_id AND u.permisos = 'gerencia'
          )
        )
        OR emp.jefatura_id = @usuario_id
      )
    `;
    req.input('usuario_id', sql.Int, usuario_id);
  }

  q += " ORDER BY e.fecha_creacion DESC";
  const result = await req.query(q);
  return result.recordset;
};

const updateEstadoEncuesta = async (id, activo) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('activo', sql.Int, activo ? 1 : 0)
    .query('UPDATE encuestas SET activo = @activo WHERE id = @id');
  return result.rowsAffected[0];
};

const updateEnviadoA = async (id, email) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('email', sql.VarChar, email)
    .query('UPDATE encuestas SET enviado_a = @email WHERE id = @id');
  return result.rowsAffected[0];
};

const countTotalEnvios = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT COUNT(*) as total FROM encuestas');
  return result.recordset[0].total;
};

const getCatalogoPreguntas = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT q.id, q.texto, q.tipo, d.nombre as dimension
    FROM encuesta_catalogo_preguntas q
    LEFT JOIN encuesta_dimensiones d ON q.dimension_id = d.id
    WHERE COALESCE(q.activo, 1) != 2
  `);
  return result.recordset;
};

const getCorreosBcc = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT e.correo as ejecutiva_correo, j.correo as jefatura_correo
      FROM encuestas enc
      JOIN usuarios e ON enc.ejecutiva_id = e.id
      LEFT JOIN usuarios j ON e.jefatura_id = j.id
      WHERE enc.id = @id
    `);
  return result.recordset[0];
};

module.exports = {
  obtenerTemplatesActivos,
  getTemplateIdByName,
  insertEncuesta,
  getEncuestaConContexto,
  getPreguntasPorTemplate,
  marcarEncuestaCompletada,
  insertRespuesta,
  getTodasLasRespuestas,
  updateEstadoEncuesta,
  updateEnviadoA,
  countTotalEnvios,
  getCatalogoPreguntas,
  getCorreosBcc
};
