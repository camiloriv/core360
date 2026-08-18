const db = require("../../database/knex");

/**
 * POST /admin/reset-meeting-data
 *
 * Limpieza total de datos de reuniones para empezar en blanco.
 * Elimina:
 *   - teams_eventos (si existe)
 *   - minutas (si existe)
 *   - reuniones (tabla legacy, si existe)
 *   - reuniones_huerfanas (tabla legacy, si existe)
 *   - empresa_seguimiento_log
 *   - Resetea sync_delta_token de todos los usuarios
 *   - Resetea estado_seguimiento de empresas a 'pendiente'
 */
exports.resetMeetingData = async (req, res) => {
    const results = {};

    try {
        await db.transaction(async (trx) => {
            // 1. Limpiar minutas (nueva tabla)
            try {
                results.minutas_eliminadas = await trx('minutas').del();
            } catch (e) {
                results.minutas_eliminadas = 0; // tabla puede no existir aún
            }

            // 2. Limpiar teams_eventos (nueva tabla)
            try {
                results.teams_eventos_eliminados = await trx('teams_eventos').del();
            } catch (e) {
                results.teams_eventos_eliminados = 0;
            }

            // 3. Limpiar tabla legacy 'reuniones' (si existe)
            try {
                results.reuniones_legacy_eliminadas = await trx('reuniones').del();
            } catch (e) {
                results.reuniones_legacy_eliminadas = 0;
            }

            // 4. Limpiar tabla legacy 'reuniones_huerfanas' (si existe)
            try {
                results.huerfanas_legacy_eliminadas = await trx('reuniones_huerfanas').del();
            } catch (e) {
                results.huerfanas_legacy_eliminadas = 0;
            }

            // 5. Limpiar empresa_seguimiento_log
            try {
                results.logs_seguimiento_eliminados = await trx('empresa_seguimiento_log').del();
            } catch (e) {
                results.logs_seguimiento_eliminados = 0;
            }

            // 6. Limpiar encuestas y respuestas relacionadas a reuniones
            try {
                results.encuesta_respuestas_eliminadas = await trx('encuesta_respuestas').del();
            } catch (e) {
                results.encuesta_respuestas_eliminadas = 0;
            }
            try {
                results.encuestas_eliminadas = await trx('encuestas').del();
            } catch (e) {
                results.encuestas_eliminadas = 0;
            }

            // 7. Limpiar sync_log
            try {
                await trx('sync_log').del();
                results.sync_log_limpiado = true;
            } catch (e) {
                results.sync_log_limpiado = false;
            }

            // 8. Resetear sync_delta_token para forzar sync completo desde Teams
            results.delta_tokens_reseteados = await trx('usuarios')
                .update({ sync_delta_token: null, ultima_sincronizacion: null });

            // 9. Resetear estado de empresas a 'pendiente'
            results.empresas_reseteadas = await trx('empresas')
                .update({ estado_seguimiento: 'pendiente', fecha_concretada: null, fecha_solicitada: null });
        });

        console.log("[RESET MEETING DATA] Limpieza completada:", results);
        res.json({
            success: true,
            message: "✅ Limpieza completa. El sistema está en blanco y listo para sincronizar desde Teams.",
            detalles: results
        });

    } catch (err) {
        console.error("[RESET MEETING DATA] Error:", err);
        res.status(500).json({ error: "Error durante la limpieza: " + err.message });
    }
};

/**
 * POST /admin/cleanup-dev
 * (Mantenido por compatibilidad, ahora apunta a reset-meeting-data)
 */
exports.cleanupDev = exports.resetMeetingData;

/**
 * POST /admin/reset-passwords
 */
exports.resetPasswords = async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const hashed = await bcrypt.hash('123', 10);
        const afectadas = await db('usuarios').update({ contrasena: hashed });

        res.json({
            success: true,
            message: `Contraseñas reseteadas a '123' exitosamente.`,
            usuariosAfectados: afectadas
        });
    } catch (err) {
        console.error("[RESET PASSWORDS] Error:", err);
        res.status(500).json({ error: "Error reseteando contraseñas: " + err.message });
    }
};

/**
 * GET /admin/diagnostico
 * Diagnóstico actualizado para nueva arquitectura
 */
exports.diagnostico = async (req, res) => {
    try {
        const userId = req.usuario?.id;
        const userRol = req.usuario?.permisos;
        const result = {};

        result.usuario = { id: userId, permisos: userRol };
        result.arquitectura = "v2 — teams_eventos + minutas (Knex)";

        // === NUEVA ARQUITECTURA ===
        try {
            const totalTE = await db('teams_eventos').count('* as total').first();
            result.teams_eventos_total = totalTE?.total || 0;

            result.teams_eventos_por_estado = await db('teams_eventos')
                .select('estado')
                .count('* as total')
                .groupBy('estado')
                .orderBy('total', 'desc');

            const sinEmpresa = await db('teams_eventos')
                .whereNull('empresa_id')
                .count('* as total').first();
            result.teams_eventos_sin_empresa = sinEmpresa?.total || 0;
        } catch (e) {
            result.teams_eventos_total = 'tabla no existe aún';
        }

        try {
            const totalM = await db('minutas').count('* as total').first();
            result.minutas_total = totalM?.total || 0;

            result.minutas_por_estado = await db('minutas')
                .select('estado_envio')
                .count('* as total')
                .groupBy('estado_envio')
                .orderBy('total', 'desc');
        } catch (e) {
            result.minutas_total = 'tabla no existe aún';
        }

        // === SYNC STATUS ===
        try {
            result.sync_log_reciente = await db('sync_log')
                .select('tipo', 'ejecutado_at', 'resultado')
                .orderBy('id', 'desc')
                .limit(5);
        } catch (e) {
            result.sync_log_reciente = [];
        }

        result.usuarios_sync_status = await db.raw(`
            SELECT id, correo, ultima_sincronizacion, 
            CASE WHEN sync_delta_token IS NOT NULL THEN 'con token' ELSE 'sin token' END AS token_status 
            FROM usuarios WHERE correo IS NOT NULL
        `);

        // === EMPRESAS ===
        const totalEmpresas = await db('empresas').count('* as total').first();
        result.empresas_total = totalEmpresas?.total || 0;

        result.empresas_por_estado = await db('empresas')
            .select('estado_seguimiento')
            .count('* as total')
            .groupBy('estado_seguimiento')
            .orderBy('total', 'desc');

        // === DOMINIOS Y CONTACTOS ===
        const totalDominios = await db('empresa_dominios').count('* as total').first();
        const totalContactos = await db('empresa_contactos').count('* as total').first();
        result.dominios_aprendidos = totalDominios?.total || 0;
        result.contactos_aprendidos = totalContactos?.total || 0;

        // === LEGACY ===
        try {
            const totalReuLegacy = await db('reuniones').count('* as total').first();
            result.reuniones_legacy = totalReuLegacy?.total || 0;
        } catch (e) {
            result.reuniones_legacy = 'tabla eliminada';
        }

        try {
            const totalHLegacy = await db('reuniones_huerfanas').count('* as total').first();
            result.huerfanas_legacy = totalHLegacy?.total || 0;
        } catch (e) {
            result.huerfanas_legacy = 'tabla eliminada';
        }

        res.json(result);
    } catch (err) {
        console.error("[DIAGNOSTICO] Error:", err);
        res.status(500).json({ error: "Error en diagnóstico: " + err.message });
    }
};
