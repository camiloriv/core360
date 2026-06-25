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

// 🔹 Endpoint Temporal para arreglar reuniones canceladas
app.get("/fix-canceladas", async (req, res) => {
  const db = require("./database/connection");
  try {
      const [rows] = await db.query(`
          SELECT r.id_reunion, r.estado_envio, r.fecha_reu, r.minuta,
                 (SELECT COUNT(*) FROM empresa_seguimiento_log l WHERE l.reunion_id = r.event_id AND l.estado IN ('gestionada', 'concretada', 'enviado')) as valid_logs,
                 (SELECT COUNT(*) FROM empresa_seguimiento_log l WHERE l.reunion_id = r.event_id AND l.estado = 'cancelada') as cancel_logs
          FROM reuniones r
          WHERE r.estado_envio = 'cancelada'
      `);
      
      const affected = rows.filter(r => r.valid_logs > 0 && r.cancel_logs > 0);
      const toFix = affected.map(r => ({ id_reunion: r.id_reunion, revert_to: 'borrador' }));
      
      let logs = [];
      for (const f of toFix) {
          await db.query("UPDATE reuniones SET estado_envio = ? WHERE id_reunion = ?", [f.revert_to, f.id_reunion]);
          logs.push(`Reverted reunion ${f.id_reunion} to ${f.revert_to}`);
          
          await db.query(`
              DELETE FROM empresa_seguimiento_log 
              WHERE reunion_id = (SELECT event_id FROM reuniones WHERE id_reunion = ?) 
              AND estado = 'cancelada'
          `, [f.id_reunion]);
          logs.push(`Deleted cancelada logs for reunion ${f.id_reunion}`);
      }
      
      res.json({ status: "ok", fixedCount: toFix.length, logs });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error ejecutando fix" });
  }
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

