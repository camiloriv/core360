const { sql, poolPromise } = require("../mssql");

exports.resetMeetingData = async () => {
    const results = {};
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    
    try {
        const deleteTable = async (table) => {
            try {
                const result = await new sql.Request(transaction).query(`DELETE FROM ${table}`);
                return result.rowsAffected[0];
            } catch (e) {
                return 0;
            }
        };

        results.minutas_eliminadas = await deleteTable('minutas');
        results.teams_eventos_eliminados = await deleteTable('teams_eventos');
        results.reuniones_legacy_eliminadas = await deleteTable('reuniones');
        results.huerfanas_legacy_eliminadas = await deleteTable('reuniones_huerfanas');
        results.logs_seguimiento_eliminados = await deleteTable('empresa_seguimiento_log');
        results.encuesta_respuestas_eliminadas = await deleteTable('encuesta_respuestas');
        results.encuestas_eliminadas = await deleteTable('encuestas');
        
        try {
            await deleteTable('sync_log');
            results.sync_log_limpiado = true;
        } catch(e) {
            results.sync_log_limpiado = false;
        }

        const res1 = await new sql.Request(transaction).query("UPDATE usuarios SET sync_delta_token = NULL, ultima_sincronizacion = NULL");
        results.delta_tokens_reseteados = res1.rowsAffected[0];

        const res2 = await new sql.Request(transaction).query("UPDATE empresas SET estado_seguimiento = 'pendiente', fecha_concretada = NULL, fecha_solicitada = NULL");
        results.empresas_reseteadas = res2.rowsAffected[0];

        await transaction.commit();
        return results;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

exports.resetPasswords = async (hashed) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('hashed', sql.VarChar, hashed)
        .query("UPDATE usuarios SET contrasena = @hashed");
    return result.rowsAffected[0];
};

exports.getDiagnosticoStats = async () => {
    const result = {};
    const pool = await poolPromise;
    
    try {
        const te1 = await pool.request().query("SELECT COUNT(*) as total FROM teams_eventos");
        result.teams_eventos_total = te1.recordset[0].total || 0;

        const te2 = await pool.request().query("SELECT estado, COUNT(*) as total FROM teams_eventos GROUP BY estado ORDER BY total DESC");
        result.teams_eventos_por_estado = te2.recordset;

        const te3 = await pool.request().query("SELECT COUNT(*) as total FROM teams_eventos WHERE empresa_id IS NULL");
        result.teams_eventos_sin_empresa = te3.recordset[0].total || 0;
    } catch (e) {
        result.teams_eventos_total = 'tabla no existe aún';
    }

    try {
        const m1 = await pool.request().query("SELECT COUNT(*) as total FROM minutas");
        result.minutas_total = m1.recordset[0].total || 0;

        const m2 = await pool.request().query("SELECT estado_envio, COUNT(*) as total FROM minutas GROUP BY estado_envio ORDER BY total DESC");
        result.minutas_por_estado = m2.recordset;
    } catch (e) {
        result.minutas_total = 'tabla no existe aún';
    }

    try {
        const s1 = await pool.request().query("SELECT TOP 5 tipo, ejecutado_at, resultado FROM sync_log ORDER BY id DESC");
        result.sync_log_reciente = s1.recordset;
    } catch (e) {
        result.sync_log_reciente = [];
    }

    const u1 = await pool.request().query(`
        SELECT id, correo, ultima_sincronizacion, 
        CASE WHEN sync_delta_token IS NOT NULL THEN 'con token' ELSE 'sin token' END AS token_status 
        FROM usuarios WHERE correo IS NOT NULL
    `);
    result.usuarios_sync_status = u1.recordset;

    const e1 = await pool.request().query("SELECT COUNT(*) as total FROM empresas");
    result.empresas_total = e1.recordset[0].total || 0;

    const e2 = await pool.request().query("SELECT estado_seguimiento, COUNT(*) as total FROM empresas GROUP BY estado_seguimiento ORDER BY total DESC");
    result.empresas_por_estado = e2.recordset;

    const ed1 = await pool.request().query("SELECT COUNT(*) as total FROM empresa_dominios");
    const ec1 = await pool.request().query("SELECT COUNT(*) as total FROM empresa_contactos");
    result.dominios_aprendidos = ed1.recordset[0].total || 0;
    result.contactos_aprendidos = ec1.recordset[0].total || 0;

    try {
        const r1 = await pool.request().query("SELECT COUNT(*) as total FROM reuniones");
        result.reuniones_legacy = r1.recordset[0].total || 0;
    } catch (e) {
        result.reuniones_legacy = 'tabla eliminada';
    }

    try {
        const rh1 = await pool.request().query("SELECT COUNT(*) as total FROM reuniones_huerfanas");
        result.huerfanas_legacy = rh1.recordset[0].total || 0;
    } catch (e) {
        result.huerfanas_legacy = 'tabla eliminada';
    }
    
    return result;
};
