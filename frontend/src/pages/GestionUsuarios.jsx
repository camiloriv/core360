import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const GestionUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [jefaturas, setJefaturas] = useState([]);
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
      contrasena: u.contrasena || '', // Cargar contraseña actual para editarla
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

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Gestión de Usuarios</h2>
        <button onClick={handleNewUser} style={styles.buttonPrimary}>+ Nuevo Usuario</button>
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-main)' }}>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={styles.label}>Nombre</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} style={styles.input} required />
              </div>
              <div>
                <label style={styles.label}>Correo</label>
                <input type="email" name="correo" value={form.correo} onChange={handleChange} style={styles.input} required />
              </div>
              <div>
                <label style={styles.label}>Contraseña</label>
                <input type="text" name="contrasena" value={form.contrasena} onChange={handleChange} style={styles.input} required={!isEditing} placeholder={isEditing ? 'Dejar en blanco para no cambiar' : ''} />
              </div>
              <div>
                <label style={styles.label}>Permisos</label>
                <select name="permisos" value={form.permisos} onChange={handleChange} style={styles.input} required>
                  <option value="ejecutiva">Ejecutiva</option>
                  <option value="jefatura">Jefatura</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div style={{ gridColumn: form.permisos === 'ejecutiva' ? 'auto' : '1 / -1' }}>
                <label style={styles.label}>Cargos</label>
                <input type="text" name="cargos" value={form.cargos} onChange={handleChange} style={styles.input} />
              </div>
              {form.permisos === 'ejecutiva' && (
                <div>
                  <label style={styles.label}>Jefatura a cargo</label>
                  <select name="jefatura_id" value={form.jefatura_id} onChange={handleChange} style={styles.input}>
                    <option value="">Ninguna</option>
                    {jefaturas.map(j => (
                      <option key={j.id} value={j.id}>{j.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleCancel} style={styles.buttonSecondary}>Cancelar</button>
                <button type="submit" style={styles.buttonPrimary}>{isEditing ? 'Actualizar' : 'Guardar'}</button>
              </div>
              {error && <p style={{ color: 'var(--danger-color)', gridColumn: '1 / -1', margin: 0 }}>{error}</p>}
            </form>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg-muted)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Correo</th>
              <th style={styles.th}>Permisos</th>
              <th style={styles.th}>Cargo</th>
              <th style={styles.th}>Jefatura Asignada</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={styles.td}>{u.nombre}</td>
                <td style={styles.td}>{u.correo}</td>
                <td style={styles.td}>
                  <span style={{
                    padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                    background: u.permisos === 'admin' ? '#fef08a' : u.permisos === 'jefatura' ? '#bfdbfe' : 'var(--bg-muted)',
                    color: u.permisos === 'admin' ? '#854d0e' : u.permisos === 'jefatura' ? 'var(--primary-color)' : 'var(--text-muted)'
                  }}>
                    {u.permisos.toUpperCase()}
                  </span>
                </td>
                <td style={styles.td}>{u.cargos || '-'}</td>
                <td style={styles.td}>{u.jefatura_nombre || '-'}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleEdit(u)} style={styles.btnIcon} title="Editar">✏️</button>
                    <button onClick={() => handleDelete(u.id)} style={{ ...styles.btnIcon, color: 'var(--danger-color)' }} title="Eliminar">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  label: { display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: 'var(--text-muted)' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-input)', fontSize: '14px', boxSizing: 'border-box' },
  buttonPrimary: { padding: '10px 20px', background: 'var(--secondary-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  buttonSecondary: { padding: '10px 20px', background: 'var(--border-color)', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  th: { padding: '12px 15px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' },
  td: { padding: '12px 15px', fontSize: '14px', color: 'var(--text-main)' },
  btnIcon: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.7, transition: 'opacity 0.2s ease' },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '600px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    maxHeight: '90vh',
    overflowY: 'auto'
  }
};

export default GestionUsuarios;
