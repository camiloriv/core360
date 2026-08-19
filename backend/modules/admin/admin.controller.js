const adminRepository = require("../../database/repositories/admin.repository");

exports.resetMeetingData = async (req, res) => {
    try {
        const results = await adminRepository.resetMeetingData();
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

exports.cleanupDev = exports.resetMeetingData;

exports.resetPasswords = async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const hashed = await bcrypt.hash('123', 10);
        
        const afectados = await adminRepository.resetPasswords(hashed);
        
        res.json({
            success: true,
            message: `Contraseñas reseteadas a '123' exitosamente.`,
            usuariosAfectados: afectados
        });
    } catch (err) {
        console.error("[RESET PASSWORDS] Error:", err);
        res.status(500).json({ error: "Error reseteando contraseñas: " + err.message });
    }
};

exports.diagnostico = async (req, res) => {
    try {
        const userId = req.usuario?.id;
        const userRol = req.usuario?.permisos;
        
        const stats = await adminRepository.getDiagnosticoStats();
        
        const result = {
            usuario: { id: userId, permisos: userRol },
            arquitectura: "v2 — teams_eventos + minutas (mssql puro)",
            ...stats
        };

        res.json(result);
    } catch (err) {
        console.error("[DIAGNOSTICO] Error:", err);
        res.status(500).json({ error: "Error en diagnóstico: " + err.message });
    }
};
