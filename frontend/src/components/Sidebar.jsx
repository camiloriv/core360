import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('usuario') || '{}');

  let menuItems = [
    {
      path: '/', label: 'Inicio', title: 'Inicio',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      )
    },
    {
      path: '/crear-encuesta', label: 'Crear', title: 'Crear Encuesta',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      )
    },
    {
      path: '/dashboard-reuniones', label: 'Minutas', title: 'Minutas',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      path: '/dashboard-encuestas', label: 'Informes', title: 'Informes',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    {
      path: '/editor-encuestas', label: 'Ajustes', title: 'Ajustes',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    },
    {
      path: '/gestion-ejecutivas', label: 'Personal', title: 'Gestión de Personal',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      path: '/seguimiento-empresas', label: 'Cobertura', title: 'Seguimiento de Cobertura',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      )
    },
    {
      path: '/gestion-usuarios', label: 'Usuarios', title: 'Gestión de Usuarios',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    }
  ];

  if (user.permisos !== 'admin') {
    menuItems = menuItems.filter(item => !['/gestion-usuarios', '/gestion-ejecutivas'].includes(item.path));
  }

  if (user.permisos !== 'jefatura' && user.permisos !== 'admin') {
    menuItems = menuItems.filter(item => item.path !== '/editor-encuestas');
  }

  useEffect(() => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    if (currentItem) {
      document.title = `CORE 360 - ${currentItem.title}`;
    }
  }, [location.pathname]);

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
              backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: isActive ? 'var(--bg-container)' : 'var(--text-light)',
              borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent',
            })}
          >
            <span style={styles.icon}>{item.icon}</span>
            <span style={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        {user.nombre && (
          <div style={{ color: 'var(--border-input)', fontSize: '11px', marginBottom: '12px', fontWeight: '600', textAlign: 'center', lineHeight: '1.2' }}>
            {user.nombre}
          </div>
        )}
        <button 
          onClick={() => {
            localStorage.removeItem('usuario');
            window.location.href = '/login';
          }}
          style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px', width: '100%' }}
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
    width: '100px',
    height: '100vh',
    background: '#2d2d2d',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 1000,
    boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
  },
  logoContainer: {
    padding: '20px 10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '10px'
  },
  logo: {
    width: '50px',
    height: 'auto',
    objectFit: 'contain'
  },
  nav: {
    padding: '5px 0',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  navLink: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 5px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    textAlign: 'center'
  },
  icon: {
    fontSize: '22px',
    marginBottom: '4px',
  },
  label: {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  footer: {
    padding: '15px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  version: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    fontWeight: 'bold',
  }
};

export default Sidebar;
