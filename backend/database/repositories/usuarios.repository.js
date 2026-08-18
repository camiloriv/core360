const knex = require('../knex');

const getUsuarios = async () => {
  return await knex.raw(`
    SELECT u.id, u.nombre, u.correo, u.permisos, u.cargos, u.jefatura_id, u.gerencia_id, u.zona_id, u.vistas_permitidas, u.permite_traspaso,
           j.nombre as jefatura_nombre, 
           COALESCE(
             (SELECT GROUP_CONCAT(g2.nombre SEPARATOR ', ')
              FROM usuario_gerencias ug
              JOIN usuarios g2 ON ug.gerencia_id = g2.id
              WHERE ug.usuario_id = u.id),
             g.nombre
           ) as gerencia_nombre,
           (
             SELECT GROUP_CONCAT(ug.gerencia_id)
             FROM usuario_gerencias ug
             WHERE ug.usuario_id = u.id
           ) as gerencia_ids,
            CASE
              WHEN u.permisos = 'gerencia' THEN (
                SELECT GROUP_CONCAT(DISTINCT z2.nombre SEPARATOR ', ')
                FROM usuarios j2
                JOIN zonas z2 ON j2.zona_id = z2.id
                WHERE j2.id IN (
                  SELECT usuario_id FROM usuario_gerencias WHERE gerencia_id = u.id
                  UNION
                  SELECT ug2.usuario_id FROM usuario_gerencias ug2 WHERE ug2.gerencia_id IN (
                    SELECT ug.usuario_id FROM usuario_gerencias ug 
                    JOIN usuarios usr ON ug.usuario_id = usr.id 
                    WHERE ug.gerencia_id = u.id AND usr.permisos = 'gerencia'
                  )
                )
              )
             WHEN u.permisos = 'ejecutiva' THEN zj.nombre
             ELSE z.nombre
           END as zona_nombre
    FROM usuarios u 
    LEFT JOIN usuarios j ON u.jefatura_id = j.id
    LEFT JOIN usuarios g ON u.gerencia_id = g.id
    LEFT JOIN zonas z ON u.zona_id = z.id
    LEFT JOIN zonas zj ON j.zona_id = zj.id
    ORDER BY u.nombre ASC
  `).then(res => res[0] || res); // MySQL returns [rows, fields], SQL Server might just return rows depending on driver
};

const countUsuariosByCorreoOrNombre = async (correo, nombre, excludeId = null) => {
  let query = knex('usuarios')
    .where(function() {
      this.where('correo', correo).orWhere('nombre', nombre);
    });
  if (excludeId) {
    query = query.whereNot('id', excludeId);
  }
  const result = await query.select('id');
  return result.length;
};

const getUsuarioById = async (id) => {
  return await knex('usuarios').where('id', id).first();
};

const insertUsuario = async (data) => {
  const [result] = await knex('usuarios').insert(data).returning('id');
  return result?.id || result;
};

const updateUsuario = async (id, data) => {
  return await knex('usuarios').where('id', id).update(data);
};

const deleteUsuario = async (id) => {
  return await knex('usuarios').where('id', id).del();
};

const insertUsuarioGerencias = async (usuario_id, gerencia_id) => {
  // Knex doesn't have cross-DB INSERT IGNORE, but we can check first or just try catch
  const exists = await knex('usuario_gerencias').where({ usuario_id, gerencia_id }).first();
  if (!exists) {
    return await knex('usuario_gerencias').insert({ usuario_id, gerencia_id });
  }
};

const deleteUsuarioGerencias = async (usuario_id) => {
  return await knex('usuario_gerencias').where('usuario_id', usuario_id).del();
};

const updateContrasena = async (id, contrasena) => {
  return await knex('usuarios').where('id', id).update({ contrasena, requiere_cambio_clave: 0 });
};

const getPreferencias = async (id) => {
  return await knex('usuarios').select('preferencias').where('id', id).first();
};

const updatePreferencias = async (id, preferenciasStr) => {
  return await knex('usuarios').where('id', id).update({ preferencias: preferenciasStr });
};

module.exports = {
  getUsuarios,
  countUsuariosByCorreoOrNombre,
  getUsuarioById,
  insertUsuario,
  updateUsuario,
  deleteUsuario,
  insertUsuarioGerencias,
  deleteUsuarioGerencias,
  updateContrasena,
  getPreferencias,
  updatePreferencias
};
