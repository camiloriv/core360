import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import axios from "axios";

const CALENDAR_THEMES = [
  // Fila 1
  { id: "blue",    color: "#3b82f6", label: "Azul" },
  { id: "indigo",  color: "#6366f1", label: "Indigo" },
  { id: "purple",  color: "#8b5cf6", label: "Morado" },
  { id: "pink",    color: "#ec4899", label: "Rosado" },
  { id: "rose",    color: "#f43f5e", label: "Rosa" },
  // Fila 2
  { id: "orange",  color: "#f97316", label: "Naranja" },
  { id: "amber",   color: "#f59e0b", label: "Ámbar" },
  { id: "green",   color: "#10b981", label: "Verde" },
  { id: "teal",    color: "#14b8a6", label: "Teal" },
  { id: "cyan",    color: "#06b6d4", label: "Cyan" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function Topbar({ user, onMenuOpen }) {
  const [timeStr, setTimeStr] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [calendarTheme, setCalendarTheme] = useState(() => {
    // Leer desde preferencias del usuario (guardadas en localStorage al login)
    try {
      const u = JSON.parse(localStorage.getItem("usuario") || "{}");
      return u?.preferencias?.calendar_theme || "blue";
    } catch { return "blue"; }
  });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["dom.", "lun.", "mar.", "mié.", "jue.", "vie.", "sáb."];
      const dayName = days[now.getDay()];
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimeStr(`${dayName} ${day}-${month}-${year} ${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setActiveSection(null);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleThemeChange = async (themeId) => {
    setCalendarTheme(themeId);

    // Actualizar en localStorage del usuario (para que AgendarReunion lo lea)
    localStorage.setItem("calendar_theme", themeId);
    window.dispatchEvent(new Event("calendar_theme_changed"));

    // Persistir en BD
    try {
      const u = JSON.parse(localStorage.getItem("usuario") || "{}");
      if (!u?.id) return;
      const { data } = await axios.patch(`${API_URL}/usuarios/${u.id}/preferencias`, {
        preferencias: { calendar_theme: themeId },
      });
      // Actualizar el objeto usuario en localStorage con las preferencias nuevas
      const updated = { ...u, preferencias: data.preferencias };
      localStorage.setItem("usuario", JSON.stringify(updated));
    } catch (err) {
      console.error("Error al guardar preferencia de tema:", err);
    }
  };

  const handleOpenPasswordModal = () => {
    setDropdownOpen(false);
    setActiveSection(null);
    Swal.fire({
      title: "Actualizar Contraseña",
      html: `
        <div style="text-align: left; font-family: 'Outfit', 'Inter', sans-serif; overflow-y: hidden;">
          <div style="margin-bottom: 8px;">
            <label style="font-weight: 600; font-size: 12px; color: #475569;">Contraseña Actual</label>
            <input type="password" id="swal-current-password" class="swal2-input" style="margin: 4px 0 0 0; width: 100%; box-sizing: border-box; height: 36px; font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; padding: 0 10px;" placeholder="Ingresa tu contraseña actual" required />
          </div>

          <div style="margin-bottom: 8px;">
            <label style="font-weight: 600; font-size: 12px; color: #475569;">Nueva Contraseña</label>
            <input type="password" id="swal-new-password" class="swal2-input" style="margin: 4px 0 0 0; width: 100%; box-sizing: border-box; height: 36px; font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; padding: 0 10px;" placeholder="Mínimo 8 caracteres" required />
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 4px;">
              <div id="swal-strength-bar" style="height: 100%; width: 0%; transition: all 0.3s ease; background: #cbd5e1;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span id="swal-strength-text" style="font-size: 11px; font-weight: 600; color: #94a3b8;">Fuerza: Sin contraseña</span>
            </div>
          </div>

          <div style="margin-bottom: 0;">
            <label style="font-weight: 600; font-size: 12px; color: #475569;">Confirmar Nueva Contraseña</label>
            <input type="password" id="swal-confirm-password" class="swal2-input" style="margin: 4px 0 0 0; width: 100%; box-sizing: border-box; height: 36px; font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; padding: 0 10px;" placeholder="Repite la nueva contraseña" required />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Actualizar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "var(--secondary-color, #e05e2b)",
      cancelButtonColor: "#94a3b8",
      focusConfirm: false,
      heightAuto: false,
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

        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
        return axios
          .post(`${API_URL}/usuarios/cambiar-contrasena`, {
            usuario_id: user.id,
            contrasena_actual: currentPassword,
            nueva_contrasena: newPassword,
          })
          .then((response) => response.data)
          .catch((err) => {
            Swal.showValidationMessage(err.response?.data?.error || "Error al cambiar la contraseña");
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("ultimoAcceso");
    window.location.href = "/login";
  };

  const currentTheme = CALENDAR_THEMES.find((t) => t.id === calendarTheme) || CALENDAR_THEMES[0];

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .topbar-hamburger { display: flex !important; }
          .topbar-datetime { font-size: 10px !important; }
          .topbar-datetime-full { display: none !important; }
          .topbar-sep { display: none !important; }
          .topbar-username { max-width: 80px !important; font-size: 11px !important; }
        }
        @media (max-width: 480px) {
          .topbar-datetime { display: none !important; }
        }

        .user-dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          min-width: 220px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          z-index: 2000;
          overflow: hidden;
          animation: dropdownFadeIn 0.18s ease;
        }
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .user-dropdown-header {
          padding: 12px 16px 10px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .user-dropdown-name {
          font-weight: 700;
          font-size: 13px;
          color: #1e293b;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-dropdown-role {
          font-size: 11px;
          color: #94a3b8;
          margin: 2px 0 0;
        }

        .user-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          text-align: left;
          transition: background 0.15s;
          font-family: inherit;
        }
        .user-dropdown-item:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        .user-dropdown-item .item-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .user-dropdown-item .item-chevron {
          margin-left: auto;
          color: #cbd5e1;
          transition: transform 0.15s;
        }
        .user-dropdown-item.active .item-chevron {
          transform: rotate(90deg);
        }

        .user-dropdown-submenu {
          padding: 12px 16px 14px;
          border-top: 1px solid #f1f5f9;
          background: #fafafa;
          animation: subMenuFadeIn 0.15s ease;
        }
        @keyframes subMenuFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .user-dropdown-submenu-title {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }
        .theme-dots-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px 4px;
        }
        .theme-dot-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .theme-dot {
          width: 28px;
          height: 28px;
          min-width: 28px;
          min-height: 28px;
          border-radius: 50%;
          cursor: pointer;
          border: 2.5px solid transparent;
          transition: all 0.2s;
          flex-shrink: 0;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          padding: 0;
          margin: 0;
          -webkit-appearance: none;
          appearance: none;
          outline: none;
          box-sizing: border-box;
        }
        .theme-dot:hover {
          transform: scale(1.18);
          box-shadow: 0 3px 8px rgba(0,0,0,0.22);
        }
        .theme-dot.selected {
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15,23,42,0.18);
        }
        .theme-dot-check {
          display: none;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
          pointer-events: none;
        }
        .theme-dot.selected .theme-dot-check {
          display: block;
        }
        .theme-dot-label {
          font-size: 9px;
          color: #64748b;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          max-width: 36px;
          text-overflow: ellipsis;
        }
        .theme-dot-label.active-label {
          color: #1e293b;
          font-weight: 700;
        }

        .user-dropdown-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 0;
        }

        .user-dropdown-logout {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #ef4444;
          text-align: left;
          transition: background 0.15s;
          font-family: inherit;
        }
        .user-dropdown-logout:hover {
          background: #fef2f2;
        }
      `}</style>

      <div
        className="topbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#ffffff",
          height: "60px",
          padding: "0 16px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {/* Left: Hamburger (mobile) + Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {onMenuOpen && (
            <button
              className="topbar-hamburger"
              onClick={onMenuOpen}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--primary-color, #1e3a5f)",
                cursor: "pointer",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                borderRadius: "4px",
                minWidth: "auto",
              }}
              title="Menú"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}
          <img
            src="/logo_texto.PNG"
            alt="CORE 360 Logo"
            style={{ maxHeight: "35px", objectFit: "contain" }}
          />
        </div>

        {/* Right: Datetime + Username dropdown + Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          {/* Fecha y Hora */}
          <div
            className="topbar-datetime"
            style={{
              color: "#64748b",
              fontSize: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                padding: "3px 7px",
                background: "#f1f5f9",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "bold",
                textTransform: "lowercase",
                border: "1px solid #e2e8f0",
              }}
            >
              {timeStr.split(" ")[0]}
            </span>
            <span className="topbar-datetime-full" style={{ fontSize: "11px" }}>
              {timeStr.split(" ").slice(1).join(" ")}
            </span>
          </div>

          {/* Separator */}
          <div
            className="topbar-sep"
            style={{ width: "1px", height: "24px", background: "#e2e8f0", flexShrink: 0 }}
          ></div>

          {/* Perfil con dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              className="topbar-username"
              onClick={() => {
                setDropdownOpen((prev) => !prev);
                if (dropdownOpen) setActiveSection(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: dropdownOpen ? "#f1f5f9" : "transparent",
                border: "1px solid",
                borderColor: dropdownOpen ? "#e2e8f0" : "transparent",
                borderRadius: "8px",
                padding: "5px 10px",
                cursor: "pointer",
                transition: "all 0.2s",
                color: "#334155",
                fontSize: "13px",
                fontWeight: "600",
                fontFamily: "inherit",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "180px",
              }}
              onMouseEnter={(e) => { if (!dropdownOpen) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.background = "transparent"; }}
              title="Configuración de usuario"
            >
              {/* Avatar circular con inicial */}
              <span style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary-color, #1e3a5f) 0%, #3b82f6 100%)",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {(user?.nombre || user?.correo || "A")[0].toUpperCase()}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.nombre || user?.correo || "Administrador"}
              </span>
              {/* Chevron */}
              <svg
                width="12" height="12"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="user-dropdown-menu">
                {/* Header */}
                <div className="user-dropdown-header">
                  <p className="user-dropdown-name">{user?.nombre || user?.correo || "Administrador"}</p>
                  <p className="user-dropdown-role">{user?.rol || "Usuario"}</p>
                </div>

                {/* Opción: Temas */}
                <button
                  className={`user-dropdown-item${activeSection === "temas" ? " active" : ""}`}
                  onClick={() => setActiveSection(activeSection === "temas" ? null : "temas")}
                >
                  <span className="item-icon" style={{ background: "#f0f9ff" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a10 10 0 0 1 0 20"/>
                      <path d="M2 12h10"/>
                    </svg>
                  </span>
                  Temas del Calendario
                  <svg className="item-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {/* Submenu Temas */}
                {activeSection === "temas" && (
                  <div className="user-dropdown-submenu">
                    <p className="user-dropdown-submenu-title">Color del Calendario</p>
                    <div className="theme-dots-grid">
                      {CALENDAR_THEMES.map((t) => (
                        <div key={t.id} className="theme-dot-wrap">
                          <button
                            className={`theme-dot${calendarTheme === t.id ? " selected" : ""}`}
                            style={{ backgroundColor: t.color }}
                            title={t.label}
                            onClick={() => handleThemeChange(t.id)}
                          >
                            <span className="theme-dot-check">✓</span>
                          </button>
                          <span className={`theme-dot-label${calendarTheme === t.id ? " active-label" : ""}`}>
                            {t.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="user-dropdown-divider" />

                {/* Opción: Cambio de Contraseña */}
                <button
                  className="user-dropdown-item"
                  onClick={handleOpenPasswordModal}
                >
                  <span className="item-icon" style={{ background: "#fff7ed" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  Cambio de Contraseña
                  <svg className="item-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <div className="user-dropdown-divider" />

                {/* Cerrar Sesión */}
                <button className="user-dropdown-logout" onClick={handleLogout}>
                  <span style={{
                    width: "32px", height: "32px", borderRadius: "8px",
                    background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </span>
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>

          {/* Botón logout rápido (se mantiene por UX) */}
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "none",
              color: "#3b82f6",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "4px",
              transition: "background 0.2s",
              flexShrink: 0,
              minWidth: "auto",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="Cerrar Sesión"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
