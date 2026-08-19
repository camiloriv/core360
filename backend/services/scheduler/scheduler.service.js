const cron = require("node-cron");
const { sql, poolPromise } = require("../../database/mssql");
const { enviarCorreo, enviarCorreoEncuesta } = require("../email/email.service");
const encuestaService = require("../../modules/encuestas/encuestas.service");
const agendamientoController = require("../../modules/agendamiento/agendamiento.controller");
const fs = require('fs');
const path = require('path');

// ============================================================
// SCHEDULER DE ENCUESTAS: cada 1 minuto
// ============================================================
const checkAndSendScheduledEmails = async () => {
    try {
        const sqlEncuestas = `
            SELECT 
                m.*, 
                emp.nombre AS empresa_nombre,
                z.nombre AS zona_nombre,
                e.correo AS ejecutiva_correo,
                j.correo AS jefatura_correo
            FROM minutas m
            JOIN empresas emp ON m.empresa_id = emp.id
            LEFT JOIN zonas z ON emp.zona_id = z.id
            JOIN usuarios e ON m.ejecutiva_id = e.id
            LEFT JOIN usuarios j ON e.jefatura_id = j.id
            WHERE m.programar_encuesta = 1 
            AND m.encuesta_estado_envio = 'pendiente' 
            AND m.encuesta_programada_para <= GETDATE()
        `;

        const pool = await poolPromise;
        const pendingRes = await pool.request().query(sqlEncuestas);
        const pendingEncuestas = pendingRes.recordset;

        for (const data of pendingEncuestas) {
            try {
                const bccArray = [data.ejecutiva_correo, data.jefatura_correo];
                const isTest = data.empresa_nombre?.toLowerCase().includes("demo") ||
                               data.empresa_nombre?.toLowerCase().includes("prueba") ||
                               data.ejecutiva_correo?.toLowerCase().includes("prueba");

                if (data.zona_nombre && data.zona_nombre.toLowerCase().includes("matriz") && !isTest) {
                    const gerenteRows = await pool.request().query("SELECT TOP 1 correo FROM usuarios WHERE nombre = 'Lilian Ortega'");
                    const lilianCorreo = gerenteRows.recordset[0]?.correo || "lortega@proforma.cl";
                    bccArray.push(lilianCorreo);
                }
                const bcc = [...new Set(bccArray.filter(Boolean))].join(',');

                const resEncuesta = await encuestaService.crearEncuesta({
                    ejecutiva_id: data.ejecutiva_id,
                    empresa_id: data.empresa_id,
                    tipo_encuesta: data.encuesta_tipo,
                    reunion_id: data.id,
                    enviado_a: data.encuesta_destinatario || data.enviado_a
                });

                await enviarCorreoEncuesta(data.encuesta_destinatario || data.enviado_a, resEncuesta.url, bcc);
                await pool.request()
                    .input('id', sql.Int, data.id)
                    .query("UPDATE minutas SET encuesta_estado_envio = 'enviado' WHERE id = @id");

                console.log(`✅ Encuesta \${data.encuesta_tipo} para \${data.empresa_nombre} enviada.`);
            } catch (error) {
                console.error(`❌ Error encuesta \${data.id_minuta}:`, error);
                await pool.request()
                    .input('id', sql.Int, data.id)
                    .query("UPDATE minutas SET encuesta_estado_envio = 'error' WHERE id = @id");
            }
        }
    } catch (error) {
        console.error("🔥 Error scheduler encuestas:", error);
    }
};

// ============================================================
// SINCRONIZACIÓN DIARIA CON TEAMS: todos los días a las 3:00 AM
// Usa node-cron para garantizar ejecución sin depender de setInterval
// ============================================================
const runDailySync = async () => {
    console.log("⏳ Iniciando sincronización diaria con Microsoft Graph...");

    try {
        const pool = await poolPromise;
        const today = new Date().toISOString().split('T')[0];
        const lastSyncRes = await pool.request()
            .input('today', sql.Date, today)
            .query("SELECT TOP 1 id FROM sync_log WHERE tipo = 'diaria' AND CAST(ejecutado_at AS DATE) = @today");

        if (lastSyncRes.recordset.length > 0) {
            console.log("⏭️ Sincronización diaria ya ejecutada hoy. Omitiendo.");
            return;
        }

        const insertResult = await pool.request().query("INSERT INTO sync_log (tipo, ejecutado_at, resultado) OUTPUT inserted.id VALUES ('diaria', GETDATE(), 'en_progreso')");
        const syncLogId = insertResult.recordset[0]?.id;

        let totalProcesados = 0;
        let errores = 0;

        const usuariosRes = await pool.request().query("SELECT id, correo FROM usuarios WHERE correo IS NOT NULL AND correo != ''");
        const usuarios = usuariosRes.recordset;

        for (const u of usuarios) {
            try {
                let responseData = null;
                const mockReq = { usuario: { id: u.id, correo: u.correo } };
                const mockRes = {
                    headersSent: false,
                    status: function() { return this; },
                    json: function(data) {
                        responseData = data;
                        this.headersSent = true;
                    }
                };

                await agendamientoController.syncEventosPasados(mockReq, mockRes);

                if (responseData?.procesados) {
                    totalProcesados += responseData.procesados;
                }
            } catch (e) {
                console.error(`❌ Error sincronizando a \${u.correo}:`, e.message);
                errores++;
            }
        }

        await pool.request()
            .input('resultado', sql.VarChar, `completada: \${totalProcesados} procesados, \${errores} errores`)
            .input('id', sql.Int, syncLogId)
            .query("UPDATE sync_log SET resultado = @resultado WHERE id = @id");

        console.log(`✅ Sincronización diaria completada. \${totalProcesados} eventos procesados, \${errores} errores.`);
    } catch (error) {
        console.error("🔥 Error en runDailySync:", error);
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('msg', sql.VarChar, error.message)
                .query("INSERT INTO sync_log (tipo, ejecutado_at, resultado) VALUES ('diaria_error', GETDATE(), @msg)");
        } catch (e) { /* ignore */ }
    }
};

// ============================================================
// ACTUALIZAR ESTADOS PASADOS: cada 15 minutos
// Marca como 'pasada' cualquier reunión cuya hora_fin ya pasó
// No hace llamadas a Graph API — solo actualiza la BD local
// ============================================================
const actualizarEstadosPasados = async () => {
    try {
        const pool = await poolPromise;
        const now = new Date();

        const chileDateParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santiago',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(now);
        const currentDateChile = `\${chileDateParts.find(p => p.type === 'year').value}-\${chileDateParts.find(p => p.type === 'month').value}-\${chileDateParts.find(p => p.type === 'day').value}`;
        
        const currentTimeChile = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Santiago',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(now);

        const result = await pool.request()
            .input('currentDate', sql.Date, currentDateChile)
            .input('currentTime', sql.Time, currentTimeChile)
            .query(`
                UPDATE teams_eventos
                SET estado = 'pasada'
                WHERE estado = 'agendada'
                  AND (fecha < @currentDate OR (fecha = @currentDate AND (hora_fin IS NULL OR hora_fin <= @currentTime)))
            `);

        if (true) {
            console.log(`🕐 Estado actualizado: \${result.rowsAffected[0]} reunión(es) marcada(s) como 'pasada'.`);
        }
    } catch (error) {
        console.error('❌ Error en actualizarEstadosPasados:', error);
    }
};

// ============================================================
// LIMPIEZA DE UPLOADS: todos los días a las 4:00 AM
// Elimina archivos mayores a 7 días en la carpeta uploads
// ============================================================
const cleanOldUploads = () => {
    console.log("🧹 Iniciando limpieza de archivos temporales (uploads) > 7 días...");
    try {
        const uploadsDir = path.resolve(__dirname, "../../uploads");
        if (!fs.existsSync(uploadsDir)) return;

        const files = fs.readdirSync(uploadsDir);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        files.forEach(file => {
            if (file === '.gitkeep') return;
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            
            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        });

        console.log(`✅ Limpieza completada. Se eliminaron \${deletedCount} archivos temporales.`);
    } catch (error) {
        console.error("❌ Error en cleanOldUploads:", error);
    }
};

// ============================================================
// INICIAR SCHEDULERS
// ============================================================
const startScheduler = () => {
    cron.schedule('* * * * *', () => {
        checkAndSendScheduledEmails();
    }, { timezone: 'America/Santiago' });

    cron.schedule('*/15 * * * *', () => {
        actualizarEstadosPasados();
    }, { timezone: 'America/Santiago' });

    cron.schedule('0 3 * * *', () => {
        runDailySync();
    }, { timezone: 'America/Santiago' });

    cron.schedule('0 4 * * *', () => {
        cleanOldUploads();
    }, { timezone: 'America/Santiago' });

    console.log("⏰ Schedulers iniciados:");
    console.log("   👉 Encuestas programadas: cada minuto");
    console.log("   🕐 Estado 'pasada' en tiempo real: cada 15 minutos (America/Santiago)");
    console.log("   👉 Sync Teams → teams_eventos: diariamente a las 3:00 AM (America/Santiago)");
    console.log("   🧹 Limpieza de uploads > 7 días: diariamente a las 4:00 AM (America/Santiago)");
};

module.exports = { startScheduler, runDailySync };
