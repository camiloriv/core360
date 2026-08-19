const { sql, poolPromise } = require("../mssql");

exports.getAuditLogCount = async (whereString, params) => {
    const pool = await poolPromise;
    const countReq = pool.request();
    params.forEach(p => countReq.input(p.name, p.type, p.value));
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM audit_log a ${whereString}`);
    return countResult.recordset[0].total || 0;
};

exports.getAuditLogData = async (whereString, params, offset, limit) => {
    const pool = await poolPromise;
    const dataReq = pool.request();
    params.forEach(p => dataReq.input(p.name, p.type, p.value));
    dataReq.input('offset', sql.Int, offset);
    dataReq.input('limit', sql.Int, limit);
    const dataResult = await dataReq.query(`
        SELECT a.* FROM audit_log a 
        ${whereString} 
        ORDER BY a.created_at DESC 
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return dataResult.recordset;
};

exports.getAccionesDisponibles = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT DISTINCT accion FROM audit_log ORDER BY accion ASC");
    return result.recordset.map(r => r.accion);
};
