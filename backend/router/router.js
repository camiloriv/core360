const { Router } = require("express");
const db = require("../bd/connection");
const multer = require("multer");

const router = Router();

// 🔥 MODULOS
router.use("/envios", require("../modules/envios/envios.routes"));
router.use("/respuestas", require("../modules/respuestas/respuestas.routes"));

// 🔥 MULTER
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔹 TEST
router.get("/", (req, res) => {
    res.json({ ok: true, msg: "API funcionando" });
});

// 🔹 EJECUTIVAS
router.get("/ejecutivas", (req, res) => {
    db.query("SELECT * FROM ejecutivas", (err, result) => {
        if (err) return res.status(500).json({ ok: false, error: err });
        res.json({ ok: true, data: result });
    });
});

// 🔹 EMPRESAS (todas)
router.get("/empresas", (req, res) => {
    db.query("SELECT * FROM empresas", (err, result) => {
        if (err) return res.status(500).json({ ok: false, error: err });
        res.json({ ok: true, data: result });
    });
});

// 🔹 EMPRESAS POR EJECUTIVA
router.get("/empresas/ejecutiva/:id", (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT * 
        FROM empresas 
        WHERE id_ejecutiva = ?
    `;

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ ok: false, error: err });
        res.json({ ok: true, data: result });
    });
});

// 🔹 CREAR REUNIÓN
router.post("/reuniones", upload.array("archivos"), (req, res) => {

    const {
        ejecutiva_id,
        enviado_a,
        enviado_por,
        participantes,
        tipo_reu,
        fecha_reu,
        hora,
        lugar,
        documentos_adjuntos,
        motivo_reu,
        minuta,
        form_f,
        empresa_id
    } = req.body;

    if (!ejecutiva_id || !empresa_id || !fecha_reu || !hora) {
        return res.status(400).json({
            ok: false,
            error: "Campos obligatorios faltantes"
        });
    }

    const sql = `
        INSERT INTO reuniones (
            ejecutiva_id,
            enviado_a,
            enviado_por,
            participantes,
            tipo_reu,
            fecha_reu,
            hora,
            lugar,
            documentos_adjuntos,
            motivo_reu,
            minuta,
            form_f,
            empresa_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        ejecutiva_id,
        enviado_a,
        enviado_por,
        participantes,
        tipo_reu,
        fecha_reu,
        hora,
        lugar,
        documentos_adjuntos,
        motivo_reu,
        minuta,
        form_f,
        empresa_id
    ];

    db.query(sql, values, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                ok: false,
                error: "Error al crear reunión"
            });
        }

        res.json({
            ok: true,
            msg: "Reunión creada"
        });
    });

});

// 🔹 LISTAR REUNIONES
router.get("/reuniones", (req, res) => {

    const sql = `
        SELECT r.*, e.nombre AS ejecutiva_nombre, emp.nombre AS empresa_nombre
        FROM reuniones r
        JOIN ejecutivas e ON r.ejecutiva_id = e.id
        JOIN empresas emp ON r.empresa_id = emp.id
        ORDER BY r.created_at DESC
    `;

    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                error: "Error en la BD"
            });
        }

        res.json({ ok: true, data: result });
    });

});

// 🔹 TIPOS DE ENCUESTA (PLANTILLAS)
router.get("/encuestas", (req, res) => {
    db.query("SELECT * FROM encuestas", (err, result) => {

        if (err) {
            console.error("🔥 ERROR SQL:", err);
            return res.status(500).json({
                ok: false,
                error: err.message
            });
        }

        res.json({ ok: true, data: result });
    });
});

module.exports = router;
