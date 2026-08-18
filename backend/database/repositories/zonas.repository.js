const knex = require('../knex');

const findAll = async () => {
  return await knex('zonas').select('*').orderBy('id', 'asc');
};

module.exports = {
  findAll
};
