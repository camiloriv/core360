const { Router } = require("express");
const multer = require("multer");
const reunionesController = require("./reuniones.controller");

const router = Router();

// 🔥 MULTER
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
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
router.get("/", reunionesController.listarReuniones);
router.get("/resumen", reunionesController.obtenerStats);
router.get("/destinatarios", reunionesController.obtenerDestinatarios);
router.post("/", upload.array("archivos"), reunionesController.crearReunion);

module.exports = router;

