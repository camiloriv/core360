const knex = require('../knex');

const updateEmpresaJefatura = async (jefa_cartera, rut, razon_social) => {
  if (jefa_cartera && jefa_cartera !== 'No Asignado') {
    const jefa = await knex('usuarios').select('id').where('nombre', jefa_cartera).first();
    if (jefa) {
      let query = knex('empresas').select('id');
      if (rut) {
        query.whereRaw("REPLACE(REPLACE(rut, '.', ''), '-', '') = REPLACE(REPLACE(?, '.', ''), '-', '')", [rut]);
      } else if (razon_social) {
        query.where('razon_social', razon_social);
      } else {
        return;
      }
      
      const empresa = await query.first();
      if (empresa) {
        await knex('empresas').where('id', empresa.id).update({ jefatura_id: jefa.id });
        console.log(`✅ Empresa ${empresa.id} actualizada con Jefatura ${jefa.id} (${jefa_cartera})`);
      }
    }
  }
};

const listar = async (filtros, page, limit) => {
  let query = knex('nuevos_negocios as n').select('n.*');
  
  if (filtros.estado_contacto) query.where('n.estado_contacto', filtros.estado_contacto);
  if (filtros.estado) query.where('n.estado', filtros.estado);
  if (filtros.zona) query.where('n.zona', filtros.zona);
  if (filtros.jefa_cartera) query.where('n.jefa_cartera', filtros.jefa_cartera);
  if (filtros.indicador) query.where('n.indicador', filtros.indicador);
  if (filtros.otic_actual) query.where('n.otic_actual', filtros.otic_actual);
  
  if (filtros.busqueda) {
    const b = `%${filtros.busqueda}%`;
    query.where(function() {
      this.where('n.holding', 'like', b)
        .orWhere('n.razon_social', 'like', b)
        .orWhere('n.contacto', 'like', b)
        .orWhere('n.correo', 'like', b)
        .orWhere('n.rut', 'like', b);
    });
  }

  // Clone query for counting
  const countQuery = query.clone();
  countQuery.clearSelect().count('* as total').first();

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query.orderBy('n.estado_contacto', 'asc').orderBy('n.holding', 'asc').limit(parseInt(limit)).offset(offset);

  const rows = await query;
  const countResult = await countQuery;
  const total = countResult ? countResult.total : 0;

  return { rows, total };
};

const getStats = async () => {
  const estadoContacto = await knex('nuevos_negocios')
    .select('estado_contacto')
    .count('* as count')
    .sum('monto_1_porciento as monto_proyectado')
    .sum('aporte_ingresado as aporte_ingresado')
    .groupBy('estado_contacto');

  const estadoDetalle = await knex('nuevos_negocios')
    .select('estado')
    .count('* as count')
    .groupBy('estado');

  const totales = await knex('nuevos_negocios')
    .count('* as total')
    .sum('monto_1_porciento as monto_proyectado_total')
    .sum('aporte_ingresado as aporte_ingresado_total')
    .sum('monto_administracion as monto_administracion_total')
    .first();

  return { estadoContacto, estadoDetalle, totales };
};

const getHistorial = async (negocio_id) => {
  return await knex('nuevos_negocios_historial')
    .where('negocio_id', negocio_id)
    .orderBy('created_at', 'desc');
};

const getDetalle = async (id) => {
  return await knex('nuevos_negocios').where('id', id).first();
};

const insertNegocio = async (data, logMessage, usuario) => {
  return await knex.transaction(async (trx) => {
    const [result] = await trx('nuevos_negocios').insert(data).returning('id');
    const newId = result?.id || result;

    await trx('nuevos_negocios_historial').insert({
      negocio_id: newId,
      campo_modificado: 'creacion',
      valor_anterior: null,
      valor_nuevo: logMessage,
      usuario
    });

    return await trx('nuevos_negocios').where('id', newId).first();
  });
};

const insertHistorial = async (negocio_id, campo, anterior, nuevo, usuario) => {
  return await knex('nuevos_negocios_historial').insert({
    negocio_id,
    campo_modificado: campo,
    valor_anterior: anterior || '',
    valor_nuevo: nuevo || '',
    usuario
  });
};

const updateNegocio = async (id, data) => {
  return await knex('nuevos_negocios').where('id', id).update(data);
};

const deleteNegocio = async (id) => {
  return await knex('nuevos_negocios').where('id', id).del();
};

const getAllForExport = async (filtros) => {
  let query = knex('nuevos_negocios');
  
  if (filtros.estado_contacto) query.where('estado_contacto', filtros.estado_contacto);
  if (filtros.estado) query.where('estado', filtros.estado);
  if (filtros.zona) query.where('zona', filtros.zona);
  if (filtros.jefa_cartera) query.where('jefa_cartera', filtros.jefa_cartera);
  if (filtros.indicador) query.where('indicador', filtros.indicador);
  
  if (filtros.busqueda) {
    const b = `%${filtros.busqueda}%`;
    query.where(function() {
      this.where('holding', 'like', b)
        .orWhere('razon_social', 'like', b)
        .orWhere('contacto', 'like', b)
        .orWhere('correo', 'like', b);
    });
  }

  query.orderBy('estado_contacto', 'asc').orderBy('holding', 'asc');
  return await query;
};

const getOpciones = async () => {
  const getDistinct = async (col) => {
    const rows = await knex('nuevos_negocios').distinct(col).whereNotNull(col).whereNot(col, '').orderBy(col);
    return rows.map(r => r[col]);
  };

  const estados_contacto = await getDistinct('estado_contacto');
  const estados = await getDistinct('estado');
  const zonas = await getDistinct('zona');
  const jefas_cartera = await getDistinct('jefa_cartera');
  const indicadores = await getDistinct('indicador');
  const otics = await getDistinct('otic_actual');

  return { estados_contacto, estados, zonas, jefas_cartera, indicadores, otics };
};

const findNegocioByRut = async (rutLimpio) => {
  return await knex('nuevos_negocios')
    .select('id')
    .whereRaw("REPLACE(REPLACE(rut, '.', ''), '-', '') = REPLACE(REPLACE(?, '.', ''), '-', '')", [rutLimpio])
    .first();
};

const findNegocioByRazonSocial = async (razon_social) => {
  return await knex('nuevos_negocios')
    .select('id')
    .where('razon_social', razon_social)
    .first();
};

module.exports = {
  knex,
  updateEmpresaJefatura,
  listar,
  getStats,
  getHistorial,
  getDetalle,
  insertNegocio,
  insertHistorial,
  updateNegocio,
  deleteNegocio,
  getAllForExport,
  getOpciones,
  findNegocioByRut,
  findNegocioByRazonSocial
};
