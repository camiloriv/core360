const { sql, poolPromise } = require('../mssql');

const getUsuarios = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT u.id, u.nombre, u.correo, u.permisos, u.cargos, u.jefatura_id, u.gerencia_id, u.zona_id, u.vistas_permitidas, u.permite_traspaso,
           j.nombre as jefatura_nombre, 
           COALESCE(
             (SELECT STRING_AGG(g2.nombre, ', ')
              FROM usuario_gerencias ug
              JOIN usuarios g2 ON ug.gerencia_id = g2.id
              WHERE ug.usuario_id = u.id),
             g.nombre
           ) as gerencia_nombre,
           (
             SELECT STRING_AGG(CAST(ug.gerencia_id AS VARCHAR), ',')
             FROM usuario_gerencias ug
             WHERE ug.usuario_id = u.id
           ) as gerencia_ids,
            CASE
              WHEN u.permisos = 'gerencia' THEN (
                SELECT STRING_AGG(dz.zona_nombre, ', ')
                FROM (
                  SELECT DISTINCT z2.nombre as zona_nombre
                  FROM usuarios j2
                  JOIN zonas z2 ON j2.zona_id = z2.id
                  WHERE j2.id IN (
                    SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = u.id
                    UNION
                    SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
                      SELECT ug.usuario_id FROM usuario_gerencias ug 
                      JOIN usuarios usr ON ug.usuario_id = usr.id 
                      WHERE ug.gerencia_id = u.id AND usr.permisos = 'gerencia'
                    )
                  )
                ) as dz
              )
             WHEN u.permisos = 'ejecutiva' THEN zj.nombre
             ELSE z.nombre
            END as zona_nombre
    FROM usuarios u 
    LEFT JOIN usuarios j ON u.jefatura_id = j.id
    LEFT JOIN usuarios g ON u.gerencia_id = g.id
    LEFT JOIN zonas z ON u.zona_id = z.id
    LEFT JOIN zonas zj ON j.zona_id = zj.id
    ORDER BY u.nombre ASC
  `);
  return result.recordset;
};


const countUsuariosByCorreoOrNombre = async (correo, nombre, excludeId = null) => {
  const pool = await poolPromise;
  let q = 'SELECT COUNT(id) as count FROM usuarios WHERE (correo = @correo OR nombre = @nombre)';
  const req = pool.request()
    .input('correo', sql.VarChar, correo)
    .input('nombre', sql.VarChar, nombre);
  
  if (excludeId) {
    q += ' AND id != @excludeId';
    req.input('excludeId', sql.Int, excludeId);
  }
  
  const result = await req.query(q);
  return result.recordset[0].count;
};

const getUsuarioById = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT TOP 1 * FROM usuarios WHERE id = @id');
  return result.recordset[0];
};

const insertUsuario = async (data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  let q = `INSERT INTO usuarios (${keys.join(', ')}) OUTPUT INSERTED.id VALUES (${keys.map((_, i) => `@p${i}`).join(', ')})`;
  const req = pool.request();
  values.forEach((v, i) => req.input(`p${i}`, v));
  
  const result = await req.query(q);
  return result.recordset[0]?.id;
};

const updateUsuario = async (id, data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  
  let q = `UPDATE usuarios SET ${keys.map((k, i) => `${k} = @p${i}`).join(', ')} WHERE id = @id`;
  const req = pool.request().input('id', sql.Int, id);
  Object.values(data).forEach((v, i) => req.input(`p${i}`, v));
  
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const deleteUsuario = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM usuarios WHERE id = @id');
  return result.rowsAffected[0];
};

const insertUsuarioGerencias = async (usuario_id, gerencia_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('usuario_id', sql.Int, usuario_id)
    .input('gerencia_id', sql.Int, gerencia_id)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM usuario_gerencias WHERE usuario_id = @usuario_id AND gerencia_id = @gerencia_id)
      BEGIN
        INSERT INTO usuario_gerencias (usuario_id, gerencia_id) VALUES (@usuario_id, @gerencia_id)
      END
    `);
  return result.rowsAffected[0];
};

const deleteUsuarioGerencias = async (usuario_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('usuario_id', sql.Int, usuario_id)
    .query('DELETE FROM usuario_gerencias WHERE usuario_id = @usuario_id');
  return result.rowsAffected[0];
};

const updateContrasena = async (id, contrasena) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('contrasena', sql.VarChar, contrasena)
    .query('UPDATE usuarios SET contrasena = @contrasena, requiere_cambio_clave = 0 WHERE id = @id');
  return result.rowsAffected[0];
};

const getPreferencias = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT preferencias FROM usuarios WHERE id = @id');
  return result.recordset[0];
};

const updatePreferencias = async (id, preferenciasStr) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('preferencias', sql.Text, preferenciasStr)
    .query('UPDATE usuarios SET preferencias = @preferencias WHERE id = @id');
  return result.rowsAffected[0];
};

module.exports = {
  getUsuarios,
  countUsuariosByCorreoOrNombre,
  getUsuarioById,
  insertUsuario,
  updateUsuario,
  deleteUsuario,
  insertUsuarioGerencias,
  deleteUsuarioGerencias,
  updateContrasena,
  getPreferencias,
  updatePreferencias
};
