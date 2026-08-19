const { sql, poolPromise } = require('../mssql');

const findUsuarioByCorreo = async (correo) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('correo', sql.VarChar, correo)
    .query('SELECT TOP 1 * FROM usuarios WHERE correo = @correo');
  return result.recordset[0];
};

const updateContrasena = async (id, contrasena, requiereCambioClave) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('contrasena', sql.VarChar, contrasena)
    .input('requiere_cambio_clave', sql.Int, requiereCambioClave ? 1 : 0)
    .query(`
      UPDATE usuarios 
      SET contrasena = @contrasena, requiere_cambio_clave = @requiere_cambio_clave
      WHERE id = @id
    `);
  return result.rowsAffected[0];
};

module.exports = {
  findUsuarioByCorreo,
  updateContrasena
};
