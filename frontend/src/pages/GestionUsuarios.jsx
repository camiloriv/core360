import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "../styles/core360-theme.css";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const ALL_VIEWS = [
  { path: "/registrar-reunion", label: "Registrar Reunión" },
  { path: "/crear-encuesta", label: "Crear Encuesta" },
  { path: "/dashboard-reuniones", label: "Mis reuniones" },
  { path: "/dashboard-encuestas", label: "Mis encuestas" },
  { path: "/editor-encuestas", label: "Editar encuestas" },
  { path: "/gestion-empresas", label: "Empresas" },
  { path: "/seguimiento-empresas", label: "Cobertura" },
  { path: "/gestion-usuarios", label: "Usuarios" }
];

const getDefaultViewsForRole = (role) => {
  switch (role) {
    case "admin":
      return [
        "/registrar-reunion",
        "/crear-encuesta",
        "/dashboard-reuniones",
        "/dashboard-encuestas",
        "/editor-encuestas",
        "/gestion-empresas",
        "/seguimiento-empresas",
        "/gestion-usuarios"
      ];
    case "gerencia":
      return [
        "/registrar-reunion",
        "/crear-encuesta",
        "/dashboard-reuniones",
        "/dashboard-encuestas",
        "/seguimiento-empresas"
      ];
    case "jefatura":
    case "ejecutiva":
      return [
        "/registrar-reunion",
        "/crear-encuesta",
        "/dashboard-reuniones",
        "/dashboard-encuestas",
        "/editor-encuestas",
        "/seguimiento-empresas"
      ];
    default:
      return [
        "/registrar-reunion",
        "/crear-encuesta",
        "/dashboard-reuniones",
        "/dashboard-encuestas",
        "/seguimiento-empresas"
      ];
  }
};

const GestionUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [jefaturas, setJefaturas] = useState([]);
  const [gerencias, setGerencias] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [form, setForm] = useState({ id: null, nombre: '', correo: '', contrasena: '', permisos: 'ejecutiva', cargos: '', jefatura_id: '', gerencia_id: '', gerencia_ids: [], zona_id: '', vistas_permitidas: getDefaultViewsForRole('ejecutiva') });
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('listado'); // 'listado' | 'organigrama'
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [empresas, setEmpresas] = useState([]);

  const toggleNode = (nodeId) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const fetchData = async () => {
    try {
      const [resUsr, resZonas, resEmps] = await Promise.all([
        axios.get(`${API_URL}/usuarios`),
        axios.get(`${API_URL}/zonas`),
        axios.get(`${API_URL}/empresas`)
      ]);
      setUsuarios(resUsr.data);
      setJefaturas(resUsr.data.filter(u => u.permisos === 'jefatura' || u.permisos === 'admin'));
      setGerencias(resUsr.data.filter(u => u.permisos === 'gerencia' || u.permisos === 'admin'));
      setZonas(resZonas.data);
      setEmpresas(resEmps.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    if (e.target.name === "permisos") {
      const newRole = e.target.value;
      setForm({ 
        ...form, 
        permisos: newRole, 
        vistas_permitidas: getDefaultViewsForRole(newRole)
      });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isEditing) {
        await axios.put(`${API_URL}/usuarios/${form.id}`, form);
      } else {
        await axios.post(`${API_URL}/usuarios`, form);
      }
      setForm({ id: null, nombre: '', correo: '', contrasena: '', permisos: 'ejecutiva', cargos: '', jefatura_id: '', gerencia_id: '', gerencia_ids: [], zona_id: '', vistas_permitidas: getDefaultViewsForRole('ejecutiva') });
      setIsEditing(false);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Error al guardar el usuario');
    }
  };

  const handleEdit = (u) => {
    const selectedGerencias = u.gerencia_ids 
      ? u.gerencia_ids.split(',').map(id => Number(id)) 
      : (u.gerencia_id ? [Number(u.gerencia_id)] : []);

    let selectedVistas = [];
    if (u.vistas_permitidas) {
      try {
        selectedVistas = typeof u.vistas_permitidas === "string"
          ? JSON.parse(u.vistas_permitidas)
          : u.vistas_permitidas;
      } catch (e) {
        console.error("Error parsing vistas_permitidas", e);
        selectedVistas = getDefaultViewsForRole(u.permisos || 'ejecutiva');
      }
    } else {
      selectedVistas = getDefaultViewsForRole(u.permisos || 'ejecutiva');
    }

    setForm({
      id: u.id,
      nombre: u.nombre || '',
      correo: u.correo || '',
      contrasena: u.contrasena || '',
      permisos: u.permisos || 'ejecutiva',
      cargos: u.cargos || '',
      jefatura_id: u.jefatura_id || '',
      gerencia_id: u.gerencia_id || '',
      gerencia_ids: selectedGerencias,
      zona_id: u.zona_id || '',
      vistas_permitidas: selectedVistas
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      await axios.delete(`${API_URL}/usuarios/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Error al eliminar');
    }
  };

  const handleCancel = () => {
    setForm({ id: null, nombre: '', correo: '', contrasena: '', permisos: 'ejecutiva', cargos: '', jefatura_id: '', gerencia_id: '', gerencia_ids: [], zona_id: '', vistas_permitidas: getDefaultViewsForRole('ejecutiva') });
    setIsEditing(false);
    setIsModalOpen(false);
    setError('');
  };

  const handleNewUser = () => {
    setForm({ id: null, nombre: '', correo: '', contrasena: '', permisos: 'ejecutiva', cargos: '', jefatura_id: '', gerencia_id: '', gerencia_ids: [], zona_id: '', vistas_permitidas: getDefaultViewsForRole('ejecutiva') });
    setIsEditing(false);
    setError('');
    setIsModalOpen(true);
  };

  // Helper for generating dynamic user avatar initials
  const getIniciales = (nombre) => {
    if (!nombre) return "?";
    const partes = nombre.trim().split(" ");
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0][0].toUpperCase();
  };

  // Dynamic soft gradients for avatars
  const getAvatarGradient = (id) => {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #a855f7)', // Indigo to Purple
      'linear-gradient(135deg, #3b82f6, #2563eb)', // Blue
      'linear-gradient(135deg, #10b981, #059669)', // Emerald
      'linear-gradient(135deg, #f59e0b, #d97706)', // Amber
      'linear-gradient(135deg, #ec4899, #d946ef)', // Pink/Fuchsia
      'linear-gradient(135deg, #14b8a6, #0d9488)', // Teal
    ];
    const index = id ? Number(id) : 0;
    return gradients[index % gradients.length];
  };

  // Sort: Jerárquico (Gerencia -> Jefatura -> Ejecutiva)
  const getSortKey = (u) => {
    if (u.permisos === 'admin') return `1_admin_${u.nombre}`;
    
    if (u.permisos === 'gerencia') return `2_gerencia_${u.nombre}`;
    
    if (u.permisos === 'jefatura') {
      const gId = u.gerencia_ids ? u.gerencia_ids.split(',')[0] : u.gerencia_id;
      const gerencia = usuarios.find(x => x.id === Number(gId));
      const gerenciaKey = gerencia ? `2_gerencia_${gerencia.nombre}` : `2_gerencia_ZZZ_SinGerencia`;
      return `${gerenciaKey}_3_jefatura_${u.nombre}`;
    }
    
    if (u.permisos === 'ejecutiva') {
      const jefatura = usuarios.find(x => x.id === u.jefatura_id);
      let gerenciaKey = `2_gerencia_ZZZ_SinGerencia`;
      let jefaturaName = `ZZZ_SinJefatura`;
      
      if (jefatura) {
        jefaturaName = jefatura.nombre;
        const gId = jefatura.gerencia_ids ? jefatura.gerencia_ids.split(',')[0] : jefatura.gerencia_id;
        const gerencia = usuarios.find(x => x.id === Number(gId));
        if (gerencia) {
          gerenciaKey = `2_gerencia_${gerencia.nombre}`;
        }
      }
      return `${gerenciaKey}_3_jefatura_${jefaturaName}_4_ejecutiva_${u.nombre}`;
    }
    
    return `5_otros_${u.nombre}`;
  };

  const usuariosFiltradosYOrdenados = usuarios
    .filter(u => {
      const term = filtroBusqueda.toLowerCase();
      return (
        u.nombre.toLowerCase().includes(term) ||
        u.correo.toLowerCase().includes(term) ||
        (u.cargos && u.cargos.toLowerCase().includes(term)) ||
        u.permisos.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const keyA = getSortKey(a);
      const keyB = getSortKey(b);
      return keyA.localeCompare(keyB);
    });

  const admins = usuarios.filter(u => u.permisos === 'admin');
  const gerenciasLista = usuarios.filter(u => u.permisos === 'gerencia');
  const jefaturasLista = usuarios.filter(u => u.permisos === 'jefatura');
  const ejecutivasLista = usuarios.filter(u => u.permisos === 'ejecutiva');

  // Relación: Jefatura a Gerencia
  const jefaturaPerteneceAGerencia = (jef, gerId) => {
    if (jef.gerencia_ids) {
      const ids = jef.gerencia_ids.split(',').map(id => Number(id.trim()));
      return ids.includes(Number(gerId));
    }
    return Number(jef.gerencia_id) === Number(gerId);
  };

  // Jefaturas sin Gerencia
  const jefaturasSinGerencia = jefaturasLista.filter(j => {
    const hasGerIds = j.gerencia_ids && j.gerencia_ids.trim() !== '';
    const hasGerId = j.gerencia_id !== null && j.gerencia_id !== undefined && j.gerencia_id !== '';
    return !hasGerIds && !hasGerId;
  });

  // Ejecutivas sin Jefatura
  const ejecutivasSinJefatura = ejecutivasLista.filter(e => !e.jefatura_id);

  // Helper to count companies for a user in the organigrama
  const getEmpresasCount = (u) => {
    if (!u) return 0;
    if (u.permisos === 'admin') {
      return empresas.length;
    }
    if (u.permisos === 'gerencia') {
      // Direct companies + companies under Jefaturas belonging to this Gerencia
      return empresas.filter(emp => {
        if (Number(emp.jefatura_id) === Number(u.id)) return true;
        const underJefs = jefaturasLista.filter(jef => jefaturaPerteneceAGerencia(jef, u.id));
        return underJefs.some(jef => Number(emp.jefatura_id) === Number(jef.id));
      }).length;
    }
    if (u.permisos === 'jefatura') {
      // Direct companies + companies belonging to her division's Gerencia
      return empresas.filter(emp => {
        if (Number(emp.jefatura_id) === Number(u.id)) return true;
        const gerIds = [];
        if (u.gerencia_ids) {
          gerIds.push(...u.gerencia_ids.split(',').map(id => Number(id.trim())));
        }
        if (u.gerencia_id) {
          gerIds.push(Number(u.gerencia_id));
        }
        return gerIds.includes(Number(emp.jefatura_id));
      }).length;
    }
    if (u.permisos === 'ejecutiva') {
      // Inherited from her Jefatura + her Jefatura's Gerencia division
      const jef = jefaturasLista.find(j => Number(j.id) === Number(u.jefatura_id));
      if (!jef) return 0;
      return empresas.filter(emp => {
        if (Number(emp.jefatura_id) === Number(jef.id)) return true;
        const gerIds = [];
        if (jef.gerencia_ids) {
          gerIds.push(...jef.gerencia_ids.split(',').map(id => Number(id.trim())));
        }
        if (jef.gerencia_id) {
          gerIds.push(Number(jef.gerencia_id));
        }
        return gerIds.includes(Number(emp.jefatura_id));
      }).length;
    }
    return 0;
  };

  return (
    <div className="encuesta-page" style={{ background: 'var(--bg-body)', minHeight: '100vh' }}>
      <div className="container" style={{ padding: "30px 20px" }}>
        {/* Style injection to cleanly suppress default browser focus outline and shadow for our search field */}
        <style>{`
          .no-focus-outline:focus {
            outline: none !important;
            border: none !important;
            border-color: transparent !important;
            box-shadow: none !important;
          }
          
          /* Custom Organigrama Styles */
          .tab-btn {
            padding: 10px 24px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 100px;
            border: 1.5px solid #e2e8f0;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            outline: none;
            background-color: white;
            color: #64748b;
          }
          .tab-btn.active {
            background-color: var(--secondary-color);
            color: white;
            border-color: var(--secondary-color);
            box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);
          }
          .tab-btn:hover:not(.active) {
            background-color: #f8fafc;
            border-color: #cbd5e1;
            color: #334155;
            transform: translateY(-1px);
          }
          .tab-btn:active {
            transform: translateY(0);
          }
          
          /* Organigrama Cards */
          .org-card-admin, .org-card-gerencia, .org-card-jefatura, .org-card-ejecutiva {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
          }
          .org-card-admin:hover, .org-card-gerencia:hover, .org-card-jefatura:hover, .org-card-ejecutiva:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -5px rgba(15, 23, 42, 0.08) !important;
          }
          .org-card-admin:active, .org-card-gerencia:active, .org-card-jefatura:active, .org-card-ejecutiva:active {
            transform: translateY(0);
          }
          
          /* Toggle button styles */
          .org-toggle-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .org-toggle-btn:hover {
            background: rgba(0, 0, 0, 0.05);
            transform: scale(1.1);
          }
        `}</style>
        
        {/* Header Container */}
        <header className="page-header">
          <div className="page-title-area" style={{ marginBottom: "30px" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 
                className="page-title"
                style={{
                  borderBottom: "2px solid var(--secondary-color)",
                  paddingBottom: "8px",
                  display: "inline-block",
                  marginBottom: "0",
                }}
              >
                Gestión de Usuarios
              </h1>
              <span style={{ ...styles.countBadge, margin: 0 }}>{usuarios.length} usuarios</span>
            </div>
            <p className="page-subtitle">ADMINISTRACIÓN DE COLABORADORES, ASIGNACIÓN DE ROLES, JEFATURAS Y ZONAS</p>
          </div>
          <button onClick={handleNewUser} className="btn-header-primary">
            <span style={{ marginRight: '6px' }}>+</span> Nuevo Usuario
          </button>
        </header>

        {/* Navigation Tabs */}
        <div style={styles.tabsContainer}>
          <button 
            className={`tab-btn ${activeTab === 'listado' ? 'active' : ''}`}
            onClick={() => setActiveTab('listado')}
          >
            📋 Listado de Usuarios
          </button>
          <button 
            className={`tab-btn ${activeTab === 'organigrama' ? 'active' : ''}`}
            onClick={() => setActiveTab('organigrama')}
          >
            🌳 Organigrama de Equipos
          </button>
        </div>

      {/* Render based on active tab */}
      {activeTab === 'listado' ? (
        <>
          {/* Modern Filter / Search Section */}
          <div style={styles.filterSection}>
            <div style={{
              ...styles.searchWrapper,
              borderColor: isSearchFocused ? '#2563eb' : '#e2e8f0',
              boxShadow: isSearchFocused ? '0 0 0 3px rgba(37,99,235,0.15)' : '0 2px 5px rgba(0,0,0,0.02)'
            }}>
              <span style={styles.searchIcon}>🔍</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, correo, cargo o rol..." 
                value={filtroBusqueda} 
                onChange={(e) => setFiltroBusqueda(e.target.value)} 
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="no-focus-outline"
                style={styles.searchInput}
              />
              {filtroBusqueda && (
                <button onClick={() => setFiltroBusqueda('')} style={styles.clearSearchBtn}>✕</button>
              )}
            </div>
          </div>

          {/* Main Table Container */}
          <div style={styles.tableWrapper}>
            {usuariosFiltradosYOrdenados.length === 0 ? (
              <div style={styles.noResults}>
                <span style={{ fontSize: '40px', marginBottom: '10px', display: 'block' }}>🔍</span>
                <p style={{ margin: 0, fontWeight: '500', color: 'var(--text-muted)' }}>No se encontraron usuarios que coincidan con la búsqueda.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{ ...styles.th, width: '25%' }}>Nombre</th>
                    <th style={{ ...styles.th, width: '20%' }}>Permisos</th>
                    <th style={{ ...styles.th, width: '30%' }}>Cargo / Zona</th>
                    <th style={{ ...styles.th, width: '25%' }}>Reporta A</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltradosYOrdenados.map((u, idx) => (
                    <tr 
                      key={u.id} 
                      style={{ ...styles.tbodyRow, background: idx % 2 === 0 ? 'transparent' : '#f8fafc', cursor: 'pointer' }}
                      onClick={() => handleEdit(u)}
                      title="Haz clic para editar"
                    >
                      <td style={styles.td}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>{u.nombre}</div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.roleBadge,
                          background: u.permisos === 'admin' ? '#f3e8ff' : u.permisos === 'jefatura' ? '#e0f2fe' : '#f1f5f9',
                          color: u.permisos === 'admin' ? '#6b21a8' : u.permisos === 'jefatura' ? '#0369a1' : '#475569',
                          border: u.permisos === 'admin' ? '1px solid #e9d5ff' : u.permisos === 'jefatura' ? '1px solid #bae6fd' : '1px solid #e2e8f0'
                        }}>
                          {u.permisos.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontSize: '13px', color: '#475569' }}>
                        <div style={{ fontWeight: '600', color: '#334155' }}>
                          {u.cargos || <span style={{ color: '#cbd5e1', fontWeight: '400' }}>Sin cargo</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📍 {u.zona_nombre || <span style={{ color: '#cbd5e1' }}>—</span>}
                        </div>
                      </td>
                      <td style={{...styles.td, whiteSpace: 'nowrap'}}>
                        {u.jefatura_nombre ? (
                          <span style={{...styles.jefaturaLink, whiteSpace: 'nowrap'}}>
                            👤 Jef: {u.jefatura_nombre}
                          </span>
                        ) : u.gerencia_nombre ? (
                          <span style={{...styles.jefaturaLink, background: '#fef3c7', color: '#b45309', whiteSpace: 'nowrap'}}>
                            👔 Ger: {u.gerencia_nombre}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Organigrama View */
        <div style={styles.organigramaSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #eff6ff', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌳 Jerarquía Organizacional
            </h3>
            {/* Minimalist Key/Legend */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '100px', background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>ADMIN</span>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '100px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>GERENCIA</span>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '100px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>JEFATURA</span>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '100px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>EJECUTIVA</span>
            </div>
          </div>

          {/* 1. Global Administrators Section */}
          {admins.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px', fontWeight: '700' }}>
                🔑 Administración Global y Soporte del Sistema
              </h4>
              <div style={styles.adminGrid}>
                {admins.map(u => (
                  <div key={u.id} className="org-card-admin" style={styles.adminCard} onClick={() => handleEdit(u)} title="Haga clic para editar">
                    <div style={styles.cardHeader}>
                      <span style={styles.adminBadge}>ADMINISTRADOR</span>
                      <span style={styles.empresasCount}>🏢 {getEmpresasCount(u)} {getEmpresasCount(u) === 1 ? 'Empresa' : 'Empresas'}</span>
                      <span style={{ fontSize: '12px', opacity: 0.5 }}>✏️</span>
                    </div>
                    <div style={styles.cardName}>{u.nombre}</div>
                    <div style={styles.cardEmail}>{u.correo}</div>
                    <div style={styles.cardCargo}>{u.cargos || 'Administrador'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Main Hierarchy Tree Section */}
          <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px', fontWeight: '700' }}>
              👔 Estructura Divisional de Operations
            </h4>
            <div style={{ minWidth: '400px' }}>
            {gerenciasLista.map(g => {
              const directJefaturas = jefaturasLista.filter(j => jefaturaPerteneceAGerencia(j, g.id));
              const isCollapsed = collapsedNodes[`gerencia_${g.id}`];

              return (
                <div key={g.id} style={styles.gerenciaWrapper}>
                  {/* Gerencia Card */}
                  <div className="org-card-gerencia" style={styles.gerenciaCard} onClick={() => handleEdit(g)} title="Haga clic para editar">
                    <div style={styles.cardLayout}>
                      <div style={styles.avatarArea}>
                        <div style={{ ...styles.avatarCircle, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>👔</div>
                      </div>
                      <div style={styles.cardDetails}>
                        <div style={styles.cardHeaderArea}>
                          <span style={styles.gerenciaBadge}>GERENCIA</span>
                          <span style={styles.reportsCount}>{directJefaturas.length} Jefaturas a cargo</span>
                          <span style={styles.empresasCount}>🏢 {getEmpresasCount(g)} {getEmpresasCount(g) === 1 ? 'Empresa' : 'Empresas'}</span>
                        </div>
                        <div style={styles.cardName}>{g.nombre}</div>
                        <div style={styles.cardEmail}>{g.correo}</div>
                        <div style={styles.cardCargo}>{g.cargos || 'Gerente Divisional'}</div>
                      </div>
                      <div 
                        style={styles.toggleArea} 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleNode(`gerencia_${g.id}`); 
                        }} 
                        title={isCollapsed ? "Expandir equipo" : "Colapsar equipo"}
                      >
                        <button className="org-toggle-btn" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Jefaturas under this Gerencia */}
                  {!isCollapsed && (
                    <div style={styles.jefaturasContainer}>
                      {directJefaturas.length > 0 ? (
                        directJefaturas.map(j => {
                          const directEjecutivas = ejecutivasLista.filter(e => Number(e.jefatura_id) === Number(j.id));
                          const isJefCollapsed = collapsedNodes[`jefatura_${j.id}`];

                          return (
                            <div key={j.id} style={styles.jefaturaWrapper}>
                              {/* Horizontal connector line */}
                              <div style={styles.horizontalConnector} />

                              {/* Jefatura Card */}
                              <div className="org-card-jefatura" style={styles.jefaturaCard} onClick={() => handleEdit(j)} title="Haga clic para editar">
                                <div style={styles.cardLayout}>
                                  <div style={styles.avatarArea}>
                                    <div style={{ ...styles.avatarCircle, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>👤</div>
                                  </div>
                                  <div style={styles.cardDetails}>
                                    <div style={styles.cardHeaderArea}>
                                      <span style={styles.jefaturaBadge}>JEFATURA</span>
                                      <span style={styles.reportsCount}>{directEjecutivas.length} Ejecutivas a cargo</span>
                                      <span style={styles.empresasCount}>🏢 {getEmpresasCount(j)} {getEmpresasCount(j) === 1 ? 'Empresa' : 'Empresas'}</span>
                                    </div>
                                    <div style={styles.cardName}>{j.nombre}</div>
                                    <div style={styles.cardEmail}>{j.correo}</div>
                                    <div style={styles.cardCargo}>{j.cargos || 'Jefe de Cuentas'}</div>
                                    {j.zona_nombre && (
                                      <div style={styles.cardLocation}>📍 Zona: {j.zona_nombre}</div>
                                    )}
                                  </div>
                                  <div 
                                    style={styles.toggleArea} 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      toggleNode(`jefatura_${j.id}`); 
                                    }} 
                                    title={isJefCollapsed ? "Expandir equipo" : "Colapsar equipo"}
                                  >
                                    <button className="org-toggle-btn" style={{ transform: isJefCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                                      ▼
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Ejecutivas under this Jefatura */}
                              {!isJefCollapsed && (
                                <div style={styles.ejecutivasContainer}>
                                  {directEjecutivas.length > 0 ? (
                                    directEjecutivas.map(e => (
                                      <div key={e.id} style={styles.ejecutivaWrapper}>
                                        {/* Horizontal connector line */}
                                        <div style={styles.horizontalConnector} />

                                        {/* Ejecutiva Card */}
                                        <div className="org-card-ejecutiva" style={styles.ejecutivaCard} onClick={() => handleEdit(e)} title="Haga clic para editar">
                                          <div style={styles.cardLayout}>
                                            <div style={styles.avatarArea}>
                                              <div style={{ ...styles.avatarCircle, background: 'linear-gradient(135deg, #10b981, #059669)' }}>👩‍💼</div>
                                            </div>
                                            <div style={styles.cardDetails}>
                                              <div style={styles.cardHeaderArea}>
                                                <span style={styles.ejecutivaBadge}>EJECUTIVA</span>
                                                <span style={styles.empresasCount}>🏢 {getEmpresasCount(e)} {getEmpresasCount(e) === 1 ? 'Empresa' : 'Empresas'}</span>
                                              </div>
                                              <div style={styles.cardName}>{e.nombre}</div>
                                              <div style={styles.cardEmail}>{e.correo}</div>
                                              <div style={styles.cardCargo}>{e.cargos || 'Ejecutiva de Cuentas'}</div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div style={{ position: 'relative' }}>
                                      <div style={styles.horizontalConnector} />
                                      <div style={styles.emptyChildMessage}>
                                        ⚠️ Sin ejecutivas asignadas en el equipo
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <div style={styles.horizontalConnector} />
                          <div style={styles.emptyChildMessage}>
                            ⚠️ Sin jefaturas asignadas a esta gerencia
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Fallback Section 1: Jefaturas sin Gerencia */}
            {jefaturasSinGerencia.length > 0 && (
              <div style={styles.gerenciaWrapper}>
                <div style={styles.fallbackHeaderCard}>
                  👔 Jefaturas de Equipo - Independientes o Sin Gerencia Asignada
                </div>
                <div style={styles.jefaturasContainer}>
                  {jefaturasSinGerencia.map(j => {
                    const directEjecutivas = ejecutivasLista.filter(e => Number(e.jefatura_id) === Number(j.id));
                    const isJefCollapsed = collapsedNodes[`jefatura_${j.id}`];

                    return (
                      <div key={j.id} style={styles.jefaturaWrapper}>
                        <div style={styles.horizontalConnector} />

                        <div className="org-card-jefatura" style={styles.jefaturaCard} onClick={() => handleEdit(j)} title="Haga clic para editar">
                          <div style={styles.cardLayout}>
                            <div style={styles.avatarArea}>
                              <div style={{ ...styles.avatarCircle, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>👤</div>
                            </div>
                            <div style={styles.cardDetails}>
                              <div style={styles.cardHeaderArea}>
                                <span style={styles.jefaturaBadge}>JEFATURA</span>
                                <span style={styles.reportsCount}>{directEjecutivas.length} Ejecutivas a cargo</span>
                              </div>
                              <div style={styles.cardName}>{j.nombre}</div>
                              <div style={styles.cardEmail}>{j.correo}</div>
                              <div style={styles.cardCargo}>{j.cargos || 'Jefe de Cuentas'}</div>
                              {j.zona_nombre && (
                                <div style={styles.cardLocation}>📍 Zona: {j.zona_nombre}</div>
                              )}
                            </div>
                            <div 
                              style={styles.toggleArea} 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                toggleNode(`jefatura_${j.id}`); 
                              }} 
                              title={isJefCollapsed ? "Expandir equipo" : "Colapsar equipo"}
                            >
                              <button className="org-toggle-btn" style={{ transform: isJefCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                                ▼
                              </button>
                            </div>
                          </div>
                        </div>

                        {!isJefCollapsed && (
                          <div style={styles.ejecutivasContainer}>
                            {directEjecutivas.length > 0 ? (
                              directEjecutivas.map(e => (
                                <div key={e.id} style={styles.ejecutivaWrapper}>
                                  <div style={styles.horizontalConnector} />
                                  <div className="org-card-ejecutiva" style={styles.ejecutivaCard} onClick={() => handleEdit(e)} title="Haga clic para editar">
                                    <div style={styles.cardLayout}>
                                      <div style={styles.avatarArea}>
                                        <div style={{ ...styles.avatarCircle, background: 'linear-gradient(135deg, #10b981, #059669)' }}>👩‍💼</div>
                                      </div>
                                      <div style={styles.cardDetails}>
                                        <div style={styles.cardHeaderArea}>
                                          <span style={styles.ejecutivaBadge}>EJECUTIVA</span>
                                        </div>
                                        <div style={styles.cardName}>{e.nombre}</div>
                                        <div style={styles.cardEmail}>{e.correo}</div>
                                        <div style={styles.cardCargo}>{e.cargos || 'Ejecutiva de Cuentas'}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ position: 'relative' }}>
                                <div style={styles.horizontalConnector} />
                                <div style={styles.emptyChildMessage}>
                                  ⚠️ Sin ejecutivas asignadas en el equipo
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback Section 2: Ejecutivas sin Jefatura */}
            {ejecutivasSinJefatura.length > 0 && (
              <div style={styles.gerenciaWrapper}>
                <div style={{ ...styles.fallbackHeaderCard, background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}>
                  👩‍💼 Ejecutivas Independientes o Sin Jefatura Asignada
                </div>
                <div style={{ ...styles.jefaturasContainer, borderLeft: '2px dashed #cbd5e1', marginLeft: '12px' }}>
                  {ejecutivasSinJefatura.map(e => (
                    <div key={e.id} style={styles.ejecutivaWrapper}>
                      <div style={styles.horizontalConnector} />
                      <div className="org-card-ejecutiva" style={styles.ejecutivaCard} onClick={() => handleEdit(e)} title="Haga clic para editar">
                        <div style={styles.cardLayout}>
                          <div style={styles.avatarArea}>
                            <div style={{ ...styles.avatarCircle, background: 'linear-gradient(135deg, #10b981, #059669)' }}>👩‍💼</div>
                          </div>
                          <div style={styles.cardDetails}>
                            <div style={styles.cardHeaderArea}>
                              <span style={styles.ejecutivaBadge}>EJECUTIVA</span>
                            </div>
                            <div style={styles.cardName}>{e.nombre}</div>
                            <div style={styles.cardEmail}>{e.correo}</div>
                            <div style={styles.cardCargo}>{e.cargos || 'Ejecutiva de Cuentas'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Modal Form Overlay */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{
            ...styles.modalContent,
            maxWidth: (form.permisos === 'jefatura' || form.permisos === 'gerencia') ? '980px' : '720px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>
                {isEditing ? '✏️ Editar Usuario' : '👤 Nuevo Usuario'}
              </h3>
              <button onClick={handleCancel} style={styles.modalCloseBtn}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{
              display: 'grid',
              gridTemplateColumns: (form.permisos === 'jefatura' || form.permisos === 'gerencia') ? '1.3fr 1fr 1fr' : '1fr 1fr',
              gap: '20px',
              alignItems: 'start'
            }}>
              
              {/* COLUMN 1: Datos de Usuario & Acciones */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={styles.label}>Nombre Completo</label>
                  <input type="text" name="nombre" value={form.nombre} onChange={handleChange} style={styles.input} required placeholder="Ej: Beatriz Silva" />
                </div>
                
                <div>
                  <label style={styles.label}>Correo Electrónico</label>
                  <input type="email" name="correo" value={form.correo} onChange={handleChange} style={styles.input} required placeholder="Ej: bsilva@proforma.cl" />
                </div>
                
                <div>
                  <label style={styles.label}>Cargo específico</label>
                  <input type="text" name="cargos" value={form.cargos} onChange={handleChange} style={styles.input} placeholder="Ej: Jefatura de Operaciones" />
                </div>
                
                <div>
                  <label style={styles.label}>Contraseña</label>
                  <input 
                    type="text" 
                    name="contrasena" 
                    value={form.contrasena} 
                    onChange={handleChange} 
                    style={{
                      ...styles.input,
                      backgroundColor: isEditing ? '#f8fafc' : 'white',
                      cursor: isEditing ? 'not-allowed' : 'text',
                      color: isEditing ? '#64748b' : '#334155',
                      borderColor: isEditing ? '#e2e8f0' : '#cbd5e1'
                    }} 
                    required={!isEditing} 
                    readOnly={isEditing}
                    title={isEditing ? "La contraseña no se puede modificar desde aquí por seguridad" : ""}
                    placeholder="Contraseña" 
                  />
                </div>
                
                <div>
                  <label style={styles.label}>Rol / Permisos</label>
                  <select name="permisos" value={form.permisos} onChange={handleChange} style={styles.input} required>
                    <option value="ejecutiva">Ejecutiva</option>
                    <option value="jefatura">Jefatura</option>
                    <option value="gerencia">Gerencia</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                
                {form.permisos === 'ejecutiva' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={styles.label}>Jefatura asignada (Hereda Zona)</label>
                    <select name="jefatura_id" value={form.jefatura_id} onChange={handleChange} style={styles.input}>
                      <option value="">Ninguna</option>
                      {jefaturas.map(j => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {form.permisos === 'jefatura' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={styles.label}>Zona Asignada</label>
                    <select name="zona_id" value={form.zona_id} onChange={handleChange} style={styles.input}>
                      <option value="">Ninguna</option>
                      {zonas.map(z => (
                        <option key={z.id} value={z.id}>{z.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', alignItems: 'center' }}>
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => {
                          handleDelete(form.id);
                          setIsModalOpen(false);
                      }} 
                      style={{...styles.buttonSecondary, color: 'var(--danger-color)', border: '1px solid #fecaca', background: '#fef2f2', padding: '8px 12px', fontSize: '13px', margin: 0}}
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                  <button type="button" onClick={handleCancel} style={{ ...styles.buttonSecondary, padding: '8px 12px', fontSize: '13px', margin: 0, marginLeft: 'auto' }}>Cancelar</button>
                  <button type="submit" style={{ ...styles.buttonPrimary, padding: '8px 16px', fontSize: '13px', margin: 0 }}>{isEditing ? 'Actualizar' : 'Guardar'}</button>
                </div>
                {error && <div style={{ gridColumn: 'span 2' }}><p style={{ color: 'var(--danger-color)', margin: '8px 0 0 0', fontWeight: '500', fontSize: '13px' }}>⚠️ {error}</p></div>}
              </div>

              {/* COLUMN 2 (Conditional): Reporta a (Gerencias a cargo) */}
              {(form.permisos === 'jefatura' || form.permisos === 'gerencia') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: 'bold', marginBottom: '2px' }}>
                    <span>🏢</span> Reporta a
                  </label>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px 0', lineHeight: '1.3' }}>
                    Gerencias a las que reporta.
                  </p>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    backgroundColor: '#f8fafc',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1'
                  }}>
                    {gerencias.filter(g => g.id !== form.id).length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '4px' }}>
                        No hay otras gerencias.
                      </span>
                    ) : (
                      gerencias
                        .filter(g => g.id !== form.id)
                        .map(g => {
                          const isSelected = form.gerencia_ids && form.gerencia_ids.includes(g.id);
                          return (
                            <label
                              key={g.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                                backgroundColor: isSelected ? '#eff6ff' : 'white',
                                color: isSelected ? '#1d4ed8' : '#475569',
                                fontWeight: isSelected ? '700' : '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                userSelect: 'none'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const currentIds = form.gerencia_ids || [];
                                  const newIds = isSelected
                                    ? currentIds.filter(id => id !== g.id)
                                    : [...currentIds, g.id];
                                  setForm({ ...form, gerencia_ids: newIds });
                                }}
                                style={{
                                  width: '14px',
                                  height: '14px',
                                  cursor: 'pointer'
                                }}
                              />
                              <span>{g.nombre}</span>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* COLUMN 3: Vistas Permitidas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: 'bold', marginBottom: '2px' }}>
                  <span>🛡️</span> Vistas Permitidas
                </label>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px 0', lineHeight: '1.3' }}>
                  Accesos del menú lateral.
                </p>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: '#f8fafc',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1'
                }}>
                  {ALL_VIEWS.map(view => {
                    const isAllowed = form.vistas_permitidas && form.vistas_permitidas.includes(view.path);
                    return (
                      <label 
                        key={view.path} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${isAllowed ? '#3b82f6' : '#cbd5e1'}`,
                          backgroundColor: isAllowed ? '#eff6ff' : 'white',
                          color: isAllowed ? '#1d4ed8' : '#475569',
                          fontWeight: isAllowed ? '700' : '600',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={() => {
                            const current = form.vistas_permitidas || [];
                            const updated = isAllowed
                              ? current.filter(p => p !== view.path)
                              : [...current, view.path];
                            setForm({ ...form, vistas_permitidas: updated });
                          }}
                          style={{
                            width: '14px',
                            height: '14px',
                            cursor: 'pointer'
                          }}
                        />
                        <span>{view.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

const styles = {
  tabsContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '16px',
    width: '100%'
  },
  organigramaSection: {
    background: 'white',
    borderRadius: 'var(--radius-card)',
    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
    border: '1px solid #f1f5f9',
    padding: '28px',
    marginBottom: '28px',
    width: '100%',
    boxSizing: 'border-box'
  },
  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '8px'
  },
  adminCard: {
    background: '#faf5ff',
    border: '1.5px solid #e9d5ff',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(107, 33, 168, 0.02)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  adminBadge: {
    background: '#f3e8ff',
    color: '#6b21a8',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '100px',
    letterSpacing: '0.05em'
  },
  cardName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '2px'
  },
  cardEmail: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '8px',
    wordBreak: 'break-all'
  },
  cardCargo: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569'
  },
  gerenciaWrapper: {
    marginBottom: '28px',
    position: 'relative'
  },
  gerenciaCard: {
    background: '#fffbeb',
    border: '2px solid #fde68a',
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.05)',
    position: 'relative'
  },
  cardLayout: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    flexWrap: 'wrap'
  },
  avatarArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  cardDetails: {
    flexGrow: 1
  },
  cardHeaderArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '6px'
  },
  gerenciaBadge: {
    background: '#fef3c7',
    color: '#b45309',
    fontSize: '10px',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '100px',
    letterSpacing: '0.05em'
  },
  reportsCount: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    background: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '100px'
  },
  empresasCount: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#065f46',
    background: '#d1fae5',
    padding: '2px 8px',
    borderRadius: '100px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  toggleArea: {
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px'
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 0,
    minWidth: 'auto'
  },
  jefaturasContainer: {
    marginLeft: '16px',
    paddingLeft: '16px',
    borderLeft: '2px dashed #cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '12px',
    position: 'relative'
  },
  jefaturaWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  horizontalConnector: {
    position: 'absolute',
    left: '-20px',
    top: '32px',
    width: '20px',
    height: '2px',
    backgroundColor: '#cbd5e1',
    zIndex: 1
  },
  jefaturaCard: {
    background: '#eff6ff',
    border: '2px solid #bfdbfe',
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.03)',
    position: 'relative',
    zIndex: 2
  },
  jefaturaBadge: {
    background: '#dbeafe',
    color: '#1e40af',
    fontSize: '10px',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '100px',
    letterSpacing: '0.05em'
  },
  cardLocation: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    marginTop: '4px',
    display: 'inline-block',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  ejecutivasContainer: {
    marginLeft: '16px',
    paddingLeft: '16px',
    borderLeft: '2px dashed #cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
    position: 'relative'
  },
  ejecutivaWrapper: {
    position: 'relative'
  },
  ejecutivaCard: {
    background: '#f0fdf4',
    border: '1.5px solid #bbf7d0',
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.02)',
    position: 'relative',
    zIndex: 2
  },
  ejecutivaBadge: {
    background: '#dcfce7',
    color: '#15803d',
    fontSize: '10px',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '100px',
    letterSpacing: '0.05em'
  },
  fallbackHeaderCard: {
    background: '#f8fafc',
    border: '1.5px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '14px 20px',
    fontWeight: '700',
    fontSize: '13px',
    color: '#475569',
    marginBottom: '12px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  emptyChildMessage: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
    marginLeft: '2px',
    position: 'relative',
    zIndex: 2,
    display: 'inline-block'
  },
  countBadge: {
    padding: '4px 10px',
    background: '#e2e8f0',
    color: '#475569',
    borderRadius: '100px',
    fontSize: '12px',
    fontWeight: '600'
  },
  filterSection: {
    marginBottom: '18px',
    display: 'flex',
    justifyContent: 'flex-start',
    width: '100%'
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '450px',
    background: 'white',
    borderRadius: 'var(--radius-btn)',
    border: '1px solid #e2e8f0',
    padding: '0 12px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
    transition: 'border-color 0.2s'
  },
  searchIcon: {
    fontSize: '14px',
    color: '#94a3b8',
    marginRight: '8px'
  },
  searchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    padding: '10px 0',
    fontSize: '14px',
    color: '#334155',
    background: 'transparent'
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 8px'
  },
  label: { 
    display: 'block', 
    fontSize: '12px', 
    fontWeight: '600', 
    marginBottom: '4px', 
    color: '#475569' 
  },
  input: { 
    width: '100%', 
    padding: '8px 12px', 
    borderRadius: 'var(--radius-btn)', 
    border: '1px solid #cbd5e1', 
    fontSize: '13px', 
    boxSizing: 'border-box',
    color: '#334155',
    outline: 'none',
    transition: 'border-color 0.2s',
    '&:focus': {
      borderColor: 'var(--secondary-color)'
    }
  },
  buttonPrimary: { 
    padding: '10px 22px', 
    background: 'var(--secondary-color)', 
    color: 'white', 
    border: 'none', 
    borderRadius: 'var(--radius-btn)', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background 0.2s'
  },
  buttonSecondary: { 
    padding: '10px 22px', 
    background: '#f1f5f9', 
    color: '#475569', 
    border: 'none', 
    borderRadius: 'var(--radius-btn)', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  tableWrapper: { 
    background: 'white', 
    borderRadius: 'var(--radius-card)', 
    boxShadow: '0 4px 18px rgba(0,0,0,0.03)', 
    border: '1px solid #f1f5f9',
    overflow: 'hidden' 
  },
  theadRow: {
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  tbodyRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.15s ease'
  },
  th: { 
    padding: '14px 20px', 
    textAlign: 'left', 
    fontSize: '12px', 
    fontWeight: '700', 
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  td: { 
    padding: '14px 20px', 
    fontSize: '14px', 
    color: '#334155',
    verticalAlign: 'middle'
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '13px',
    letterSpacing: '0.05em',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  roleBadge: {
    padding: '4px 10px', 
    borderRadius: 'var(--radius-btn)', 
    fontSize: '11px', 
    fontWeight: '700', 
    display: 'inline-block',
    letterSpacing: '0.02em'
  },
  jefaturaLink: {
    fontSize: '13px', 
    color: '#0284c7', 
    fontWeight: '600',
    background: '#e0f2fe',
    padding: '4px 8px',
    borderRadius: 'var(--radius-btn)'
  },
  actionBtnEdit: {
    padding: '6px 14px', 
    borderRadius: 'var(--radius-btn)', 
    fontSize: '12px', 
    fontWeight: 'bold', 
    border: 'none', 
    cursor: 'pointer', 
    background: '#eff6ff', 
    color: 'var(--secondary-color)', 
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#dbeafe'
    }
  },
  actionBtnDelete: {
    padding: '6px 14px', 
    borderRadius: 'var(--radius-btn)', 
    fontSize: '12px', 
    fontWeight: 'bold', 
    border: 'none', 
    cursor: 'pointer', 
    background: '#fef2f2', 
    color: 'var(--danger-color)', 
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#fee2e2'
    }
  },
  noResults: {
    padding: '50px 20px',
    textAlign: 'center'
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px 8px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    padding: '24px 28px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '980px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    maxHeight: '95vh',
    overflowY: 'auto',
    boxSizing: 'border-box'
  }
};

export default GestionUsuarios;
