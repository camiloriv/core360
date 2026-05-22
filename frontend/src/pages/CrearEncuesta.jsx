import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { crearEncuesta, obtenerTemplates, enviarCorreoEncuesta } from "../services/encuestaService";
import {
  getEmpresas,
  getEmpresasByJefatura,
  getEmpresasByEjecutiva,
} from "../services/dataService";
import SelectEmpresa from "../components/form/fields/SelectEmpresa";
import "../styles/agoras-theme.css";

function CrearEncuesta() {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");

  const [empresas, setEmpresas] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [form, setForm] = useState({
    ejecutiva_id: user.id, // el creador de la encuesta
    empresa_id: "",
    tipo_encuesta: "",
    reunion_id: "",
    enviado_a: ""
  });

  const [url, setUrl] = useState("");
  const [emailDestino, setEmailDestino] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [generatedId, setGeneratedId] = useState(null);

  // 🔹 Cargar datos iniciales
  useEffect(() => {
    document.title = "CORE 360 - Crear Encuesta";
    obtenerTemplates().then(setTemplates);

    if (user.permisos === "admin") {
      getEmpresas().then(setEmpresas);
    } else if (user.permisos === "jefatura") {
      getEmpresasByJefatura(user.id).then(setEmpresas);
    } else if (user.jefatura_id) {
      getEmpresasByJefatura(user.jefatura_id).then(setEmpresas);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.empresa_id || !form.tipo_encuesta) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Debe seleccionar una empresa y un tipo de encuesta",
        confirmButtonColor: "#3085d6"
      });
      return;
    }

    const res = await crearEncuesta(form);
    setUrl(res.url);
    setGeneratedId(res.id);
  };

  const handleEnviarCorreo = async () => {
    if (!emailDestino) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "Ingresa un correo electrónico",
        confirmButtonColor: "#3085d6"
      });
      return;
    }
    
    setEnviandoCorreo(true);
    try {
      await enviarCorreoEncuesta(emailDestino, url, generatedId, user.nombre);
      Swal.fire({
        icon: "success",
        title: "¡Enviado!",
        text: "El correo se envió correctamente.",
        confirmButtonColor: "#3085d6"
      });
      setEmailDestino("");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Hubo un problema al enviar el correo.",
        confirmButtonColor: "#d33"
      });
    } finally {
      setEnviandoCorreo(false);
    }
  };

  return (
    <div className="encuesta-page" style={{ background: '#f8fafc', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="container">
        <div style={{ marginBottom: "30px" }}>
          <h1
            className="page-title"
            style={{
              borderBottom: "2px solid var(--secondary-color)",
              paddingBottom: "8px",
              display: "inline-block",
              marginBottom: "8px",
            }}
          >
            Crear Encuesta
          </h1>
          <p className="page-subtitle">SELECCIONA LA EMPRESA Y EL TIPO DE ENCUESTA</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 🔹 EMPRESA (Buscador Inteligente) */}
          <SelectEmpresa
            value={form.empresa_id}
            empresas={empresas}
            onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
          />

          {/* 🔹 ID REUNION */}
          <div className="field">
            <label>ID REUNIÓN (OPCIONAL)</label>
            <input 
              type="number" 
              placeholder="Ej: 1024"
              value={form.reunion_id}
              onChange={(e) => setForm({ ...form, reunion_id: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)' }}
            />
          </div>

          {/* 🔹 TIPO ENCUESTA */}
          <div className="field">
            <label>TIPO DE ENCUESTA</label>
            <select
              value={form.tipo_encuesta}
              onChange={(e) =>
                setForm({ ...form, tipo_encuesta: e.target.value })
              }
            >
              <option value="">Seleccionar tipo</option>
              {templates.map(t => (
                <option key={t.id} value={t.nombre}>{t.nombre.charAt(0).toUpperCase() + t.nombre.slice(1)}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn">
            Generar encuesta
          </button>
        </form>

        {/* 🔹 URL GENERADA Y ENVÍO POR CORREO */}
        {url && (
          <div className="link-box" style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-body)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-color)' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>Link generado:</strong>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer"
                style={{ flex: 1, wordBreak: 'break-all', color: 'var(--primary-hover)', textDecoration: 'none' }}
              >
                {url}
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: '¡Link copiado al portapapeles!',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                  });
                }}
                style={{
                  background: 'var(--secondary-color)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-btn)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'var(--primary-hover)'}
                onMouseOut={(e) => e.target.style.background = 'var(--secondary-color)'}
              >
                Copiar
              </button>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-input)', paddingTop: '15px' }}>
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>Enviar a:</strong>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="email" 
                  placeholder="correo@empresa.com" 
                  value={emailDestino}
                  onChange={(e) => setEmailDestino(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-btn)', border: '1px solid var(--border-input)', fontSize: '13px' }}
                />
                <button 
                  type="button" 
                  onClick={handleEnviarCorreo}
                  disabled={enviandoCorreo}
                  style={{
                    background: 'var(--success-color)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-btn)',
                    cursor: enviandoCorreo ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    opacity: enviandoCorreo ? 0.7 : 1,
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => { if(!enviandoCorreo) e.target.style.background = '#059669' }}
                  onMouseOut={(e) => { if(!enviandoCorreo) e.target.style.background = 'var(--success-color)' }}
                >
                  {enviandoCorreo ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrearEncuesta;
