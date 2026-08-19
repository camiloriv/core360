const { sql, poolPromise } = require("../mssql");

exports.getJefaturas = async (gerencia_id, jefatura_id) => {
  const pool = await poolPromise;
  const request = pool.request();
  
  let baseSql = `
    SELECT id, nombre, correo, permisos, cargos, jefatura_id, gerencia_id, zona_id, vistas_permitidas
    FROM usuarios
    WHERE permisos IN ('jefatura', 'gerencia')
  `;

  if (gerencia_id) {
    baseSql += `
      AND (
        id = @gerencia_id OR id IN (
          SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = @gerencia_id
          UNION
          SELECT ug2.usuario_id
          FROM usuario_gerencias ug2
          WHERE ug2.gerencia_id IN (
            SELECT ug.usuario_id
            FROM usuario_gerencias ug
            JOIN usuarios u ON ug.usuario_id = u.id
            WHERE ug.gerencia_id = @gerencia_id AND u.permisos = 'gerencia'
          )
        )
      )
    `;
    request.input('gerencia_id', sql.Int, gerencia_id);
  } else if (jefatura_id) {
    baseSql += " AND id = @jefatura_id";
    request.input('jefatura_id', sql.Int, jefatura_id);
  }
  
  baseSql += " ORDER BY nombre ASC";
  
  const result = await request.query(baseSql);
  return result.recordset;
};

exports.insertJefatura = async (nombre, correo, hashedContrasena) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('nombre', sql.VarChar, nombre)
    .input('correo', sql.VarChar, correo || null)
    .input('contrasena', sql.VarChar, hashedContrasena)
    .query(`
      INSERT INTO usuarios (nombre, correo, permisos, contrasena, requiere_cambio_clave)
      OUTPUT inserted.id
      VALUES (@nombre, @correo, 'jefatura', @contrasena, 1)
    `);
  
  return result.recordset[0]?.id || null;
};

exports.updateJefatura = async (id, nombre, correo, hashedContrasena) => {
  const pool = await poolPromise;
  const request = pool.request();
  
  request.input('id', sql.Int, id);
  request.input('nombre', sql.VarChar, nombre);
  request.input('correo', sql.VarChar, correo || null);

  let queryStr = "UPDATE usuarios SET nombre = @nombre, correo = @correo";
  
  if (hashedContrasena) {
    request.input('contrasena', sql.VarChar, hashedContrasena);
    queryStr += ", contrasena = @contrasena, requiere_cambio_clave = 1";
  }
  
  queryStr += " WHERE id = @id AND permisos = 'jefatura'";
  
  await request.query(queryStr);
};

exports.deleteJefatura = async (id) => {
  const pool = await poolPromise;
  await pool.request()
    .input('id', sql.Int, id)
    .query("DELETE FROM usuarios WHERE id = @id AND permisos = 'jefatura'");
};
