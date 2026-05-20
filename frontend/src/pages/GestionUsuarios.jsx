import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const GestionUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [jefaturas, setJefaturas] = useState([]);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [form, setForm] = useState({ id: null, nombre: '', correo: '', contrasena: '', permisos: 'ejecutiva', cargos: '', jefatura_id: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchUsuarios = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/usuarios`);
      setUsuarios(data);
      setJefaturas(data.filter(u => u.permisos === 'jefatura' || u.permisos === 'admin'));
    } catch (err) {
      console.error(err);
      setError('Error al cargar usuarios');
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      setForm({ id: null, nombre: '', correo: '', contrasena: '', permisos: 'ejecutiva', cargos: '', jefatura_id: '' });
      setIsEditing(false);
      setIsModalOpen(false);
      fetchUsuarios();
    } catch (err) {
      console.error(err);
      setError('Error al guardar el usuario');
    }
  };

  const handleEdit = (u) => {
    setForm({
      id: u.id,
      nombre: u.nombre || '',
      correo: u.correo || '',
      contrasena: u.contrasena || '',
      permisos: u.permisos || 'ejecutiva',
      cargos: u.cargos || '',
      jefatura_id: u.jefatura_id || ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      await axios.delete(`${API_URL}/usuarios/${id}`);
      fetchUsuarios();
    } catch (err) {
      console.error(err);
      setError('Error al eliminar');
    }
  };

  const handleCancel = () => {
    setForm({ id: null, nombre: '', correo: '', contrasena: '', permisos: 'ejecutiva', cargos: '', jefatura_id: '' });
    setIsEditing(false);
    setIsModalOpen(false);
    setError('');
  };

  const handleNewUser = () => {
    setForm({ id: null, nombre: '', correo: '', contrasena: '', permisos: 'ejecutiva', cargos: '', jefatura_id: '' });
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

  // Sort: 1. Admin, 2. Jefatura, 3. Ejecutiva. Alphabetical within each role.
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
      const prioridad = { admin: 1, jefatura: 2, ejecutiva: 3 };
      const prioA = prioridad[a.permisos] || 3;
      const prioB = prioridad[b.permisos] || 3;

      if (prioA !== prioB) {
        return prioA - prioB;
      }
      return a.nombre.localeCompare(b.nombre);
    });

  return (
    <div style={{ padding: '30px', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      {/* Style injection to cleanly suppress default browser focus outline and shadow for our search field */}
      <style>{`
        .no-focus-outline:focus {
          outline: none !important;
          border: none !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Header Container */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Gestión de Usuarios</h2>
          <span style={styles.countBadge}>{usuarios.length} usuarios</span>
        </div>
        <button onClick={handleNewUser} style={styles.buttonPrimary}>
          <span style={{ marginRight: '6px' }}>+</span> Nuevo Usuario
        </button>
      </div>

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

      {/* Modal Form Overlay */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>
                {isEditing ? '✏️ Editar Usuario' : '👤 Nuevo Usuario'}
              </h3>
              <button onClick={handleCancel} style={styles.modalCloseBtn}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              <div>
                <label style={styles.label}>Nombre Completo</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} style={styles.input} required placeholder="Ej: Beatriz Silva" />
              </div>
              <div>
                <label style={styles.label}>Correo Electrónico</label>
                <input type="email" name="correo" value={form.correo} onChange={handleChange} style={styles.input} required placeholder="Ej: bsilva@proforma.cl" />
              </div>
              <div>
                <label style={styles.label}>Contraseña</label>
                <input 
                  type="text" 
                  name="contrasena" 
                  value={form.contrasena} 
                  onChange={handleChange} 
                  style={styles.input} 
                  required={!isEditing} 
                  placeholder={isEditing ? 'Dejar en blanco para conservar' : 'Contraseña de ingreso'} 
                />
              </div>
              <div>
                <label style={styles.label}>Rol / Permisos</label>
                <select name="permisos" value={form.permisos} onChange={handleChange} style={styles.input} required>
                  <option value="ejecutiva">Ejecutiva</option>
                  <option value="jefatura">Jefatura</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div style={{ gridColumn: form.permisos === 'ejecutiva' ? 'auto' : '1 / -1' }}>
                <label style={styles.label}>Cargo específico</label>
                <input type="text" name="cargos" value={form.cargos} onChange={handleChange} style={styles.input} placeholder="Ej: Jefatura de Operaciones" />
              </div>
              {form.permisos === 'ejecutiva' && (
                <div>
                  <label style={styles.label}>Jefatura asignada</label>
                  <select name="jefatura_id" value={form.jefatura_id} onChange={handleChange} style={styles.input}>
                    <option value="">Ninguna</option>
                    {jefaturas.map(j => (
                      <option key={j.id} value={j.id}>{j.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button type="button" onClick={handleCancel} style={styles.buttonSecondary}>Cancelar</button>
                <button type="submit" style={styles.buttonPrimary}>{isEditing ? 'Actualizar' : 'Guardar'}</button>
              </div>
              {error && <p style={{ color: 'var(--danger-color)', gridColumn: '1 / -1', margin: '10px 0 0 0', fontWeight: '500' }}>⚠️ {error}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Main Table Container (Premium Glassmorphic Look) */}
      <div style={styles.tableWrapper}>
        {usuariosFiltradosYOrdenados.length === 0 ? (
          <div style={styles.noResults}>
            <span style={{ fontSize: '40px', marginBottom: '10px', display: 'block' }}>🔍</span>
            <p style={{ margin: 0, fontWeight: '500', color: 'var(--text-muted)' }}>No se encontraron usuarios que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '35%' }}>Nombre / Correo</th>
                <th style={{ ...styles.th, width: '15%' }}>Permisos</th>
                <th style={{ ...styles.th, width: '20%' }}>Cargo</th>
                <th style={{ ...styles.th, width: '15%' }}>Jefatura Asignada</th>
                <th style={{ ...styles.th, width: '15%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltradosYOrdenados.map((u, idx) => (
                <tr key={u.id} style={{ ...styles.tbodyRow, background: idx % 2 === 0 ? 'transparent' : '#f8fafc' }}>
                  {/* Name & Avatar Column */}
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Generative Gradient Avatar */}
                      <div style={{ ...styles.avatar, background: getAvatarGradient(u.id) }}>
                        {getIniciales(u.nombre)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>{u.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{u.correo}</div>
                      </div>
                    </div>
                  </td>
                  {/* Permissions Tag Column */}
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
                  {/* Cargo Column */}
                  <td style={{ ...styles.td, fontSize: '13px', color: '#475569' }}>
                    {u.cargos || <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  {/* Assigned Jefatura Column */}
                  <td style={styles.td}>
                    {u.jefatura_nombre ? (
                      <span style={styles.jefaturaLink}>
                        👤 {u.jefatura_nombre}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  {/* Actions Column */}
                  <td style={{ ...styles.td, padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEdit(u)} 
                        style={styles.actionBtnEdit}
                        title="Editar usuario"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)} 
                        style={styles.actionBtnDelete}
                        title="Eliminar usuario"
                      >
                        🚫 Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles = {
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
    borderRadius: '10px',
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
    fontSize: '13px', 
    fontWeight: '600', 
    marginBottom: '6px', 
    color: '#475569' 
  },
  input: { 
    width: '100%', 
    padding: '10px 12px', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    fontSize: '14px', 
    boxSizing: 'border-box',
    color: '#334155',
    outline: 'none',
    transition: 'border-color 0.2s',
    '&:focus': {
      borderColor: 'var(--primary-color)'
    }
  },
  buttonPrimary: { 
    padding: '10px 22px', 
    background: '#2563eb', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
    transition: 'background 0.2s'
  },
  buttonSecondary: { 
    padding: '10px 22px', 
    background: '#f1f5f9', 
    color: '#475569', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  tableWrapper: { 
    background: 'white', 
    borderRadius: '12px', 
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
    borderRadius: '6px', 
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
    borderRadius: '6px'
  },
  actionBtnEdit: {
    padding: '6px 14px', 
    borderRadius: '8px', 
    fontSize: '12px', 
    fontWeight: 'bold', 
    border: 'none', 
    cursor: 'pointer', 
    background: '#eff6ff', 
    color: '#2563eb', 
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#dbeafe'
    }
  },
  actionBtnDelete: {
    padding: '6px 14px', 
    borderRadius: '8px', 
    fontSize: '12px', 
    fontWeight: 'bold', 
    border: 'none', 
    cursor: 'pointer', 
    background: '#fef2f2', 
    color: '#dc2626', 
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
    borderRadius: '16px',
    width: '100%',
    maxWidth: '650px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    maxHeight: '90vh',
    overflowY: 'auto'
  }
};

export default GestionUsuarios;
