import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "../styles/components.css"; // Ensure CSS is imported

const Sidebar = ({ isOpen, onClose }) => {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  const location = useLocation();

  // Define full menu items with hierarchy
  const rawMenuItems = [
    {
      path: "/home",
      label: "Home",
      title: "Home",
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: "Reuniones",
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m11 17 2 2a1 1 0 1 0 3-3" />
          <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
          <path d="m21 3 1 11h-2" />
          <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
          <path d="M3 4h8" />
        </svg>
      ),
      children: [
        {
          path: "/dashboard-reuniones",
          label: "Ver",
          title: "Minutas",
          icon: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          ),
        },
        {
          path: "/agendar",
          label: "Agenda",
          title: "Agendar Reunión (Teams)",
          icon: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h5" />
              <path d="M17.5 17.5 16 16.3V14" />
              <circle cx="16" cy="16" r="6" />
            </svg>
          ),
        }
      ]
    },
    {
      label: "Encuestas",
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      children: [
        {
          path: "/dashboard-encuestas",
          label: "Ver",
          title: "Informes",
          icon: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          ),
        },
        {
          path: "/generar-encuesta",
          label: "Generar",
          title: "Generar Encuesta",
          icon: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.35 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5.35" />
              <path d="M14 2v5a1 1 0 0 0 1 1h5" />
              <path d="M14 19h6" />
              <path d="M17 16v6" />
            </svg>
          ),
        },
        {
          path: "/editor-encuestas",
          label: "Crear",
          title: "Ajustes de Encuestas",
          icon: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          ),
        }
      ]
    },
    {
      label: "Empresas",
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
          <path d="M7 22V14h10v8"></path>
          <path d="M9 8h2"></path>
          <path d="M13 8h2"></path>
          <path d="M9 12h2"></path>
          <path d="M13 12h2"></path>
        </svg>
      ),
      children: [
        {
          path: "/vincular-reuniones",
          label: "Vincular",
          title: "Vincular reuniones",
          icon: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )
        },
        {
          path: "/gestion-empresas",
          label: "Vinculaciones",
          title: "Gestión de Empresas",
          icon: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
              <path d="M7 22V14h10v8"></path>
              <path d="M9 8h2"></path>
              <path d="M13 8h2"></path>
              <path d="M9 12h2"></path>
              <path d="M13 12h2"></path>
            </svg>
          )
        }
      ]
    },
    {
      path: "/seguimiento-empresas",
      label: "Cobertura",
      title: "Seguimiento de Cobertura",
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      ),
    },
    {
      path: "/seguimiento-negocios",
      label: "Negocios",
      title: "Seguimiento Nuevos Negocios",
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      ),
    },
    {
      path: "/gestion-usuarios",
      label: "Usuarios",
      title: "Gestión de Usuarios",
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
    },
    {
      path: "/admin",
      label: "Admin",
      title: "Panel de Administración",
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      ),
    },
  ];

  // Helper to filter a single item based on permissions
  const isItemAllowed = (itemPath, user, vistas) => {
    if (user.permisos === "admin" || user.permisos === "ADMIN") return true;

    if (vistas) {
      if (itemPath === "/vincular-reuniones") return vistas.includes("/dashboard-reuniones");
      if (itemPath === "/gestion-empresas" && (user.permisos === "jefatura" || user.permisos === "ejecutiva")) return true;
      if (itemPath === "/seguimiento-negocios" && (user.permisos === "gerencia" || user.permisos === "gerencia_general")) return true;
      return vistas.includes(itemPath) || (itemPath === "/home" && (vistas.includes("/registrar-reunion") || vistas.includes("/home")));
    } else {
      if (itemPath === "/gestion-empresas" && (user.permisos === "jefatura" || user.permisos === "ejecutiva")) return true;
      if (itemPath === "/seguimiento-negocios" && (user.permisos === "gerencia" || user.permisos === "gerencia_general")) return true;
      if (["/gestion-usuarios", "/gestion-empresas", "/admin"].includes(itemPath)) return false;
      if (itemPath === "/editor-encuestas" && !["jefatura", "ejecutiva"].includes(user.permisos)) return false;
      return true;
    }
  };

  // Filter the hierarchical menu
  const getFilteredMenu = () => {
    const vistas = user.vistas_permitidas
      ? typeof user.vistas_permitidas === "string"
        ? JSON.parse(user.vistas_permitidas)
        : user.vistas_permitidas
      : null;

    if (user.permisos === "admin" || user.permisos === "ADMIN") return rawMenuItems;

    return rawMenuItems.map(item => {
      if (item.children) {
        const allowedChildren = item.children.filter(child => isItemAllowed(child.path, user, vistas));
        return { ...item, children: allowedChildren };
      }
      return item;
    }).filter(item => {
      if (item.children) return item.children.length > 0;
      return isItemAllowed(item.path, user, vistas);
    });
  };

  const menuItems = getFilteredMenu();

  useEffect(() => {
    // Determine active title by searching in path or children
    let currentItem = menuItems.find(item => item.path === location.pathname);
    if (!currentItem) {
      for (const item of menuItems) {
        if (item.children) {
          const child = item.children.find(c => c.path === location.pathname);
          if (child) {
            currentItem = child;
            break;
          }
        }
      }
    }
    
    if (currentItem) {
      document.title = `CORE 360 - ${currentItem.title || currentItem.label}`;
    }
  }, [location.pathname, menuItems]);

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`} style={styles.sidebar}>
      {/* Mobile close button (solo visible si la clase 'open' está activa en móvil) */}
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
        <button className="close-sidebar-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav style={styles.nav} className="sidebar-nav">
        {menuItems.map((item, index) => {
          if (item.children) {
            const isChildActive = item.children.some(child => location.pathname === child.path);
            return (
              <div key={index} className="sidebar-item-container">
                <div
                  className="sidebar-item-parent sidebar-main-item"
                  style={{
                    ...styles.navLink,
                    color: isChildActive ? "white" : "rgba(255, 255, 255, 0.6)",
                    borderLeft: isChildActive ? "3px solid var(--secondary-color)" : "3px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <span style={styles.icon}>{item.icon}</span>
                  <span style={styles.label}>{item.label}</span>
                </div>
                
                {/* Submenu on hover */}
                <div className="sidebar-submenu">
                  {item.children.map(child => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className="sidebar-submenu-item"
                    >
                      <span className="submenu-icon">{child.icon}</span>
                      <span className="submenu-label">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          } else {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="sidebar-main-item"
                style={({ isActive }) => ({
                  ...styles.navLink,
                  backgroundColor: isActive ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  color: isActive ? "white" : "rgba(255, 255, 255, 0.6)",
                  borderLeft: isActive ? "3px solid var(--secondary-color)" : "3px solid transparent",
                })}
              >
                <span style={styles.icon}>{item.icon}</span>
                <span style={styles.label}>{item.label}</span>
              </NavLink>
            );
          }
        })}
      </nav>
    </div>
  );
};

const styles = {
  sidebar: {
    width: "80px",
    height: "calc(100dvh - 60px)",
    background: "var(--primary-color)",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: "60px", // Below Topbar
    bottom: 0,
    zIndex: 1000,
    boxShadow: "4px 0 10px rgba(0,0,0,0.05)",
    fontFamily: "var(--font-main)",
  },
  nav: {
    padding: "8px 0",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    /* Eliminamos overflow para que el submenu absolute pueda salir del contenedor sin generar scroll horizontal */
  },
  navLink: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 4px",
    textDecoration: "none",
    transition: "all 0.2s",
  },
  icon: {
    fontSize: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "2px",
  },
  label: {
    fontSize: "11px",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: "1.2",
  },
};

export default Sidebar;
