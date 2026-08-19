const { sql, poolPromise } = require("../mssql");

exports.getEjecutivas = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT 
      u.id, u.nombre, u.correo, u.jefatura_id, u.cargo_id,
      u.permisos, u.gerencia_id, u.zona_id, u.vistas_permitidas,
      c.nombre as cargo_nombre, j.nombre as jefatura_nombre
    FROM usuarios u
    LEFT JOIN ejecutiva_cargos c ON u.cargo_id = c.id
    LEFT JOIN usuarios j ON u.jefatura_id = j.id
    WHERE u.permisos = 'ejecutiva'
    ORDER BY u.nombre ASC
  `);
    
  return result.recordset;
};

exports.insertEjecutiva = async (nombre, correo, jefatura_id, cargo_id, hashedContrasena) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('nombre', sql.VarChar, nombre)
    .input('correo', sql.VarChar, correo || null)
    .input('jefatura_id', sql.Int, jefatura_id || null)
    .input('cargo_id', sql.Int, cargo_id || 2)
    .input('contrasena', sql.VarChar, hashedContrasena)
    .query(`
      INSERT INTO usuarios (nombre, correo, jefatura_id, cargo_id, permisos, contrasena, requiere_cambio_clave)
      OUTPUT inserted.id
      VALUES (@nombre, @correo, @jefatura_id, @cargo_id, 'ejecutiva', @contrasena, 1)
    `);
  
  return result.recordset[0]?.id || null;
};

exports.updateEjecutiva = async (id, nombre, correo, jefatura_id, cargo_id, hashedContrasena) => {
  const pool = await poolPromise;
  const request = pool.request();
  
  request.input('id', sql.Int, id);
  request.input('nombre', sql.VarChar, nombre);
  request.input('correo', sql.VarChar, correo || null);
  request.input('jefatura_id', sql.Int, jefatura_id || null);
  request.input('cargo_id', sql.Int, cargo_id || 2);

  let queryStr = "UPDATE usuarios SET nombre = @nombre, correo = @correo, jefatura_id = @jefatura_id, cargo_id = @cargo_id";

  if (hashedContrasena) {
    request.input('contrasena', sql.VarChar, hashedContrasena);
    queryStr += ", contrasena = @contrasena, requiere_cambio_clave = 1";
  }

  queryStr += " WHERE id = @id AND permisos = 'ejecutiva'";

  await request.query(queryStr);
};

exports.deleteEjecutiva = async (id) => {
  const pool = await poolPromise;
  await pool.request()
    .input('id', sql.Int, id)
    .query("DELETE FROM usuarios WHERE id = @id AND permisos = 'ejecutiva'");
};
