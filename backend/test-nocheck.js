const knex = require('knex')(require('./knexfile').development);
async function test() {
    try {
        await knex.raw("EXEC sp_MSforeachtable 'ALTER TABLE ' + CHAR(63) + ' NOCHECK CONSTRAINT all'");
        console.log('SUCCESS');
        process.exit(0);
    } catch(e) { console.error('ERROR:', e.message); process.exit(1); }
}
test();
