const db = require("../../database/connection");

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
    const connection = await db.getConnection();
    const results = {};

    try {
        await connection.beginTransaction();

        // 1. Limpiar minutas (nueva tabla)
        try {
            const [delMinutas] = await connection.query("DELETE FROM minutas");
            results.minutas_eliminadas = delMinutas.affectedRows;
        } catch (e) {
            results.minutas_eliminadas = 0; // tabla puede no existir aún
        }

        // 2. Limpiar teams_eventos (nueva tabla)
        try {
            const [delTeams] = await connection.query("DELETE FROM teams_eventos");
            results.teams_eventos_eliminados = delTeams.affectedRows;
        } catch (e) {
            results.teams_eventos_eliminados = 0;
        }

        // 3. Limpiar tabla legacy 'reuniones' (si existe)
        try {
            const [delReu] = await connection.query("DELETE FROM reuniones");
            results.reuniones_legacy_eliminadas = delReu.affectedRows;
        } catch (e) {
            results.reuniones_legacy_eliminadas = 0;
        }

        // 4. Limpiar tabla legacy 'reuniones_huerfanas' (si existe)
        try {
            const [delHuerfanas] = await connection.query("DELETE FROM reuniones_huerfanas");
            results.huerfanas_legacy_eliminadas = delHuerfanas.affectedRows;
        } catch (e) {
            results.huerfanas_legacy_eliminadas = 0;
        }

        // 5. Limpiar empresa_seguimiento_log
        const [delLog] = await connection.query("DELETE FROM empresa_seguimiento_log");
        results.logs_seguimiento_eliminados = delLog.affectedRows;

        // 6. Limpiar encuestas y respuestas relacionadas a reuniones
        try {
            const [delRespuestas] = await connection.query("DELETE FROM encuesta_respuestas");
            results.encuesta_respuestas_eliminadas = delRespuestas.affectedRows;
        } catch (e) {
            results.encuesta_respuestas_eliminadas = 0;
        }
        try {
            const [delEncuestas] = await connection.query("DELETE FROM encuestas");
            results.encuestas_eliminadas = delEncuestas.affectedRows;
        } catch (e) {
            results.encuestas_eliminadas = 0;
        }

        // 7. Limpiar sync_log
        try {
            await connection.query("DELETE FROM sync_log");
            results.sync_log_limpiado = true;
        } catch (e) {
            results.sync_log_limpiado = false;
        }

        // 8. Resetear sync_delta_token para forzar sync completo desde Teams
        const [resetTokens] = await connection.query(
            "UPDATE usuarios SET sync_delta_token = NULL, ultima_sincronizacion = NULL"
        );
        results.delta_tokens_reseteados = resetTokens.affectedRows;

        // 9. Resetear estado de empresas a 'pendiente'
        const [resetEmpresas] = await connection.query(
            "UPDATE empresas SET estado_seguimiento = 'pendiente', fecha_concretada = NULL, fecha_solicitada = NULL"
        );
        results.empresas_reseteadas = resetEmpresas.affectedRows;

        await connection.commit();

        console.log("[RESET MEETING DATA] Limpieza completada:", results);
        res.json({
            success: true,
            message: "✅ Limpieza completa. El sistema está en blanco y listo para sincronizar desde Teams.",
            detalles: results
        });

    } catch (err) {
        await connection.rollback();
        console.error("[RESET MEETING DATA] Error:", err);
        res.status(500).json({ error: "Error durante la limpieza: " + err.message });
    } finally {
        connection.release();
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
        const [result] = await db.query('UPDATE usuarios SET contrasena = ?', [hashed]);

        res.json({
            success: true,
            message: `Contraseñas reseteadas a '123' exitosamente.`,
            usuariosAfectados: result.affectedRows
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
        result.arquitectura = "v2 — teams_eventos + minutas";

        // === NUEVA ARQUITECTURA ===
        try {
            const [totalTE] = await db.query('SELECT COUNT(*) AS total FROM teams_eventos');
            result.teams_eventos_total = totalTE[0].total;

            const [tePorEstado] = await db.query('SELECT estado, COUNT(*) AS total FROM teams_eventos GROUP BY estado ORDER BY total DESC');
            result.teams_eventos_por_estado = tePorEstado;

            const [sinEmpresa] = await db.query('SELECT COUNT(*) AS total FROM teams_eventos WHERE empresa_id IS NULL');
            result.teams_eventos_sin_empresa = sinEmpresa[0].total;
        } catch (e) {
            result.teams_eventos_total = 'tabla no existe aún';
        }

        try {
            const [totalM] = await db.query('SELECT COUNT(*) AS total FROM minutas');
            result.minutas_total = totalM[0].total;

            const [mPorEstado] = await db.query('SELECT estado_envio, COUNT(*) AS total FROM minutas GROUP BY estado_envio ORDER BY total DESC');
            result.minutas_por_estado = mPorEstado;
        } catch (e) {
            result.minutas_total = 'tabla no existe aún';
        }

        // === SYNC STATUS ===
        try {
            const [syncRows] = await db.query('SELECT tipo, ejecutado_at, resultado FROM sync_log ORDER BY id DESC LIMIT 5');
            result.sync_log_reciente = syncRows;
        } catch (e) {
            result.sync_log_reciente = [];
        }

        const [usersSync] = await db.query('SELECT id, correo, ultima_sincronizacion, CASE WHEN sync_delta_token IS NOT NULL THEN "con token" ELSE "sin token" END AS token_status FROM usuarios WHERE correo IS NOT NULL');
        result.usuarios_sync_status = usersSync;

        // === EMPRESAS ===
        const [totalEmpresas] = await db.query('SELECT COUNT(*) AS total FROM empresas');
        result.empresas_total = totalEmpresas[0].total;

        const [empPorEstado] = await db.query('SELECT estado_seguimiento, COUNT(*) AS total FROM empresas GROUP BY estado_seguimiento ORDER BY total DESC');
        result.empresas_por_estado = empPorEstado;

        // === DOMINIOS Y CONTACTOS ===
        const [totalDominios] = await db.query('SELECT COUNT(*) AS total FROM empresa_dominios');
        const [totalContactos] = await db.query('SELECT COUNT(*) AS total FROM empresa_contactos');
        result.dominios_aprendidos = totalDominios[0].total;
        result.contactos_aprendidos = totalContactos[0].total;

        // === LEGACY ===
        try {
            const [totalReuLegacy] = await db.query('SELECT COUNT(*) AS total FROM reuniones');
            result.reuniones_legacy = totalReuLegacy[0].total;
        } catch (e) {
            result.reuniones_legacy = 'tabla eliminada';
        }

        try {
            const [totalHLegacy] = await db.query('SELECT COUNT(*) AS total FROM reuniones_huerfanas');
            result.huerfanas_legacy = totalHLegacy[0].total;
        } catch (e) {
            result.huerfanas_legacy = 'tabla eliminada';
        }

        res.json(result);
    } catch (err) {
        console.error("[DIAGNOSTICO] Error:", err);
        res.status(500).json({ error: "Error en diagnóstico: " + err.message });
    }
};
