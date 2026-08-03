const cron = require("node-cron");
const db = require("../../database/connection");
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
            AND m.encuesta_programada_para <= NOW()
        `;

        const [pendingEncuestas] = await db.query(sqlEncuestas);

        for (const data of pendingEncuestas) {
            try {
                const bccArray = [data.ejecutiva_correo, data.jefatura_correo];
                const isTest = data.empresa_nombre?.toLowerCase().includes("demo") ||
                               data.empresa_nombre?.toLowerCase().includes("prueba") ||
                               data.ejecutiva_correo?.toLowerCase().includes("prueba");

                if (data.zona_nombre && data.zona_nombre.toLowerCase().includes("matriz") && !isTest) {
                    const [gerenteRows] = await db.query("SELECT correo FROM usuarios WHERE nombre = 'Lilian Ortega' LIMIT 1");
                    const lilianCorreo = gerenteRows[0]?.correo || "lortega@proforma.cl";
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
                await db.query("UPDATE minutas SET encuesta_estado_envio = 'enviado' WHERE id = ?", [data.id]);

                console.log(`✅ Encuesta ${data.encuesta_tipo} para ${data.empresa_nombre} enviada.`);
            } catch (error) {
                console.error(`❌ Error encuesta ${data.id_minuta}:`, error);
                await db.query("UPDATE minutas SET encuesta_estado_envio = 'error' WHERE id = ?", [data.id]);
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
        // Evitar doble ejecución: verificar si ya corrió hoy
        const today = new Date().toISOString().split('T')[0];
        const [lastSync] = await db.query(
            "SELECT id FROM sync_log WHERE tipo = 'diaria' AND DATE(ejecutado_at) = ? LIMIT 1",
            [today]
        );

        if (lastSync.length > 0) {
            console.log("⏭️ Sincronización diaria ya ejecutada hoy. Omitiendo.");
            return;
        }

        // Registrar inicio en sync_log
        const [insertResult] = await db.query(
            "INSERT INTO sync_log (tipo, ejecutado_at, resultado) VALUES ('diaria', NOW(), 'en_progreso')"
        );
        const syncLogId = insertResult.insertId;

        let totalProcesados = 0;
        let errores = 0;

        const [usuarios] = await db.query(
            "SELECT id, correo FROM usuarios WHERE correo IS NOT NULL AND correo != ''"
        );

        for (const u of usuarios) {
            try {
                // Simular req/res para reutilizar el controller
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
                console.error(`❌ Error sincronizando a ${u.correo}:`, e.message);
                errores++;
            }
        }

        // Actualizar resultado en sync_log
        await db.query(
            "UPDATE sync_log SET resultado = ? WHERE id = ?",
            [`completada: ${totalProcesados} procesados, ${errores} errores`, syncLogId]
        );

        console.log(`✅ Sincronización diaria completada. ${totalProcesados} eventos procesados, ${errores} errores.`);
    } catch (error) {
        console.error("🔥 Error en runDailySync:", error);
        try {
            await db.query(
                "INSERT INTO sync_log (tipo, ejecutado_at, resultado) VALUES ('diaria_error', NOW(), ?)",
                [error.message]
            );
        } catch (e) { /* ignore */ }
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
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días en ms
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

        console.log(`✅ Limpieza completada. Se eliminaron ${deletedCount} archivos temporales.`);
    } catch (error) {
        console.error("❌ Error en cleanOldUploads:", error);
    }
};

// ============================================================
// INICIAR SCHEDULERS
// ============================================================
const startScheduler = () => {
    // 1. Encuestas programadas: cada 1 minuto
    cron.schedule('* * * * *', () => {
        checkAndSendScheduledEmails();
    }, { timezone: 'America/Santiago' });

    // 2. Sincronización Teams: todos los días a las 3:00 AM (hora de Santiago)
    cron.schedule('0 3 * * *', () => {
        runDailySync();
    }, { timezone: 'America/Santiago' });

    // 3. Limpieza de archivos temporales: todos los días a las 4:00 AM
    cron.schedule('0 4 * * *', () => {
        cleanOldUploads();
    }, { timezone: 'America/Santiago' });

    console.log("⏰ Schedulers iniciados:");
    console.log("   👉 Encuestas programadas: cada minuto");
    console.log("   👉 Sync Teams → teams_eventos: diariamente a las 3:00 AM (America/Santiago)");
    console.log("   🧹 Limpieza de uploads > 7 días: diariamente a las 4:00 AM (America/Santiago)");
};

module.exports = { startScheduler, runDailySync };
