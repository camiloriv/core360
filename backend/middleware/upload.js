const multer = require("multer");

const storage = multer.memoryStorage(); // 🔥 guarda en RAM

const upload = multer({ storage });

module.exports = upload;
