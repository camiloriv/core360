import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const Login = () => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { correo, contrasena });
      localStorage.setItem('usuario', JSON.stringify(data));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Iniciar Sesión</h2>
        <p style={styles.subtitle}>CORE 360</p>
        <form onSubmit={handleLogin} style={styles.form} autoComplete="off">
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo</label>
            <input 
              type="email" 
              value={correo} 
              onChange={(e) => setCorreo(e.target.value)} 
              style={styles.input}
              required 
              autoComplete="off"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={contrasena} 
                onChange={(e) => setContrasena(e.target.value)} 
                style={{ ...styles.input, width: '100%', paddingRight: '45px', boxSizing: 'border-box' }}
                required 
                autoComplete="new-password"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleButton}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button}>Ingresar</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' },
  card: { background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
  title: { fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '5px', textAlign: 'center' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '30px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' },
  button: { background: 'var(--secondary-color)', color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  error: { color: 'var(--danger-color)', fontSize: '14px', textAlign: 'center' },
  toggleButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    color: '#64748b',
    userSelect: 'none'
  }
};

export default Login;
