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
    // Deshabilitamos temporalmente el chequeo estricto porque Render usa NODE_ENV=production por defecto
    // const isProduction = process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_CLEANUP;
    // if (isProduction) {
    //     return res.status(403).json({ error: "Este endpoint no está disponible en producción." });
    // }

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

/**
 * POST /admin/reset-passwords
 * 
 * Resetea masivamente las contraseñas de todos los usuarios a "123".
 * Útil para pruebas en el entorno de desarrollo.
 */
exports.resetPasswords = async (req, res) => {
    // Deshabilitamos temporalmente el chequeo estricto para que funcione en Render
    // const isProduction = process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_CLEANUP;
    // if (isProduction) {
    //     return res.status(403).json({ error: "Este endpoint no está disponible en producción." });
    // }

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
 * 
 * Retorna un resumen completo del estado de la BD para diagnóstico y comparación
 * entre entornos (local vs desarrollo).
 */
exports.diagnostico = async (req, res) => {
    try {
        const userId = req.usuario?.id;
        const userRol = req.usuario?.permisos;
        const result = {};

        // 1. Total reuniones
        const [totalReuniones] = await db.query('SELECT COUNT(*) as total FROM reuniones');
        result.reuniones_total = totalReuniones[0].total;

        // 2. Reuniones por estado
        const [porEstado] = await db.query('SELECT estado_envio, COUNT(*) as total FROM reuniones GROUP BY estado_envio ORDER BY total DESC');
        result.reuniones_por_estado = porEstado;

        // 3. Reuniones Teams vs manuales
        const [conEventId] = await db.query('SELECT COUNT(*) as total FROM reuniones WHERE event_id IS NOT NULL');
        const [sinEventId] = await db.query('SELECT COUNT(*) as total FROM reuniones WHERE event_id IS NULL');
        result.reuniones_con_event_id = conEventId[0].total;
        result.reuniones_sin_event_id = sinEventId[0].total;

        // 4. Huérfanas
        const [totalHuerfanas] = await db.query('SELECT COUNT(*) as total FROM reuniones_huerfanas');
        const [huerfanasPorEstado] = await db.query('SELECT estado, COUNT(*) as total FROM reuniones_huerfanas GROUP BY estado ORDER BY total DESC');
        result.huerfanas_total = totalHuerfanas[0].total;
        result.huerfanas_por_estado = huerfanasPorEstado;

        // 5. Usuario actual
        result.usuario = { id: userId, permisos: userRol };

        // 6. Reuniones que retorna el endpoint para este usuario
        if (userId && userRol === 'ejecutiva') {
            const [reunionesUser] = await db.query(`
                SELECT r.id, r.id_reunion, r.ejecutiva_id, r.empresa_id, r.tipo_reu,
                       r.fecha_reu, r.estado_envio, r.event_id, r.asunto_teams,
                       emp.nombre AS empresa_nombre
                FROM reuniones r
                LEFT JOIN usuarios e ON r.ejecutiva_id = e.id
                LEFT JOIN empresas emp ON r.empresa_id = emp.id
                LEFT JOIN usuarios j ON emp.jefatura_id = j.id
                WHERE (
                    emp.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)
                    OR emp.jefatura_id IN (
                        SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)
                    )
                    OR r.ejecutiva_id = ?
                )
                ORDER BY r.fecha_reu DESC
            `, [userId, userId, userId]);

            result.reuniones_usuario = {
                total: reunionesUser.length,
                por_estado: {
                    borrador: reunionesUser.filter(r => r.estado_envio === 'borrador').length,
                    enviado: reunionesUser.filter(r => r.estado_envio === 'enviado').length,
                    agendada: reunionesUser.filter(r => r.estado_envio === 'agendada').length,
                    no_aplica: reunionesUser.filter(r => r.estado_envio === 'no_aplica').length,
                },
                primeras_15: reunionesUser.slice(0, 15).map(r => ({
                    fecha: r.fecha_reu,
                    estado: r.estado_envio,
                    empresa_id: r.empresa_id,
                    empresa: r.empresa_nombre || 'SIN EMPRESA',
                    asunto: r.asunto_teams || r.tipo_reu || 'sin asunto',
                    ejecutiva_id: r.ejecutiva_id
                }))
            };

            // Huérfanas del usuario
            const [huerfanasUser] = await db.query(`
                SELECT h.id, h.asunto, h.fecha, h.estado
                FROM reuniones_huerfanas h
                JOIN usuarios u ON h.usuario_id = u.id
                WHERE (
                    u.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)
                    OR h.usuario_id = ?
                )
                AND h.estado IN ('pendiente', 'no_aplica')
                ORDER BY h.fecha DESC
            `, [userId, userId]);

            result.huerfanas_usuario = {
                total: huerfanasUser.length,
                primeras_10: huerfanasUser.slice(0, 10).map(r => ({
                    fecha: r.fecha,
                    estado: r.estado,
                    asunto: r.asunto
                }))
            };
        }

        // 7. Empresas
        const [totalEmpresas] = await db.query('SELECT COUNT(*) as total FROM empresas');
        result.empresas_total = totalEmpresas[0].total;

        // 8. Jefaturas
        const [totalJefaturas] = await db.query("SELECT COUNT(*) as total FROM usuarios WHERE permisos = 'jefatura'");
        result.jefaturas_total = totalJefaturas[0].total;

        // 9. Dominios y contactos
        const [totalDominios] = await db.query('SELECT COUNT(*) as total FROM empresa_dominios');
        const [totalContactos] = await db.query('SELECT COUNT(*) as total FROM empresa_contactos');
        result.dominios_aprendidos = totalDominios[0].total;
        result.contactos_aprendidos = totalContactos[0].total;

        // 10. Encuestas
        const [totalEncuestas] = await db.query('SELECT COUNT(*) as total FROM encuestas');
        result.encuestas_total = totalEncuestas[0].total;

        // 11. Logs de seguimiento
        const [logsPorEstado] = await db.query('SELECT estado, COUNT(*) as total FROM empresa_seguimiento_log GROUP BY estado ORDER BY total DESC');
        result.logs_seguimiento = logsPorEstado;

        // 12. Verificar columnas existentes en reuniones y huerfanas (para validar migraciones)
        const [colsReuniones] = await db.query("SHOW COLUMNS FROM reuniones");
        result.columnas_reuniones = colsReuniones.map(c => c.Field);
        const [colsHuerfanas] = await db.query("SHOW COLUMNS FROM reuniones_huerfanas");
        result.columnas_huerfanas = colsHuerfanas.map(c => c.Field);

        res.json(result);
    } catch (err) {
        console.error("[DIAGNOSTICO] Error:", err);
        res.status(500).json({ error: "Error en diagnóstico: " + err.message });
    }
};
