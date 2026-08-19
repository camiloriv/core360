const { sql, poolPromise } = require('../mssql');

const updateEmpresaJefatura = async (jefa_cartera, rut, razon_social) => {
  if (jefa_cartera && jefa_cartera !== 'No Asignado') {
    const pool = await poolPromise;
    const jefaResult = await pool.request()
      .input('nombre', sql.VarChar, jefa_cartera)
      .query("SELECT TOP 1 id FROM usuarios WHERE nombre = @nombre");
      
    if (jefaResult.recordset.length > 0) {
      const jefaId = jefaResult.recordset[0].id;
      let q = "SELECT TOP 1 id FROM empresas WHERE 1=1";
      const req = pool.request();
      
      if (rut) {
        q += " AND REPLACE(REPLACE(rut, '.', ''), '-', '') = REPLACE(REPLACE(@rut, '.', ''), '-', '')";
        req.input('rut', sql.VarChar, rut);
      } else if (razon_social) {
        q += " AND razon_social = @razon_social";
        req.input('razon_social', sql.VarChar, razon_social);
      } else {
        return;
      }
      
      const empresa = await req.query(q);
      if (empresa.recordset.length > 0) {
        const empId = empresa.recordset[0].id;
        await pool.request()
          .input('jefatura_id', sql.Int, jefaId)
          .input('id', sql.Int, empId)
          .query("UPDATE empresas SET jefatura_id = @jefatura_id WHERE id = @id");
        console.log(`✅ Empresa ${empId} actualizada con Jefatura ${jefaId} (${jefa_cartera})`);
      }
    }
  }
};

const buildListarQuery = (filtros, isCount = false) => {
  let q = isCount ? "SELECT COUNT(*) as total FROM nuevos_negocios n WHERE 1=1" : "SELECT n.* FROM nuevos_negocios n WHERE 1=1";
  
  if (filtros.estado_contacto) q += " AND n.estado_contacto = @estado_contacto";
  if (filtros.estado) q += " AND n.estado = @estado";
  if (filtros.zona) q += " AND n.zona = @zona";
  if (filtros.jefa_cartera) q += " AND n.jefa_cartera = @jefa_cartera";
  if (filtros.indicador) q += " AND n.indicador = @indicador";
  if (filtros.otic_actual) q += " AND n.otic_actual = @otic_actual";
  
  if (filtros.busqueda) {
    q += ` AND (
      n.holding LIKE @busqueda
      OR n.razon_social LIKE @busqueda
      OR n.contacto LIKE @busqueda
      OR n.correo LIKE @busqueda
      OR n.rut LIKE @busqueda
    )`;
  }
  return q;
};

const bindFiltros = (req, filtros) => {
  if (filtros.estado_contacto) req.input('estado_contacto', sql.VarChar, filtros.estado_contacto);
  if (filtros.estado) req.input('estado', sql.VarChar, filtros.estado);
  if (filtros.zona) req.input('zona', sql.VarChar, filtros.zona);
  if (filtros.jefa_cartera) req.input('jefa_cartera', sql.VarChar, filtros.jefa_cartera);
  if (filtros.indicador) req.input('indicador', sql.VarChar, filtros.indicador);
  if (filtros.otic_actual) req.input('otic_actual', sql.VarChar, filtros.otic_actual);
  if (filtros.busqueda) req.input('busqueda', sql.VarChar, `%${filtros.busqueda}%`);
};

const listar = async (filtros, page, limit) => {
  const pool = await poolPromise;
  
  let countQ = buildListarQuery(filtros, true);
  const countReq = pool.request();
  bindFiltros(countReq, filtros);
  const countResult = await countReq.query(countQ);
  const total = countResult.recordset[0].total;

  let q = buildListarQuery(filtros, false);
  const req = pool.request();
  bindFiltros(req, filtros);
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  q += " ORDER BY n.estado_contacto ASC, n.holding ASC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
  req.input('offset', sql.Int, offset);
  req.input('limit', sql.Int, parseInt(limit));
  
  const result = await req.query(q);
  
  return { rows: result.recordset, total };
};

const getStats = async () => {
  const pool = await poolPromise;
  
  const estadoContactoRes = await pool.request().query(`
    SELECT estado_contacto, COUNT(*) as count, 
           SUM(monto_1_porciento) as monto_proyectado, SUM(aporte_ingresado) as aporte_ingresado
    FROM nuevos_negocios GROUP BY estado_contacto
  `);
  
  const estadoDetalleRes = await pool.request().query(`
    SELECT estado, COUNT(*) as count FROM nuevos_negocios GROUP BY estado
  `);

  const totalesRes = await pool.request().query(`
    SELECT COUNT(*) as total, 
           SUM(monto_1_porciento) as monto_proyectado_total,
           SUM(aporte_ingresado) as aporte_ingresado_total,
           SUM(monto_administracion) as monto_administracion_total
    FROM nuevos_negocios
  `);

  return { 
    estadoContacto: estadoContactoRes.recordset, 
    estadoDetalle: estadoDetalleRes.recordset, 
    totales: totalesRes.recordset[0] 
  };
};

const getHistorial = async (negocio_id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('negocio_id', sql.Int, negocio_id)
    .query("SELECT * FROM nuevos_negocios_historial WHERE negocio_id = @negocio_id ORDER BY created_at DESC");
  return result.recordset;
};

const getDetalle = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query("SELECT TOP 1 * FROM nuevos_negocios WHERE id = @id");
  return result.recordset[0];
};

const insertNegocio = async (data, logMessage, usuario) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    let q = `INSERT INTO nuevos_negocios (${keys.join(', ')}) OUTPUT INSERTED.id VALUES (${keys.map((_, i) => `@p${i}`).join(', ')})`;
    const req = new sql.Request(transaction);
    values.forEach((v, i) => req.input(`p${i}`, v));
    
    const res = await req.query(q);
    const newId = res.recordset[0]?.id;
    
    const histReq = new sql.Request(transaction);
    await histReq
      .input('negocio_id', sql.Int, newId)
      .input('campo_modificado', sql.VarChar, 'creacion')
      .input('valor_nuevo', sql.VarChar, logMessage)
      .input('usuario', sql.VarChar, usuario)
      .query("INSERT INTO nuevos_negocios_historial (negocio_id, campo_modificado, valor_nuevo, usuario) VALUES (@negocio_id, @campo_modificado, @valor_nuevo, @usuario)");
      
    const finalReq = new sql.Request(transaction);
    const finalRes = await finalReq.input('id', sql.Int, newId).query("SELECT TOP 1 * FROM nuevos_negocios WHERE id = @id");
    
    await transaction.commit();
    return finalRes.recordset[0];
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const insertHistorial = async (negocio_id, campo, anterior, nuevo, usuario) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('negocio_id', sql.Int, negocio_id)
    .input('campo', sql.VarChar, campo)
    .input('anterior', sql.VarChar, anterior || '')
    .input('nuevo', sql.VarChar, nuevo || '')
    .input('usuario', sql.VarChar, usuario)
    .query("INSERT INTO nuevos_negocios_historial (negocio_id, campo_modificado, valor_anterior, valor_nuevo, usuario) VALUES (@negocio_id, @campo, @anterior, @nuevo, @usuario)");
  return result.rowsAffected[0];
};

const updateNegocio = async (id, data) => {
  const pool = await poolPromise;
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  let q = `UPDATE nuevos_negocios SET ${keys.map((k, i) => `${k} = @p${i}`).join(', ')} WHERE id = @id`;
  const req = pool.request().input('id', sql.Int, id);
  Object.values(data).forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(q);
  return result.rowsAffected[0];
};

const deleteNegocio = async (id) => {
  const pool = await poolPromise;
  const result = await pool.request().input('id', sql.Int, id).query("DELETE FROM nuevos_negocios WHERE id = @id");
  return result.rowsAffected[0];
};

const getAllForExport = async (filtros) => {
  const pool = await poolPromise;
  let q = buildListarQuery(filtros, false);
  const req = pool.request();
  bindFiltros(req, filtros);
  q += " ORDER BY n.estado_contacto ASC, n.holding ASC";
  const result = await req.query(q);
  return result.recordset;
};

const getOpciones = async () => {
  const pool = await poolPromise;
  const getDistinct = async (col) => {
    // SQL Injection safe since col is controlled from code, but let's be careful
    const result = await pool.request().query(`SELECT DISTINCT ${col} FROM nuevos_negocios WHERE ${col} IS NOT NULL AND ${col} != '' ORDER BY ${col}`);
    return result.recordset.map(r => r[col]);
  };

  return {
    estados_contacto: await getDistinct('estado_contacto'),
    estados: await getDistinct('estado'),
    zonas: await getDistinct('zona'),
    jefas_cartera: await getDistinct('jefa_cartera'),
    indicadores: await getDistinct('indicador'),
    otics: await getDistinct('otic_actual')
  };
};

const findNegocioByRut = async (rutLimpio) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('rut', sql.VarChar, rutLimpio)
    .query("SELECT TOP 1 id FROM nuevos_negocios WHERE REPLACE(REPLACE(rut, '.', ''), '-', '') = REPLACE(REPLACE(@rut, '.', ''), '-', '')");
  return result.recordset[0];
};

const findNegocioByRazonSocial = async (razon_social) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('razon_social', sql.VarChar, razon_social)
    .query("SELECT TOP 1 id FROM nuevos_negocios WHERE razon_social = @razon_social");
  return result.recordset[0];
};

module.exports = {
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
