import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const Login = () => {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, {
        correo,
        contrasena,
      });
      localStorage.setItem("usuario", JSON.stringify(data));
      localStorage.setItem("ultimoAcceso", Date.now().toString());
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión");
    }
  };

  const handleHelpClick = () => {
    Swal.fire({
      title:
        '<div style="font-size: 20px; font-weight: 800; color: #0f172a;">Soporte CORE 360</div>',
      html: `
        <div style="font-size: 14px; text-align: left; line-height: 1.6; color: #475569; padding: 5px 0;">
          <p style="margin-bottom: 12px;">Si tienes problemas para ingresar al portal o necesitas restablecer tus credenciales, ponte en contacto con el administrador de sistemas:</p>
          <div style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; color: #1e293b;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>📧 <strong>Correo:</strong></span>
              <span><strong>minutas@proforma.cl</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>📞 <strong>Teléfono:</strong></span>
              <span><strong>+56 9 3182 7029</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>⏰ <strong>Horario:</strong></span>
              <span><strong>Lun - Vie / 09:30 - 19:00</strong></span>
            </div>
          </div>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Entendido",
      confirmButtonColor: "#426ca5",
      width: "400px",
      customClass: {
        popup: "swal2-popup",
      },
    });
  };

  // Positions for tech network lines to replicate background screenshot exactly
  const techLines = [
    { x: "5%", y1: "100%", y2: "58%" },
    { x: "10%", y1: "100%", y2: "40%" },
    { x: "13%", y1: "0%", y2: "25%" },
    { x: "20%", y1: "100%", y2: "60%" },
    { x: "34%", y1: "100%", y2: "65%" },
    { x: "42%", y1: "0%", y2: "55%" },
    { x: "45%", y1: "100%", y2: "12%" },
    { x: "58%", y1: "100%", y2: "58%" },
    { x: "67%", y1: "100%", y2: "48%" },
    { x: "71%", y1: "100%", y2: "62%" },
    { x: "76%", y1: "0%", y2: "22%" },
    { x: "88%", y1: "100%", y2: "61%" },
    { x: "95%", y1: "0%", y2: "45%" },
  ];

  return (
    <div style={styles.container}>
      {/* Injecting clean CSS for animations, hovers and active states */}
      <style>{`
        .core-input::placeholder {
          color: #94a3b8;
          opacity: 0.8;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 1px;
        }
        .core-input:focus {
          background-color: #ffffff !important;
          border-color: #426ca5 !important;
          box-shadow: 0 0 0 3px rgba(66, 108, 165, 0.15) !important;
        }
        .core-button:hover {
          background-color: #4c77b2 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 12px rgba(66, 108, 165, 0.3) !important;
        }
        .core-button:active {
          transform: translateY(0);
          box-shadow: none !important;
        }
        .core-help-button:hover {
          background-color: #4c77b2 !important;
          transform: scale(1.05);
        }
        .core-help-button:active {
          transform: scale(0.95);
        }
      `}</style>

      {/* Tech Network SVG Background Overlay */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {techLines.map((line, index) => (
          <g key={index}>
            <line
              x1={line.x}
              y1={line.y1}
              x2={line.x}
              y2={line.y2}
              stroke="rgba(66, 108, 165, 0.08)"
              strokeWidth="1"
            />
            {/* Soft Outer Node Glow */}
            <circle
              cx={line.x}
              cy={line.y2}
              r="6"
              fill="rgba(66, 108, 165, 0.03)"
            />
            {/* Inner Tech Node */}
            <circle
              cx={line.x}
              cy={line.y2}
              r="3"
              fill="rgba(66, 108, 165, 0.15)"
            />
          </g>
        ))}
      </svg>

      <div style={styles.innerContainer}>
        {/* Sleek, letter-spaced branding header */}
        <div style={styles.logoContainer}>
          <span style={styles.logoText}>CORE 360</span>
        </div>

        {/* Minimalist login form */}
        <form onSubmit={handleLogin} style={styles.form} autoComplete="off">
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo electrónico"
            className="core-input"
            style={styles.input}
            required
            autoComplete="off"
          />

          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="••••••••"
            className="core-input"
            style={styles.input}
            required
            autoComplete="new-password"
          />

          {error && <div style={styles.errorText}>{error}</div>}

          <button type="submit" className="core-button" style={styles.button}>
            INGRESAR
          </button>
        </form>

        {/* Unified Help / Contact section */}
        <div style={styles.helpSection}>
          <span style={styles.helpText}>
            Ayuda | contactar al administrador
          </span>
          <button
            type="button"
            onClick={handleHelpClick}
            className="core-help-button"
            style={styles.helpButton}
          >
            Ver &gt;
          </button>
        </div>

        {/* Sutil visual divider line */}
        <div style={styles.divider}></div>

        {/* Footer info matching layout */}
        <div style={styles.footer}>CORE 360 | 2026</div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      'var(--font-main, "Inter", system-ui, -apple-system, sans-serif)',
  },
  innerContainer: {
    width: "100%",
    maxWidth: "380px",
    zIndex: 1,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    padding: "0 20px",
  },
  logoContainer: {
    textAlign: "center",
    marginBottom: "40px",
  },
  logoText: {
    color: "#1e293b",
    fontSize: "38px",
    fontWeight: "300",
    letterSpacing: "8px",
    fontFamily: '"Montserrat", "Inter", "Segoe UI", sans-serif',
    textTransform: "uppercase",
    display: "block",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    width: "100%",
  },
  input: {
    padding: "14px 20px",
    borderRadius: "100px",
    border: "1px solid #c5d2e0",
    fontSize: "15px",
    textAlign: "center",
    width: "100%",
    background: "#ffffff",
    color: "#1e293b",
    outline: "none",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    boxSizing: "border-box",
    fontWeight: "500",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)",
  },
  button: {
    background: "#426ca5",
    color: "#ffffff",
    padding: "14px 20px",
    borderRadius: "100px",
    border: "none",
    fontSize: "14px",
    fontWeight: "bold",
    letterSpacing: "2px",
    cursor: "pointer",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    width: "100%",
    outline: "none",
    textTransform: "uppercase",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  helpSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginTop: "25px",
    fontSize: "13px",
  },
  helpText: {
    color: "#64748b",
    fontWeight: "500",
  },
  helpButton: {
    background: "#426ca5",
    color: "#ffffff",
    padding: "4px 14px",
    borderRadius: "100px",
    border: "none",
    fontSize: "11px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease",
    outline: "none",
  },
  divider: {
    borderTop: "1px solid rgba(0, 0, 0, 0.08)",
    width: "100%",
    margin: "25px 0",
  },
  footer: {
    textAlign: "center",
    color: "rgba(30, 41, 59, 0.6)",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  errorText: {
    color: "#dc2626",
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
    background: "#fee2e2",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
    lineHeight: "1.4",
  },
};

export default Login;
