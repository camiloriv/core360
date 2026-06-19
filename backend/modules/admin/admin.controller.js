const db = require("../../database/connection");

/**
 * POST /admin/cleanup-dev
 *
 * Limpia la base de datos del entorno de desarrollo dejando solo:
 *  - reuniones_huerfanas en estado 'pendiente' (reuniones Teams sin empresa asignada)
 *  - reuniones con event_id y estado 'borrador' (reuniones Teams ya matcheadas)
 *
 * Elimina:
 *  - Todas las minutas enviadas (estado_envio = 'enviado')
 *  - Reuniones creadas manualmente (event_id IS NULL)
 *  - Todas las encuestas y sus respuestas
 *  - Logs de empresa en estado 'gestionada' (generados por minutas)
 *  - Resetea estado de empresas a 'pendiente'
 */
exports.cleanupDev = async (req, res) => {
    // Solo permitir en entornos no-produccion
    const isProduction = process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_CLEANUP;
    if (isProduction) {
        return res.status(403).json({ error: "Este endpoint no está disponible en producción." });
    }

    const connection = await db.getConnection();
    const results = {};

    try {
        await connection.beginTransaction();

        // 1. Eliminar respuestas de encuestas
        const [delRespuestas] = await connection.query("DELETE FROM encuesta_respuestas");
        results.encuesta_respuestas_eliminadas = delRespuestas.affectedRows;

        // 2. Eliminar encuestas enviadas (instancias)
        const [delEncuestas] = await connection.query("DELETE FROM encuestas");
        results.encuestas_eliminadas = delEncuestas.affectedRows;

        // 3. Eliminar reuniones creadas manualmente (sin event_id = creadas desde el formulario)
        //    o minutas ya enviadas (estado_envio = 'enviado')
        const [delReunionesManuales] = await connection.query(
            "DELETE FROM reuniones WHERE event_id IS NULL OR estado_envio = 'enviado'"
        );
        results.reuniones_manuales_eliminadas = delReunionesManuales.affectedRows;

        // 4. Eliminar logs de empresa en estado 'gestionada' (generados por minutas)
        const [delLogsGestionada] = await connection.query(
            "DELETE FROM empresa_seguimiento_log WHERE estado = 'gestionada'"
        );
        results.logs_gestionada_eliminados = delLogsGestionada.affectedRows;

        // 5. Limpiar reuniones_huerfanas que ya fueron vinculadas (estado = 'vinculada')
        //    Se mantienen las pendientes e ignoradas (de Teams)
        const [delHuerfanasVinculadas] = await connection.query(
            "DELETE FROM reuniones_huerfanas WHERE estado = 'vinculada'"
        );
        results.huerfanas_vinculadas_eliminadas = delHuerfanasVinculadas.affectedRows;

        // 6. Limpiar borradores de reuniones que quedaron huérfanos
        //    (reuniones con event_id pero sin empresa_id válida ya no son necesarias
        //    porque se van a re-crear desde el sync)
        // Nota: Solo borramos los borradores SIN empresa_id asignada (los que no matchearon)
        // Los que sí tienen empresa_id se mantienen para que el usuario los trabaje
        // const [delBorradores] = await connection.query(
        //     "DELETE FROM reuniones WHERE estado_envio = 'borrador' AND empresa_id IS NULL"
        // );
        // results.borradores_sin_empresa_eliminados = delBorradores.affectedRows;

        // 7. Resetear estado de empresas que dependían de reuniones eliminadas
        //    Solo resetear empresas cuyo estado_seguimiento sea 'gestionada' y ya no tengan reuniones activas
        const [resetEmpresas] = await connection.query(`
            UPDATE empresas 
            SET estado_seguimiento = 'pendiente', fecha_concretada = NULL
            WHERE estado_seguimiento = 'gestionada'
            AND id NOT IN (
                SELECT DISTINCT empresa_id FROM reuniones 
                WHERE empresa_id IS NOT NULL AND estado_envio IN ('enviado', 'borrador')
            )
        `);
        results.empresas_reseteadas = resetEmpresas.affectedRows;

        // 8. Actualizar estado de empresas que tienen reuniones agendadas en Teams
        //    (empresa_seguimiento_log con estado = 'agendada')
        const [updateAgendadas] = await connection.query(`
            UPDATE empresas e
            JOIN (
                SELECT empresa_id, MAX(fecha) as ultima_fecha
                FROM empresa_seguimiento_log
                WHERE estado = 'agendada'
                GROUP BY empresa_id
            ) log ON e.id = log.empresa_id
            SET e.estado_seguimiento = 'agendada'
            WHERE e.estado_seguimiento = 'pendiente'
        `);
        results.empresas_marcadas_agendadas = updateAgendadas.affectedRows;

        // 9. Limpiar contactos y dominios aprendidos de las minutas eliminadas
        //    (opcional - los mantenemos porque son valiosos para el matching futuro)
        // const [delContactos] = await connection.query("DELETE FROM empresa_contactos");
        // const [delDominios] = await connection.query("DELETE FROM empresa_dominios");

        await connection.commit();

        console.log("[CLEANUP DEV] Limpieza completada:", results);
        res.json({
            success: true,
            message: "Limpieza de entorno de desarrollo completada exitosamente.",
            detalles: results
        });

    } catch (err) {
        await connection.rollback();
        console.error("[CLEANUP DEV] Error durante la limpieza:", err);
        res.status(500).json({ error: "Error durante la limpieza: " + err.message });
    } finally {
        connection.release();
    }
};
