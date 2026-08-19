const { sql, poolPromise } = require("../mssql");

// ============================================================
// RESOLUCIÓN DE USUARIOS Y CORREOS CC
// ============================================================

/**
 * Obtiene el correo de la gerente general (Lilian Ortega).
 */
const getGerenteCorreo = async () => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query("SELECT TOP 1 correo FROM usuarios WHERE nombre = 'Lilian Ortega'");
    return result.recordset[0]?.correo || "lortega@proforma.cl";
};

/**
 * Busca un usuario por su ID.
 */
const getUsuarioById = async (id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query("SELECT TOP 1 id, permisos, jefatura_id, correo, nombre FROM usuarios WHERE id = @id");
    return result.recordset[0] || null;
};

/**
 * Busca un usuario por su correo.
 */
const getUsuarioByCorreo = async (correo) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('correo', sql.VarChar, correo)
        .query("SELECT TOP 1 id, permisos, jefatura_id, correo, nombre FROM usuarios WHERE correo = @correo");
    return result.recordset[0] || null;
};

/**
 * Obtiene el correo de un usuario por su ID.
 */
const getCorreoById = async (id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query("SELECT TOP 1 correo FROM usuarios WHERE id = @id");
    return result.recordset[0]?.correo || null;
};

/**
 * Obtiene correo y jefatura_id de un usuario (ejecutiva).
 */
const getEjecutivaConJefatura = async (ejecutiva_id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, ejecutiva_id)
        .query("SELECT TOP 1 correo, jefatura_id FROM usuarios WHERE id = @id");
    return result.recordset[0] || null;
};

/**
 * Obtiene jefatura_id de un usuario.
 */
const getJefaturaId = async (usuario_id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, usuario_id)
        .query("SELECT TOP 1 jefatura_id FROM usuarios WHERE id = @id");
    return result.recordset[0]?.jefatura_id || null;
};

/**
 * Obtiene la primera ejecutiva de una jefatura.
 */
const getPrimeraEjecutivaDeJefatura = async (jefatura_id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('jefatura_id', sql.Int, jefatura_id)
        .query("SELECT TOP 1 correo FROM usuarios WHERE permisos = 'ejecutiva' AND jefatura_id = @jefatura_id");
    return result.recordset[0]?.correo || null;
};

/**
 * Obtiene el correo de la gerencia de un usuario vía usuario_gerencias.
 */
const getGerenciaCorreo = async (usuario_id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('usuario_id', sql.Int, usuario_id)
        .query(`
            SELECT TOP 1 u.correo FROM usuario_gerencias ug
            JOIN usuarios u ON ug.gerencia_id = u.id
            WHERE ug.usuario_id = @usuario_id
        `);
    return result.recordset[0]?.correo || null;
};

/**
 * Obtiene el nombre de un usuario por su ID (para firma de correo).
 */
const getUsuarioNombre = async (id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query("SELECT TOP 1 nombre FROM usuarios WHERE id = @id");
    return result.recordset[0]?.nombre || null;
};

/**
 * Obtiene la minuta con todo su contexto (empresa, zona, ejecutiva, jefatura).
 */
const getMinutaConContexto = async (id_minuta) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id_minuta', sql.VarChar, id_minuta)
        .query(`
            SELECT 
                m.*, 
                emp.nombre AS empresa_nombre,
                z.nombre AS zona_nombre,
                e.nombre AS ejecutiva_nombre,
                e.correo AS ejecutiva_correo,
                j.correo AS jefatura_correo
            FROM minutas m
            LEFT JOIN empresas emp ON m.empresa_id = emp.id
            LEFT JOIN zonas z ON emp.zona_id = z.id
            JOIN usuarios e ON m.ejecutiva_id = e.id
            LEFT JOIN usuarios j ON e.jefatura_id = j.id
            WHERE m.id_minuta = @id_minuta
        `);
    return result.recordset[0] || null;
};

/**
 * Calcula los correos CC por defecto para el envío de minutas.
 */
const calcularDefaultCc = async (empresa_id, ejecutiva_id, enviado_por_correo, enviado_por_id) => {
    const lilianCorreo = await getGerenteCorreo();

    let userPermisos = 'ejecutiva';
    let loggedInUser = null;

    if (enviado_por_id) {
        loggedInUser = await getUsuarioById(enviado_por_id);
        if (loggedInUser) userPermisos = loggedInUser.permisos || 'ejecutiva';
    } else if (enviado_por_correo) {
        loggedInUser = await getUsuarioByCorreo(enviado_por_correo);
        if (loggedInUser) userPermisos = loggedInUser.permisos || 'ejecutiva';
    }

    let correosCcArray = [];

    if (userPermisos === 'ejecutiva') {
        let jefaturaId = loggedInUser?.jefatura_id;
        if (!jefaturaId && ejecutiva_id) {
            jefaturaId = await getJefaturaId(ejecutiva_id);
        }
        if (jefaturaId) {
            const correoJef = await getCorreoById(jefaturaId);
            if (correoJef) correosCcArray.push(correoJef);
        }
        correosCcArray.push(lilianCorreo);
    } else if (userPermisos === 'jefatura') {
        if (ejecutiva_id) {
            const correoEj = await getCorreoById(ejecutiva_id);
            if (correoEj) correosCcArray.push(correoEj);
        } else if (loggedInUser?.id) {
            const correoEj = await getPrimeraEjecutivaDeJefatura(loggedInUser.id);
            if (correoEj) correosCcArray.push(correoEj);
        }
        
        if (loggedInUser?.id) {
            const correoGer = await getGerenciaCorreo(loggedInUser.id);
            if (correoGer) correosCcArray.push(correoGer);
        }
    } else if (userPermisos === 'gerencia') {
        if (loggedInUser?.jefatura_id) {
            const correoSup = await getCorreoById(loggedInUser.jefatura_id);
            if (correoSup) correosCcArray.push(correoSup);
        }
        if (ejecutiva_id) {
            const ejData = await getEjecutivaConJefatura(ejecutiva_id);
            if (ejData) {
                if (ejData.correo) correosCcArray.push(ejData.correo);
                if (ejData.jefatura_id) {
                    const correoJef = await getCorreoById(ejData.jefatura_id);
                    if (correoJef) correosCcArray.push(correoJef);
                }
            }
        }
    } else {
        if (ejecutiva_id) {
            const ejData = await getEjecutivaConJefatura(ejecutiva_id);
            if (ejData) {
                if (ejData.correo) correosCcArray.push(ejData.correo);
                if (ejData.jefatura_id) {
                    const correoJef = await getCorreoById(ejData.jefatura_id);
                    if (correoJef) correosCcArray.push(correoJef);
                }
            }
        }
        correosCcArray.push(lilianCorreo);
    }

    const correosCcFiltered = [...new Set(correosCcArray.filter(Boolean).map(e => e.trim()))];
    return correosCcFiltered.length > 0 ? correosCcFiltered.join(', ') : lilianCorreo;
};

module.exports = {
    getGerenteCorreo,
    getUsuarioById,
    getUsuarioByCorreo,
    getCorreoById,
    getEjecutivaConJefatura,
    getJefaturaId,
    getPrimeraEjecutivaDeJefatura,
    getGerenciaCorreo,
    getUsuarioNombre,
    getMinutaConContexto,
    calcularDefaultCc
};
