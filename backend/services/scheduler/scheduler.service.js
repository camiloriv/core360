const db = require("../../database/connection");
const { enviarCorreo, enviarCorreoEncuesta } = require("../email/email.service");
const encuestaService = require("../../modules/encuestas/encuestas.service");
const agendamientoController = require("../../modules/agendamiento/agendamiento.controller");

const checkAndSendScheduledEmails = async () => {
    try {
        // --- 2. ENCUESTAS PROGRAMADAS ---
        const sqlEncuestas = `
            SELECT 
                r.*, 
                emp.nombre as empresa_nombre,
                z.nombre as zona_nombre,
                e.correo as ejecutiva_correo,
                j.correo as jefatura_correo
            FROM reuniones r
            JOIN empresas emp ON r.empresa_id = emp.id
            LEFT JOIN zonas z ON emp.zona_id = z.id
            JOIN usuarios e ON r.ejecutiva_id = e.id
            LEFT JOIN usuarios j ON e.jefatura_id = j.id
            WHERE r.programar_encuesta = 1 
            AND r.encuesta_estado_envio = 'pendiente' 
            AND r.encuesta_programada_para <= NOW()
        `;

        const [pendingEncuestas] = await db.query(sqlEncuestas);

        for (const data of pendingEncuestas) {
            try {
                // Preparar BCC
                const bccArray = [data.ejecutiva_correo, data.jefatura_correo];
                const isTest = data.empresa_nombre?.toLowerCase().includes("demo") || 
                               data.empresa_nombre?.toLowerCase().includes("prueba") || 
                               data.enviado_por?.toLowerCase().includes("prueba") ||
                               data.ejecutiva_correo?.toLowerCase().includes("prueba");

                if (data.zona_nombre && data.zona_nombre.toLowerCase().includes("matriz") && !isTest) {
                    const [gerenteRows] = await db.query("SELECT correo FROM usuarios WHERE nombre = 'Lilian Ortega' LIMIT 1");
                    const lilianCorreo = gerenteRows[0]?.correo || "lortega@proforma.cl";
                    bccArray.push(lilianCorreo);
                }
                const bcc = [...new Set(bccArray.filter(Boolean))].join(',');

                // Generar encuesta
                const resEncuesta = await encuestaService.crearEncuesta({
                    ejecutiva_id: data.ejecutiva_id,
                    empresa_id: data.empresa_id,
                    tipo_encuesta: data.encuesta_tipo,
                    reunion_id: data.id,
                    enviado_a: data.encuesta_destinatario || data.enviado_a
                });

                // Enviar correo
                await enviarCorreoEncuesta(data.encuesta_destinatario || data.enviado_a, resEncuesta.url, bcc);

                // Marcar como enviado
                await db.query("UPDATE reuniones SET encuesta_estado_envio = 'enviado' WHERE id = ?", [data.id]);
                console.log(`✅ Encuesta ${data.encuesta_tipo} para ${data.empresa_nombre} enviada.`);
            } catch (error) {
                console.error(`❌ Error encuesta ${data.id_reunion}:`, error);
                await db.query("UPDATE reuniones SET encuesta_estado_envio = 'error' WHERE id = ?", [data.id]);
            }
        }

    } catch (error) {
        console.error("🔥 Error scheduler:", error);
    }
};

// Iniciar el scheduler cada 1 minuto
const startScheduler = () => {
    console.log("🚀 Scheduler de encuestas y sincronización iniciado (1 min)");
    setInterval(() => {
        checkAndSendScheduledEmails();
        checkAndRunDailySync();
    }, 60 * 1000);
};

const checkAndRunDailySync = async () => {
    try {
        const now = new Date();
        // Ejecutar a las 3 AM y 0 minutos (madrugada). El setInterval de 1 minuto asegura que pase una vez
        if (now.getHours() === 3 && now.getMinutes() === 0) {
            console.log("⏳ Iniciando sincronización masiva diaria de eventos de Microsoft Graph...");
            const [usuarios] = await db.query("SELECT id, correo FROM usuarios WHERE correo IS NOT NULL");
            for (const u of usuarios) {
                try {
                    const req = { usuario: { id: u.id, correo: u.correo } };
                    const res = { status: () => res, json: () => {} };
                    await agendamientoController.syncEventosPasados(req, res);
                } catch (e) {
                    console.error("❌ Error sincronizando a", u.correo, e);
                }
            }
            console.log("✅ Sincronización masiva diaria completada.");
        }
    } catch (e) {
        console.error("🔥 Error en checkAndRunDailySync", e);
    }
};

module.exports = { startScheduler };
