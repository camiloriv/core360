const { Router } = require("express");
const multer = require("multer");
const reunionesController = require("./reuniones.controller");

const router = Router();

// 🔥 MULTER
const path = require("path");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.resolve(__dirname, "../../uploads");
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        let originalName = file.originalname;
        try {
            originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
        } catch (err) {
            console.error("Error decodificando nombre del archivo:", err);
        }
        const sanitized = originalName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s._-]/g, "_");
        cb(null, uniqueSuffix + "-" + sanitized);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } 
});

// 🔹 RUTAS
router.get("/resumen", reunionesController.obtenerStats);
router.get("/destinatarios", reunionesController.obtenerDestinatarios);
router.get("/default-cc", reunionesController.obtenerDefaultCc);
router.get("/tipos", reunionesController.obtenerTiposReunion);
router.get("/test-smtp", reunionesController.testSmtp);
router.get("/", reunionesController.listarReuniones);
router.post("/", upload.array("archivos", 5), reunionesController.crearReunion);
router.get("/detail/:id_reunion", reunionesController.obtenerReunionPorId);
router.put("/:id/no-aplica", reunionesController.marcarNoAplica);

module.exports = router;
