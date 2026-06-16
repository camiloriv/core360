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
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      localStorage.setItem("ultimoAcceso", Date.now().toString());
      if (data.usuario.requiere_cambio_clave) {
        handleForcePasswordChange(data.usuario);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión");
    }
  };

  const handleForcePasswordChange = (user) => {
    Swal.fire({
      title: "Cambio de Contraseña Obligatorio",
      html: `
        <div style="text-align: left; font-family: 'Outfit', 'Inter', sans-serif;">
          <p style="font-size: 14px; color: #475569; margin-bottom: 15px;">Por tu seguridad, debes cambiar la contraseña temporal asignada antes de acceder al panel.</p>
          <div style="margin-bottom: 12px;">
            <label style="font-weight: 600; font-size: 13px; color: #475569;">Contraseña Actual (Temporal)</label>
            <input type="password" id="swal-current-password" class="swal2-input" style="margin: 5px 0 0 0; width: 100%; box-sizing: border-box; height: 42px; font-size: 14px; border-radius: 6px; border: 1px solid #cbd5e1; padding: 0 10px;" placeholder="Ingresa tu contraseña actual" required />
          </div>

          <div style="margin-bottom: 8px;">
            <label style="font-weight: 600; font-size: 13px; color: #475569;">Nueva Contraseña</label>
            <input type="password" id="swal-new-password" class="swal2-input" style="margin: 5px 0 0 0; width: 100%; box-sizing: border-box; height: 42px; font-size: 14px; border-radius: 6px; border: 1px solid #cbd5e1; padding: 0 10px;" placeholder="Mínimo 8 caracteres" required />
          </div>
          
          <div style="margin-bottom: 12px;">
            <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 6px;">
              <div id="swal-strength-bar" style="height: 100%; width: 0%; transition: all 0.3s ease; background: #cbd5e1;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span id="swal-strength-text" style="font-size: 11px; font-weight: 600; color: #94a3b8;">Fuerza: Sin contraseña</span>
            </div>
          </div>

          <div style="margin-bottom: 8px;">
            <label style="font-weight: 600; font-size: 13px; color: #475569;">Confirmar Nueva Contraseña</label>
            <input type="password" id="swal-confirm-password" class="swal2-input" style="margin: 5px 0 0 0; width: 100%; box-sizing: border-box; height: 42px; font-size: 14px; border-radius: 6px; border: 1px solid #cbd5e1; padding: 0 10px;" placeholder="Repite la nueva contraseña" required />
          </div>
        </div>
      `,
      showCancelButton: false,
      allowEscapeKey: false,
      allowOutsideClick: false,
      confirmButtonText: "Actualizar y Entrar",
      confirmButtonColor: "var(--secondary-color, #e05e2b)",
      focusConfirm: false,
      didOpen: () => {
        const newPasswordInput = document.getElementById("swal-new-password");
        const strengthBar = document.getElementById("swal-strength-bar");
        const strengthText = document.getElementById("swal-strength-text");

        newPasswordInput.addEventListener("input", (e) => {
          const password = e.target.value;
          if (!password) {
            strengthBar.style.width = "0%";
            strengthBar.style.background = "#e2e8f0";
            strengthText.textContent = "Fuerza: Sin contraseña";
            strengthText.style.color = "#94a3b8";
            return;
          }

          let score = 0;
          if (password.length >= 8) score++;
          if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
          if (/[0-9]/.test(password)) score++;
          if (/[^A-Za-z0-9]/.test(password)) score++;

          let strength = "Débil";
          let color = "#ef4444";
          let width = "33%";

          if (password.length < 8) {
            strength = "Débil (muy corta)";
            color = "#ef4444";
            width = "20%";
          } else if (score >= 4) {
            strength = "Fuerte 💪";
            color = "#22c55e";
            width = "100%";
          } else if (score >= 2) {
            strength = "Medio ⚠️";
            color = "#eab308";
            width = "66%";
          } else {
            strength = "Débil";
            color = "#ef4444";
            width = "33%";
          }

          strengthBar.style.width = width;
          strengthBar.style.background = color;
          strengthText.textContent = `Fuerza: ${strength}`;
          strengthText.style.color = color;
        });
      },
      preConfirm: () => {
        const currentPassword = document.getElementById("swal-current-password").value;
        const newPassword = document.getElementById("swal-new-password").value;
        const confirmPassword = document.getElementById("swal-confirm-password").value;

        if (!currentPassword || !newPassword || !confirmPassword) {
          Swal.showValidationMessage("Todos los campos son obligatorios");
          return false;
        }
        if (newPassword.length < 8) {
          Swal.showValidationMessage("La nueva contraseña debe tener al menos 8 caracteres");
          return false;
        }
        if (newPassword === currentPassword) {
          Swal.showValidationMessage("La nueva contraseña debe ser distinta a la actual");
          return false;
        }
        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage("Las nuevas contraseñas no coinciden");
          return false;
        }

        return axios
          .post(`${API_URL}/usuarios/cambiar-contrasena`, {
            usuario_id: user.id,
            contrasena_actual: currentPassword,
            nueva_contrasena: newPassword,
          }, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          })
          .then((response) => {
            return response.data;
          })
          .catch((err) => {
            Swal.showValidationMessage(err.response?.data?.error || "Error al cambiar la contraseña");
            return false;
          });
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "¡Contraseña Actualizada!",
          text: "Bienvenido a CORE 360.",
          icon: "success",
          confirmButtonColor: "var(--secondary-color, #e05e2b)",
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          user.requiere_cambio_clave = false;
          localStorage.setItem("usuario", JSON.stringify(user));
          navigate("/");
        });
      }
    });
  };

  const handleHelpClick = () => {
    Swal.fire({
      title:
        '<div style="font-size: 20px; font-weight: 800; color: #1f2937;">Soporte CORE 360</div>',
      html: `
        <div style="font-size: 14px; text-align: left; line-height: 1.6; color: #4b5563; padding: 5px 0;">
          <p style="margin-bottom: 12px;">Si tienes problemas para ingresar al portal o necesitas restablecer tus credenciales, ponte en contacto con el administrador de sistemas:</p>
          <div style="background: #f9fafb; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; color: #1f2937;">
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
      confirmButtonColor: "var(--primary-color)",
      width: "400px",
      customClass: {
        popup: "swal2-popup",
      },
    });
  };

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
      <style>{`
        .cloud-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }
        .cloud-input:focus {
          border-color: var(--secondary-color) !important;
          box-shadow: 0 0 0 2px rgba(26, 107, 97, 0.1) !important;
        }
        .cloud-btn:hover {
          background-color: var(--primary-hover) !important;
        }
        .cloud-link:hover {
          color: var(--secondary-color) !important;
          text-decoration: underline;
        }
      `}</style>

      <svg
        style={{
          position: "fixed",
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
              stroke="var(--primary-color)"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <circle
              cx={line.x}
              cy={line.y2}
              r="6"
              fill="var(--primary-color)"
              fillOpacity="0.03"
            />
            <circle
              cx={line.x}
              cy={line.y2}
              r="3"
              fill="var(--primary-color)"
              fillOpacity="0.15"
            />
          </g>
        ))}
      </svg>

      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px', color: 'var(--primary-color)' }}>
              <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
            </svg>
          </div>
          <h1 style={styles.title}>CORE 360</h1>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputWrapper}>
            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Correo electrónico"
              className="cloud-input"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputWrapper}>
            <svg style={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Contraseña"
              className="cloud-input"
              style={styles.input}
              required
            />
          </div>

          {error && <div style={styles.errorText}>{error}</div>}

          <button type="submit" className="cloud-btn" style={styles.button}>
            Iniciar Sesión
          </button>

          <div style={{ ...styles.footerOptions, justifyContent: "flex-end" }}>
            <span 
              onClick={handleHelpClick} 
              className="cloud-link" 
              style={styles.forgotLink}
            >
              ¿Olvidó su contraseña?
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    padding: "20px",
    boxSizing: "border-box",
    justifyContent: "center",
    alignItems: "center",
    background: "var(--bg-body)",
    fontFamily: "var(--font-main)",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "380px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 20px 40px -5px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.08)",
    boxSizing: "border-box",
    margin: "auto",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  logoIcon: {
    background: "rgba(18, 72, 66, 0.1)",
    padding: "8px",
    borderRadius: "10px",
    display: "flex",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "#9ca3af",
  },
  input: {
    width: "100%",
    padding: "12px 14px 12px 40px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    fontSize: "14px",
    color: "#1f2937",
    background: "#ffffff",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    fontWeight: "500",
  },
  button: {
    background: "var(--primary-color)",
    color: "#ffffff",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
    marginTop: "8px",
  },
  footerOptions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#6b7280",
    cursor: "pointer",
    userSelect: "none",
  },
  checkbox: {
    accentColor: "var(--primary-color)",
    cursor: "pointer",
  },
  forgotLink: {
    fontSize: "12px",
    color: "#6b7280",
    cursor: "pointer",
    transition: "color 0.2s",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: "500",
    textAlign: "center",
    background: "#fef2f2",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
  },
};

export default Login;
