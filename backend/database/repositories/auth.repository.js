const knex = require('../knex');

const findUsuarioByCorreo = async (correo) => {
  return await knex('usuarios').where('correo', correo).first();
};

const updateContrasena = async (id, contrasena, requiereCambioClave) => {
  return await knex('usuarios')
    .where('id', id)
    .update({
      contrasena,
      requiere_cambio_clave: requiereCambioClave ? 1 : 0
    });
};

module.exports = {
  findUsuarioByCorreo,
  updateContrasena
};
