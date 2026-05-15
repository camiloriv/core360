import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { crearEncuesta, obtenerTemplates } from "../services/encuestaService";
import {
  getEjecutivas,
  getEmpresasByJefatura,
  getJefaturas,
} from "../services/dataService";
import SelectEmpresa from "../components/form/fields/SelectEmpresa";
import SelectJefatura from "../components/form/fields/SelectJefatura";
import SelectEjecutiva from "../components/form/fields/SelectEjecutiva";
import "../styles/agoras-theme.css";

function CrearEncuesta() {
  const [jefaturas, setJefaturas] = useState([]);
  const [ejecutivas, setEjecutivas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [form, setForm] = useState({
    jefatura_id: "",
    ejecutiva_id: "",
    empresa_id: "",
    tipo_encuesta: "",
    reunion_id: "",
    enviado_a: ""
  });

  const [url, setUrl] = useState("");

  const [emailDestino, setEmailDestino] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  // 🔹 Cargar datos iniciales
  useEffect(() => {
    document.title = "CORE 360 - Crear Encuesta";
    getJefaturas().then(setJefaturas);
    getEjecutivas().then(setEjecutivas);
    obtenerTemplates().then(setTemplates);
  }, []);

  // 🔹 Cargar empresas según jefatura
  useEffect(() => {
    if (form.jefatura_id) {
      getEmpresasByJefatura(form.jefatura_id).then(setEmpresas);
    } else {
      setEmpresas([]);
    }
  }, [form.jefatura_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await crearEncuesta(form);
    setUrl(res.url);
    // Guardar el ID de la encuesta generada para el envío de correo
    setGeneratedId(res.id);
  };

  const filteredEjecutivas = ejecutivas.filter(e => 
    !form.jefatura_id || e.jefatura_id === parseInt(form.jefatura_id)
  );

  const [generatedId, setGeneratedId] = useState(null);

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
      // Necesitamos importar enviarCorreoEncuesta
      const { enviarCorreoEncuesta } = await import("../services/encuestaService");
      await enviarCorreoEncuesta(emailDestino, url, generatedId);
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
    <div className="container">
      <div style={{ marginBottom: "25px" }}>
        <div className="title">Crear Encuesta</div>
        <div className="subtitle">
          Selecciona ejecutiva, empresa y tipo
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* 🔹 JEFATURA */}
          <SelectJefatura 
            value={form.jefatura_id}
            jefaturas={jefaturas}
            onChange={(e) =>
              setForm({
                ...form,
                jefatura_id: e.target.value,
                ejecutiva_id: "",
                empresa_id: "",
              })
            }
          />

          {/* 🔹 EJECUTIVA */}
          <SelectEjecutiva 
            value={form.ejecutiva_id}
            ejecutivas={filteredEjecutivas}
            onChange={(e) =>
              setForm({
                ...form,
                ejecutiva_id: e.target.value,
              })
            }
          />
        </div>

        {/* 🔹 EMPRESA (Buscador Inteligente) */}
        <SelectEmpresa
          value={form.empresa_id}
          empresas={empresas}
          onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
          disabled={!form.jefatura_id}
        />

        {/* 🔹 ID REUNION */}
        <div className="field">
          <label>ID REUNIÓN (OPCIONAL)</label>
          <input 
            type="number" 
            placeholder="Ej: 1024"
            value={form.reunion_id}
            onChange={(e) => setForm({ ...form, reunion_id: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
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

        <button type="submit">
          Generar encuesta
        </button>
      </form>

      {/* 🔹 URL GENERADA Y ENVÍO POR CORREO */}
      {url && (
        <div className="link-box" style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <strong style={{ display: 'block', marginBottom: '8px', color: '#334155' }}>Link generado:</strong>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer"
              style={{ flex: 1, wordBreak: 'break-all', color: '#2563eb', textDecoration: 'none' }}
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
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#2563eb'}
              onMouseOut={(e) => e.target.style.background = '#3b82f6'}
            >
              Copiar
            </button>
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '15px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#334155' }}>Enviar a:</strong>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="email" 
                placeholder="correo@empresa.com" 
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <button 
                type="button" 
                onClick={handleEnviarCorreo}
                disabled={enviandoCorreo}
                style={{
                  background: '#10b981', // Verde esmeralda
                  color: 'white',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: enviandoCorreo ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  opacity: enviandoCorreo ? 0.7 : 1,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => { if(!enviandoCorreo) e.target.style.background = '#059669' }}
                onMouseOut={(e) => { if(!enviandoCorreo) e.target.style.background = '#10b981' }}
              >
                {enviandoCorreo ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrearEncuesta;
