const db = require("../database/connection");

async function resetAll() {
    try {
        console.log("Iniciando reseteo total de reuniones y logs...");

        // 0. Crear respaldos (Backups) antes de borrar
        console.log("Creando tablas de respaldo de seguridad...");
        await db.query("DROP TABLE IF EXISTS reuniones_bkp");
        await db.query("CREATE TABLE reuniones_bkp AS SELECT * FROM reuniones");
        
        await db.query("DROP TABLE IF EXISTS reuniones_huerfanas_bkp");
        await db.query("CREATE TABLE reuniones_huerfanas_bkp AS SELECT * FROM reuniones_huerfanas");
        
        await db.query("DROP TABLE IF EXISTS empresa_seguimiento_log_bkp");
        await db.query("CREATE TABLE empresa_seguimiento_log_bkp AS SELECT * FROM empresa_seguimiento_log");
        
        await db.query("DROP TABLE IF EXISTS usuarios_bkp");
        await db.query("CREATE TABLE usuarios_bkp AS SELECT id, sync_delta_token, ultima_sincronizacion FROM usuarios");
        
        console.log("✅ Respaldos creados exitosamente (terminación _bkp).");

        // 1. Borrar tabla de reuniones
        const [resReuniones] = await db.query("DELETE FROM reuniones");
        console.log(`Reuniones eliminadas: ${resReuniones.affectedRows}`);

        // 2. Borrar tabla de reuniones huérfanas
        const [resHuerfanas] = await db.query("DELETE FROM reuniones_huerfanas");
        console.log(`Reuniones huérfanas eliminadas: ${resHuerfanas.affectedRows}`);

        // 3. Borrar tabla de logs de seguimiento de empresas
        const [resLogs] = await db.query("DELETE FROM empresa_seguimiento_log");
        console.log(`Logs de seguimiento eliminados: ${resLogs.affectedRows}`);

        // 4. Limpiar los tokens de sincronización para obligar a traer el historial completo
        const [resUsuarios] = await db.query("UPDATE usuarios SET sync_delta_token = NULL, ultima_sincronizacion = NULL");
        console.log(`Tokens de sincronización borrados de ${resUsuarios.affectedRows} usuarios.`);

        console.log("¡Reseteo completado con éxito! La próxima vez que un usuario inicie sesión, su calendario se sincronizará desde cero.");
    } catch (error) {
        console.error("Error durante el reseteo:", error);
    } finally {
        process.exit(0);
    }
}

resetAll();
