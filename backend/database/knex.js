const knex = require('knex');
const knexfile = require('../knexfile');

// Conexión principal (SQL Server)
const environment = process.env.NODE_ENV || 'development';
const db = knex(knexfile[environment]);

module.exports = db;
