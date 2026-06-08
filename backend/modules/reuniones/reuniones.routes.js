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
        cb(null, uniqueSuffix + "-" + file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } 
});

// 🔹 RUTAS
router.get("/resumen", reunionesController.obtenerStats);
router.get("/destinatarios", reunionesController.obtenerDestinatarios);
router.get("/tipos", reunionesController.obtenerTiposReunion);
router.get("/test-smtp", reunionesController.testSmtp);
router.get("/", reunionesController.listarReuniones);
router.post("/", upload.array("archivos"), reunionesController.crearReunion);

module.exports = router;

