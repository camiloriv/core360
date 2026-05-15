import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "../styles/agoras-theme.css";
import {
  obtenerEncuesta,
  responderEncuesta,
} from "../services/encuestaService";

function ResponderEncuesta() {
  const { token } = useParams();

  const [encuesta, setEncuesta] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await obtenerEncuesta(token);
        setEncuesta(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [token]);

  const handleChange = (id, value) => {
    setRespuestas((prev) => ({
      ...prev,
      [id]: value,
    }));

    // 🔥 auto avanzar solo para opciones (escala, seleccion, nps), NO para texto o seleccion_multiple
    const preguntaActual = encuesta.preguntas.find(p => p.id === id);
    const autoadvanceTypes = ["escala", "nps", "seleccion", "seleccion_unica"];
    
    if (preguntaActual && autoadvanceTypes.includes(preguntaActual.tipo)) {
      setTimeout(() => {
        if (index < encuesta.preguntas.length - 1) {
          setIndex((prev) => prev + 1);
        }
      }, 400);
    }
  };

  const handleNext = () => {
    if (index < encuesta.preguntas.length - 1) {
      setIndex(index + 1);
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const handleSubmit = async () => {
    const faltantes = encuesta.preguntas.filter(
      (p) => p.requerida && !respuestas[p.id]
    );

    if (faltantes.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "Responde todas las preguntas obligatorias antes de finalizar",
        confirmButtonColor: "#3085d6"
      });
      return;
    }

    try {
      setEnviando(true);

      await responderEncuesta({
        encuesta_id: encuesta.id,
        respuestas_json: respuestas,
      });

      Swal.fire({
        icon: "success",
        title: "¡Gracias!",
        text: "Tu opinión ha sido registrada exitosamente. 🚀",
        confirmButtonColor: "#3085d6"
      });
      setEncuesta(prev => ({ ...prev, completada: 1 }));
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Hubo un problema al enviar tus respuestas. Inténtalo de nuevo.",
        confirmButtonColor: "#d33"
      });
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="container public-container" style={{ padding: "100px", textAlign: "center" }}>
        <p style={{ color: "#64748b", fontWeight: "bold" }}>Cargando encuesta...</p>
      </div>
    );
  }

  if (!encuesta) {
    return (
      <div className="container public-container" style={{ textAlign: "center", padding: "100px 20px" }}>
        <div style={{ fontSize: "60px", marginBottom: "20px" }}>⚠️</div>
        <h2 style={{ color: "#64748b" }}>Encuesta no disponible</h2>
        <p style={{ color: "#94a3b8" }}>Este enlace ha sido desactivado o ya no es válido.</p>
      </div>
    );
  }

  if (encuesta.completada) {
    return (
      <div className="encuesta-page">
        <header className="agoras-header" style={{ justifyContent: 'flex-end' }}>
          <div className="cek-logo" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right', textTransform: 'uppercase' }}>
            {encuesta.empresa}
          </div>
        </header>

        <div className="container public-container" style={{ textAlign: "center", padding: "100px 20px" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>✅</div>
          <h2 style={{ color: "#1e3a8a", marginBottom: "10px" }}>¡Gracias por tu participación!</h2>
          <p style={{ color: "#64748b", fontSize: "16px" }}>
            Tus respuestas han sido procesadas correctamente. Valoramos mucho tu opinión.
          </p>
        </div>
      </div>
    );
  }

  const total = encuesta.preguntas.length;
  const respondidas = Object.keys(respuestas).length;
  const progreso = (respondidas / total) * 100;
  const pregunta = encuesta.preguntas[index];

  return (
    <div className="encuesta-page">
      <header className="agoras-header" style={{ justifyContent: 'flex-end' }}>
        <div className="cek-logo" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right', textTransform: 'uppercase' }}>
          {encuesta.empresa}
        </div>
      </header>

      <div className="container public-container">
        <div className="title" style={{ fontSize: '24px', color: '#1e3a8a', marginBottom: '10px' }}>{encuesta.template}</div>

        <div className="subtitle" style={{ color: '#64748b', fontWeight: '600', marginBottom: '15px' }}>
          PREGUNTA {index + 1} DE {total}
        </div>

        {/* 🔹 PROGRESS BAR */}
        <div className="progress-bar" style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '40px' }}>
          <div
            className="progress-fill"
            style={{ width: `${progreso}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }}
          />
        </div>

        {/* 🔹 PREGUNTA ACTUAL */}
        <div key={pregunta.id} className="pregunta fade" style={{ minHeight: '200px' }}>
          <p style={{ fontSize: '18px', color: '#334155', fontWeight: '600', lineHeight: '1.5', marginBottom: '30px' }}>
            {pregunta.texto}
            {pregunta.requerida === 1 && (
              <span style={{ color: "#ef4444", marginLeft: '5px' }}>*</span>
            )}
          </p>

          {/* TEXTO (LIBRE) */}
          {pregunta.tipo === "texto" && (
            <textarea
              className="agoras-textarea"
              placeholder="Escribe tu comentario aquí..."
              value={respuestas[pregunta.id] || ""}
              onChange={(e) => handleChange(pregunta.id, e.target.value)}
              style={{ width: '100%', minHeight: '120px', padding: '15px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
            />
          )}

          {/* SELECCIÓN ÚNICA (RADIO) o tipo "seleccion" */}
          {(pregunta.tipo === "seleccion_unica" || pregunta.tipo === "seleccion") && (
            <div className="radio-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pregunta.opciones?.map((opt) => {
                const isSelected = respuestas[pregunta.id] === opt;
                return (
                  <label key={opt} className={`radio-option ${isSelected ? 'selected' : ''}`} style={{ padding: '15px', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: isSelected ? '#eff6ff' : '#fff', borderColor: isSelected ? '#3b82f6' : '#e2e8f0' }}>
                    <input
                      type="radio"
                      name={pregunta.id}
                      value={opt}
                      checked={isSelected}
                      onChange={(e) => handleChange(pregunta.id, e.target.value)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: isSelected ? '700' : '500', color: isSelected ? '#1e40af' : '#475569' }}>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* SELECCIÓN MÚLTIPLE (CHECKBOX) */}
          {pregunta.tipo === "seleccion_multiple" && (
            <div className="radio-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pregunta.opciones?.map((opt) => {
                const currentValues = respuestas[pregunta.id] || [];
                const isSelected = currentValues.includes(opt);
                return (
                  <label key={opt} className={`radio-option ${isSelected ? 'selected' : ''}`} style={{ padding: '15px', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: isSelected ? '#f0fdf4' : '#fff', borderColor: isSelected ? '#22c55e' : '#e2e8f0' }}>
                    <input
                      type="checkbox"
                      value={opt}
                      checked={isSelected}
                      onChange={(e) => {
                        const newValues = isSelected 
                          ? currentValues.filter(v => v !== opt)
                          : [...currentValues, opt];
                        handleChange(pregunta.id, newValues);
                      }}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: isSelected ? '700' : '500', color: isSelected ? '#166534' : '#475569' }}>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* ESCALA NUMÉRICA (1-N) o NPS (1-10) */}
          {(pregunta.tipo === "escala" || pregunta.tipo === "nps" || pregunta.es_nps === 1) && (
            <div style={{ width: "100%" }}>
              <div className="radio-group scale-group" style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {Array.from(
                  { length: (pregunta.tipo === "nps" || pregunta.es_nps === 1) ? 10 : (pregunta.escala || 5) }, 
                  (_, i) => i + 1
                ).map((n) => {
                  const isSelected = respuestas[pregunta.id] === n;
                  return (
                    <label key={n} className={`radio-option scale-option ${isSelected ? 'selected' : ''}`} style={{ width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: isSelected ? '#3b82f6' : '#fff', borderColor: isSelected ? '#2563eb' : '#e2e8f0', color: isSelected ? '#fff' : '#475569', fontWeight: 'bold' }}>
                      <input
                        type="radio"
                        name={pregunta.id}
                        value={n}
                        checked={isSelected}
                        onChange={() => handleChange(pregunta.id, n)}
                        style={{ display: 'none' }}
                      />
                      <span>{n}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px", fontSize: "12px", color: "#64748b", fontWeight: "700", padding: "0 5px", textTransform: "uppercase" }}>
                <span>Nada probable</span>
                <span>Muy probable</span>
              </div>
            </div>
          )}
        </div>

        {/* 🔹 NAVEGACIÓN */}
        <div className="nav-buttons" style={{ display: 'flex', justifyContent: index === 0 ? 'flex-end' : 'space-between', marginTop: '50px', borderTop: '1px solid #f1f5f9', paddingTop: '30px' }}>
          {index > 0 && (
            <button 
              className="btn-secondary" 
              onClick={handlePrev} 
              style={{ padding: '12px 25px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ← Anterior
            </button>
          )}

          {index === total - 1 ? (
            <button 
                onClick={handleSubmit} 
                disabled={enviando}
                style={{ padding: '12px 40px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
            >
              {enviando ? "Enviando..." : "Finalizar y Enviar"}
            </button>
          ) : (
            <button 
                onClick={handleNext}
                style={{ padding: '12px 40px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)' }}
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResponderEncuesta;
