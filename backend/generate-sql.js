require('dotenv').config({ path: '../.env' });
const knexConfig = require('./knexfile');
const fs = require('fs');
const knex = require('knex')(knexConfig.development);

async function extractSQL() {
  const sqlStatements = [];
  
  // Listen to all queries executed
  knex.on('query', (queryData) => {
    // Filter to only schema modifications (CREATE, ALTER, DROP)
    const sql = queryData.sql.trim().toUpperCase();
    if (sql.startsWith('CREATE') || sql.startsWith('ALTER') || sql.startsWith('DROP')) {
      // Append semicolon for valid SQL script
      sqlStatements.push(queryData.sql + ';');
    }
  });

  console.log('Rolling back...');
  await knex.migrate.rollback({ all: true });

  console.log('Running migrations to capture SQL...');
  await knex.migrate.latest();

  const script = `-- =================================================================
-- CORE 360 - INITIAL SCHEMA FOR SQL SERVER
-- Generated automatically from Knex Migrations
-- =================================================================

` + sqlStatements.join('\n\n');

  fs.writeFileSync('schema.sql', script);
  console.log('✅ schema.sql generated successfully!');
  
  await knex.destroy();
}

extractSQL();
