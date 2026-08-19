const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'SuperStrongPassword123!',
  server: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'core360',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ Conectado a SQL Server (mssql puro)');
    return pool;
  })
  .catch(err => {
    console.error('❌ Error de conexión a la base de datos: ', err);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise
};
