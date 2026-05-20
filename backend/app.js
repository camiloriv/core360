const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ✅ Seguridad: Cabeceras HTTP protegidas
// Nota: Requiere npm install helmet
try {
  const helmet = require("helmet");
  app.use(helmet({
    crossOriginResourcePolicy: false, // Permitir cargar imágenes de uploads
  }));
} catch (e) {
  console.warn("Helmet no instalado. Se recomienda: npm install helmet");
}

// ✅ CORS Dinámico
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// ✅ Middlewares base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Rutas de Módulos
const reunionesRoutes = require("./modules/reuniones/reuniones.routes");
const ejecutivasRoutes = require("./modules/ejecutivas/ejecutivas.routes");
const empresasRoutes = require("./modules/empresas/empresas.routes");
const encuestasRoutes = require("./modules/encuestas/encuestas.routes");
const jefaturasRoutes = require("./modules/jefaturas/jefaturas.routes");
const authRoutes = require("./modules/auth/auth.routes");
const usuariosRoutes = require("./modules/usuarios/usuarios.routes");

app.use("/reuniones", reunionesRoutes);
app.use("/ejecutivas", ejecutivasRoutes);
app.use("/empresas", empresasRoutes);
app.use("/encuestas", encuestasRoutes);
app.use("/jefaturas", jefaturasRoutes);
app.use("/auth", authRoutes);
app.use("/usuarios", usuariosRoutes);

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

