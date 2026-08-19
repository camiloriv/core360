require('dotenv').config();

module.exports = {
  // Configuración para el entorno de desarrollo usando SQL Server en Docker
  development: {
    client: 'mssql',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'SuperStrongPassword123!',
      database: process.env.DB_NAME || 'core360',
      port: parseInt(process.env.DB_PORT) || 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableKeepAlive: true,
        requestTimeout: 30000
      }
    },
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      propagateCreateError: false
    },
    migrations: {
      directory: __dirname + '/database/migrations'
    },
    seeds: {
      directory: __dirname + '/database/seeds'
    }
  }
};
