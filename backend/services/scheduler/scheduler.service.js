const db = require("../../database/connection");
const { enviarCorreo, enviarCorreoEncuesta } = require("../email/email.service");
const encuestaService = require("../../modules/encuestas/encuestas.service");

const checkAndSendScheduledEmails = async () => {
    try {
        // --- 2. ENCUESTAS PROGRAMADAS ---
        const sqlEncuestas = `
            SELECT 
                r.*, 
                emp.nombre as empresa_nombre,
                e.correo as ejecutiva_correo,
                j.correo as jefatura_correo
            FROM reuniones r
            JOIN empresas emp ON r.empresa_id = emp.id
            JOIN ejecutivas e ON r.ejecutiva_id = e.id
            LEFT JOIN jefaturas j ON e.jefatura_id = j.id
            WHERE r.programar_encuesta = 1 
            AND r.encuesta_estado_envio = 'pendiente' 
            AND r.encuesta_programada_para <= NOW()
        `;

        const [pendingEncuestas] = await db.query(sqlEncuestas);

        for (const data of pendingEncuestas) {
            try {
                // Preparar BCC
                const bcc = [data.ejecutiva_correo, data.jefatura_correo].filter(Boolean).join(',');

                // Generar encuesta
                const resEncuesta = await encuestaService.crearEncuesta({
                    ejecutiva_id: data.ejecutiva_id,
                    empresa_id: data.empresa_id,
                    tipo_encuesta: data.encuesta_tipo,
                    reunion_id: data.id,
                    enviado_a: data.enviado_a
                });

                // Enviar correo
                await enviarCorreoEncuesta(data.enviado_a, resEncuesta.url, bcc);

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
    console.log("🚀 Scheduler de encuestas iniciado (1 min)");
    setInterval(checkAndSendScheduledEmails, 60 * 1000);
};

module.exports = { startScheduler };
