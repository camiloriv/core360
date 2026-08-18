const db = require("../../database/knex");

/**
 * Registra una entrada en el audit log.
 * Fire-and-forget: no lanza errores para no bloquear el flujo principal.
 * 
 * @param {Object} params
 * @param {string} params.accion - Tipo de acción: 'minuta_creada', 'minuta_enviada', 'minuta_no_aplica', etc.
 * @param {string} params.entidad - Tipo de entidad: 'minuta', 'reunion', 'encuesta'
 * @param {string} [params.entidad_id] - ID de la entidad afectada (id_minuta, teams_evento_id)
 * @param {number} [params.usuario_id] - ID del usuario que ejecutó la acción (logueado)
 * @param {string} [params.usuario_nombre] - Nombre del usuario que ejecutó la acción
 * @param {number} [params.ejecutiva_id] - ID de la ejecutiva asignada a la minuta
 * @param {string} [params.ejecutiva_nombre] - Nombre de la ejecutiva asignada
 * @param {number} [params.empresa_id] - ID de la empresa relacionada
 * @param {string} [params.empresa_nombre] - Nombre de la empresa
 * @param {Object} [params.detalles] - Payload JSON con detalles adicionales
 * @param {string} [params.ip_address] - Dirección IP del cliente
 */
const registrarAudit = async ({
    accion,
    entidad,
    entidad_id = null,
    usuario_id = null,
    usuario_nombre = null,
    ejecutiva_id = null,
    ejecutiva_nombre = null,
    empresa_id = null,
    empresa_nombre = null,
    detalles = null,
    ip_address = null
}) => {
    try {
        // Calcular flag de acción delegada
        const es_delegada = (usuario_id && ejecutiva_id && usuario_id !== ejecutiva_id) ? true : false;

        const detailsWithFlag = {
            ...detalles,
            es_delegada
        };

        await db.raw(`
            INSERT INTO audit_log (
                accion, entidad, entidad_id,
                usuario_id, usuario_nombre,
                ejecutiva_id, ejecutiva_nombre,
                empresa_id, empresa_nombre,
                detalles, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            accion, entidad, entidad_id,
            usuario_id, usuario_nombre,
            ejecutiva_id, ejecutiva_nombre,
            empresa_id, empresa_nombre,
            JSON.stringify(detailsWithFlag),
            ip_address
        ]);
    } catch (error) {
        // Fire-and-forget: solo loguear, nunca bloquear
        console.error("[AUDIT] Error registrando audit log:", error.message);
    }
};

module.exports = { registrarAudit };
