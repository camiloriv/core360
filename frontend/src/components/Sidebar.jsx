import React, { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";

const Sidebar = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");

  let menuItems = [
    {
      path: "/registrar-reunion",
      label: "Registrar Reunión",
      title: "Registrar Reunión",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-calendar-check-icon lucide-calendar-check"
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      ),
    },
    {
      path: "/crear-encuesta",
      label: "Crear Encuesta",
      title: "Crear Encuesta",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-file-plus-corner-icon lucide-file-plus-corner"
        >
          <path d="M11.35 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5.35" />
          <path d="M14 2v5a1 1 0 0 0 1 1h5" />
          <path d="M14 19h6" />
          <path d="M17 16v6" />
        </svg>
      ),
    },
    {
      path: "/dashboard-reuniones",
      label: "Mis reuniones",
      title: "Minutas",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-handshake-icon lucide-handshake"
        >
          <path d="m11 17 2 2a1 1 0 1 0 3-3" />
          <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
          <path d="m21 3 1 11h-2" />
          <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
          <path d="M3 4h8" />
        </svg>
      ),
    },
    {
      path: "/dashboard-encuestas",
      label: "Mis encuestas",
      title: "Informes",
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
    },
    {
      path: "/editor-encuestas",
      label: "Editar encuestas",
      title: "Ajustes",
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
    },
    {
      path: "/gestion-empresas",
      label: "Empresas",
      title: "Gestión de Empresas",
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
          <path d="M7 22V14h10v8"></path>
          <path d="M9 8h2"></path>
          <path d="M13 8h2"></path>
          <path d="M9 12h2"></path>
          <path d="M13 12h2"></path>
        </svg>
      ),
    },
    {
      path: "/seguimiento-empresas",
      label: "Cobertura",
      title: "Seguimiento de Cobertura",
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      ),
    },
    {
      path: "/gestion-usuarios",
      label: "Usuarios",
      title: "Gestión de Usuarios",
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
    },
  ];

  const vistas = user.vistas_permitidas
    ? (typeof user.vistas_permitidas === "string" ? JSON.parse(user.vistas_permitidas) : user.vistas_permitidas)
    : null;

  if (vistas) {
    menuItems = menuItems.filter((item) => vistas.includes(item.path));
  } else {
    if (user.permisos !== "admin") {
      menuItems = menuItems.filter(
        (item) => !["/gestion-usuarios", "/gestion-empresas"].includes(item.path),
      );
    }

    if (
      user.permisos !== "jefatura" &&
      user.permisos !== "ejecutiva" &&
      user.permisos !== "admin"
    ) {
      menuItems = menuItems.filter((item) => item.path !== "/editor-encuestas");
    }
  }

  useEffect(() => {
    const currentItem = menuItems.find(
      (item) => item.path === location.pathname,
    );
    if (currentItem) {
      document.title = `CORE 360 - ${currentItem.title}`;
    }
  }, [location.pathname]);

  const handleOpenPasswordModal = () => {
    Swal.fire({
      title: "Actualizar Contraseña",
      html: `
        <div style="text-align: left; font-family: 'Outfit', 'Inter', sans-serif;">
          <div style="margin-bottom: 12px;">
            <label style="font-weight: 600; font-size: 13px; color: #475569;">Contraseña Actual</label>
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
      showCancelButton: true,
      confirmButtonText: "Actualizar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "var(--secondary-color, #e05e2b)",
      cancelButtonColor: "#94a3b8",
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

          // Analizar fuerza
          let score = 0;
          if (password.length >= 8) score++;
          if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
          if (/[0-9]/.test(password)) score++;
          if (/[^A-Za-z0-9]/.test(password)) score++;

          let strength = "Débil";
          let color = "#ef4444"; // Rojo
          let width = "33%";

          if (password.length < 8) {
            strength = "Débil (muy corta)";
            color = "#ef4444";
            width = "20%";
          } else if (score >= 4) {
            strength = "Fuerte 💪";
            color = "#22c55e"; // Verde
            width = "100%";
          } else if (score >= 2) {
            strength = "Medio ⚠️";
            color = "#eab308"; // Amarillo
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
        const currentPassword = document.getElementById(
          "swal-current-password",
        ).value;
        const newPassword = document.getElementById("swal-new-password").value;
        const confirmPassword = document.getElementById(
          "swal-confirm-password",
        ).value;

        if (!currentPassword || !newPassword || !confirmPassword) {
          Swal.showValidationMessage("Todos los campos son obligatorios");
          return false;
        }

        if (newPassword.length < 8) {
          Swal.showValidationMessage(
            "La nueva contraseña debe tener al menos 8 caracteres",
          );
          return false;
        }

        if (newPassword === currentPassword) {
          Swal.showValidationMessage(
            "La nueva contraseña debe ser distinta a la actual",
          );
          return false;
        }

        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage("Las nuevas contraseñas no coinciden");
          return false;
        }

        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
        return axios
          .post(`${API_URL}/usuarios/cambiar-contrasena`, {
            usuario_id: user.id,
            contrasena_actual: currentPassword,
            nueva_contrasena: newPassword,
          })
          .then((response) => {
            return response.data;
          })
          .catch((err) => {
            Swal.showValidationMessage(
              err.response?.data?.error || "Error al cambiar la contraseña",
            );
            return false;
          });
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "¡Contraseña Actualizada!",
          text: "Tu contraseña ha sido modificada con éxito.",
          icon: "success",
          confirmButtonColor: "var(--secondary-color, #e05e2b)",
        }).then(() => {
          window.location.reload();
        });
      }
    });
  };

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoContainer}>
        <img src="/icono_negativo.PNG" alt="Core360 Logo" style={styles.logo} />
      </div>

      <nav style={styles.nav} className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navLink,
              backgroundColor: isActive
                ? "rgba(255,255,255,0.1)"
                : "transparent",
              color: isActive ? "var(--bg-container)" : "var(--text-light)",
              borderLeft: isActive
                ? "4px solid #3b82f6"
                : "4px solid transparent",
            })}
          >
            <span style={styles.icon}>{item.icon}</span>
            <span style={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        {user.nombre && (
          <div
            onClick={handleOpenPasswordModal}
            style={{
              color: "var(--border-input)",
              fontSize: "11px",
              marginBottom: "15px",
              fontWeight: "600",
              textAlign: "center",
              lineHeight: "1.2",
              cursor: "pointer",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.target.style.color = "var(--secondary-color, #e05e2b)")
            }
            onMouseLeave={(e) => (e.target.style.color = "var(--border-input)")}
            title="Seguridad / Cambiar Contraseña"
          >
            {user.nombre}
          </div>
        )}
        <button
          onClick={() => {
            localStorage.removeItem("usuario");
            localStorage.removeItem("ultimoAcceso");
            window.location.href = "/login";
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--danger-color)",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: "bold",
            textTransform: "uppercase",
            marginBottom: "10px",
            width: "100%",
          }}
        >
          Cerrar Sesión
        </button>
        <div style={styles.version}>v2.5</div>
      </div>
    </div>
  );
};

const styles = {
  sidebar: {
    width: "100px",
    height: "100vh",
    background: "#2d2d2d",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    zIndex: 1000,
    boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
  },
  logoContainer: {
    padding: "20px 10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    marginBottom: "10px",
  },
  logo: {
    width: "50px",
    height: "auto",
    objectFit: "contain",
  },
  nav: {
    padding: "5px 0",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0px",
    overflowY: "auto",
    overflowX: "hidden",
  },
  navLink: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 5px",
    textDecoration: "none",
    transition: "all 0.2s",
    textAlign: "center",
  },
  icon: {
    fontSize: "22px",
    marginBottom: "4px",
  },
  label: {
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  footer: {
    padding: "15px",
    textAlign: "center",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  version: {
    fontSize: "9px",
    color: "var(--text-muted)",
    fontWeight: "bold",
  },
};

export default Sidebar;
