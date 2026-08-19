const { poolPromise } = require('../mssql');

const findAll = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT * FROM zonas ORDER BY id ASC');
  return result.recordset;
};

module.exports = {
  findAll
};
