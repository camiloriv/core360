const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ✅ Seguridad: Cabeceras HTTP protegidas
try {
  const helmet = require("helmet");
  app.use(helmet({
    crossOriginResourcePolicy: false, // Permitir cargar imágenes de uploads
  }));
} catch (e) {
  console.warn("Helmet no instalado localmente.");
}

// ✅ Compresión GZIP (Reduce tamaño de respuesta)
try {
  const compression = require("compression");
  app.use(compression());
} catch (e) {
  console.warn("Compression no instalado localmente.");
}

// ✅ CORS Dinámico (Debe ir antes que el Rate Limiter para que los errores 429 devuelvan CORS correctos)
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// ✅ Rate Limiting Básico (Evitar DDoS)
try {
  const rateLimit = require("express-rate-limit");
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // limite de 1000 peticiones por ventana
    message: { error: "Demasiadas peticiones. Intenta más tarde." }
  });
  app.use(limiter);
} catch (e) {
  console.warn("Express-rate-limit no instalado localmente.");
}

// ✅ Middlewares base
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

// ✅ Rutas de Módulos
const reunionesRoutes = require("./modules/reuniones/reuniones.routes");
const ejecutivasRoutes = require("./modules/ejecutivas/ejecutivas.routes");
const empresasRoutes = require("./modules/empresas/empresas.routes");
const encuestasRoutes = require("./modules/encuestas/encuestas.routes");
const jefaturasRoutes = require("./modules/jefaturas/jefaturas.routes");
const authRoutes = require("./modules/auth/auth.routes");
const usuariosRoutes = require("./modules/usuarios/usuarios.routes");
const zonasRoutes = require("./modules/zonas/zonas.routes");
const agendamientoRoutes = require("./modules/agendamiento/agendamiento.routes");
const adminRoutes = require("./modules/admin/admin.routes");

const { verificarToken } = require("./middleware/auth.middleware");

app.use("/reuniones", verificarToken, reunionesRoutes);
app.use("/ejecutivas", verificarToken, ejecutivasRoutes);
app.use("/empresas", verificarToken, empresasRoutes);
app.use("/encuestas", encuestasRoutes); // Las encuestas tienen endpoints públicos y protegidos internamente
app.use("/jefaturas", verificarToken, jefaturasRoutes);
app.use("/auth", authRoutes);
app.use("/usuarios", verificarToken, usuariosRoutes);
app.use("/zonas", verificarToken, zonasRoutes);
app.use("/agendamiento", verificarToken, agendamientoRoutes);
app.use("/admin", verificarToken, adminRoutes);

// 🔹 Test de Salud
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando 🚀", timestamp: new Date() });
});

// ❌ Manejador Global de Errores (Error Catch-all)
app.use((err, req, res, next) => {
  console.error("Internal Error:", err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Error interno del servidor",
      status: err.status || 500
    }
  });
});

module.exports = app;
