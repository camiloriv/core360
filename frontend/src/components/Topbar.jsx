import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import axios from "axios";

export default function Topbar({ user, onMenuOpen }) {
  const [timeStr, setTimeStr] = useState("");

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

  const handleOpenPasswordModal = () => {
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

  return (
    <>
      {/* Estilos inline para mobile (hamburger visible) */}
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
                display: "none", // CSS shows on mobile
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

        {/* Right: Datetime + Username + Logout */}
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

          {/* Perfil */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <div
              className="topbar-username"
              onClick={handleOpenPasswordModal}
              style={{
                color: "#334155",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "color 0.2s",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "160px",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--primary-color)")}
              onMouseLeave={(e) => (e.target.style.color = "#334155")}
              title="Cambiar Contraseña"
            >
              {user?.nombre || user?.correo || "Administrador"}
            </div>

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
      </div>
    </>
  );
}
