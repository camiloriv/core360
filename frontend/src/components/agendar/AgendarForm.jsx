import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

import useReunionesData from "../../hooks/reuniones/useReunionesData";
import { crearReunionTeams } from "../../services/agendamientoService";
import FormSection from "../form/core/FormSection";
import SelectEmpresa from "../form/fields/SelectEmpresa";
import AutocompleteInput from "../form/fields/AutocompleteInput";

const AgendarForm = ({ selectedDate, selectedEndDate, onFormSubmitSuccess }) => {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  
  const [form, setForm] = useState({
    empresa_id: "",
    destinatarios: "", // Para contactos externos
    asistentes_internos: "", // Para contactos internos (jefaturas/ejecutivas)
    fecha: "",
    hora: "",
    duracion: "30",
    asunto: "",
    detalle: "",
    modalidad: "Teams",
    direccion: ""
  });
  
  const [loading, setLoading] = useState(false);

  // Hook existente para obtener empresas, destinatarios, etc.
  const { empresas, fetchEmpresas, destinatarios, ejecutivas } = useReunionesData(user, form.empresa_id);

  // Cuando se hace click en el calendario (selectedDate / selectedEndDate), actualizar el form
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const fecha = d.toISOString().split("T")[0];
      const hora = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      
      let duracion = "30"; // Default
      if (selectedEndDate) {
        const startMs = d.getTime();
        const endMs = new Date(selectedEndDate).getTime();
        const diffMinutes = Math.round((endMs - startMs) / 60000);
        if (diffMinutes > 0) {
          duracion = String(diffMinutes);
        }
      }
      
      setForm(prev => ({ ...prev, fecha, hora, duracion }));
    }
  }, [selectedDate, selectedEndDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAutocompleteChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!form.empresa_id || !form.fecha || !form.hora || !form.asunto) {
      return Swal.fire("Campos Incompletos", "Por favor completa la Empresa, Fecha, Hora y Asunto", "warning");
    }

    setLoading(true);
    try {
      const res = await crearReunionTeams(form);
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "¡Reunión Agendada!",
          text: "El evento se ha creado en Microsoft Teams",
          confirmButtonColor: "var(--secondary-color)",
        });
        // Reset form
        setForm({
          empresa_id: "", destinatarios: "", asistentes_internos: "", 
          fecha: "", hora: "", duracion: "30", asunto: "", detalle: "", modalidad: "Teams", direccion: ""
        });
        if (onFormSubmitSuccess) onFormSubmitSuccess();
      }
    } catch (error) {
      Swal.fire("Error", "No se pudo agendar la reunión", "error");
    } finally {
      setLoading(false);
    }
  };

  const defaultDurations = ["15", "30", "45", "60", "90", "120"];
  const isCustomDuration = form.duracion && !defaultDurations.includes(form.duracion);

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <FormSection title={`DETALLES DEL EVENTO (${form.modalidad === "Presencial" ? "PRESENCIAL" : "TEAMS"})`}>
          <div className="form-group full-width" style={{ marginBottom: '15px' }}>
            <SelectEmpresa 
              value={form.empresa_id} 
              onChange={handleChange} 
              empresas={empresas} 
            />
          </div>
          <div className="form-group full-width" style={{ marginBottom: '15px' }}>
            <label>MODALIDAD *</label>
            <select name="modalidad" value={form.modalidad} onChange={handleChange} required>
              <option value="Teams">Reunión por Teams</option>
              <option value="Presencial">Reunión Presencial</option>
            </select>
          </div>
          
          {form.modalidad === "Presencial" && (
            <div className="form-group full-width" style={{ marginBottom: '15px' }}>
              <label>DIRECCIÓN (UBICACIÓN) *</label>
              <input 
                type="text" 
                name="direccion"
                value={form.direccion} 
                onChange={handleChange} 
                placeholder="Ej. Av. Providencia 1234, Oficina 501" 
                required={form.modalidad === "Presencial"} 
              />
            </div>
          )}
          
          <div className="form-group full-width" style={{ marginBottom: '15px' }}>
            <label>ASUNTO *</label>
            <input 
              type="text" 
              name="asunto"
              value={form.asunto} 
              onChange={handleChange} 
              placeholder="Ej. Presentación de Resultados" 
              required 
            />
          </div>
          
          <div className="form-group full-width" style={{ marginBottom: '15px' }}>
            <label>CONTACTOS EXTERNOS (EMPRESA)</label>
            <AutocompleteInput 
              id="destinatarios"
              suggestions={destinatarios.filter(d => d && d.correo).map(d => `${d.nombre} <${d.correo}>`)}
              value={form.destinatarios}
              onChange={(e) => {
                let val = e.target ? e.target.value : e;
                const match = val.match(/<([^>]+)>/);
                if (match) val = match[1];
                handleAutocompleteChange("destinatarios", val);
              }}
              placeholder="Selecciona contactos o escribe correos..."
            />
          </div>
          
          <div className="form-group full-width" style={{ marginBottom: '15px' }}>
            <label>ASISTENTES INTERNOS (PROFORMA)</label>
            <AutocompleteInput 
              id="asistentes_internos"
              suggestions={ejecutivas.filter(e => e && e.correo).map(e => `${e.nombre} <${e.correo}>`)}
              value={form.asistentes_internos}
              onChange={(e) => {
                let val = e.target ? e.target.value : e;
                const match = val.match(/<([^>]+)>/);
                if (match) val = match[1];
                handleAutocompleteChange("asistentes_internos", val);
              }}
              placeholder="Selecciona equipo interno..."
            />
          </div>

          <div className="grid-3" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label>FECHA *</label>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>HORA *</label>
              <input type="time" name="hora" value={form.hora} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>DURACIÓN *</label>
              <select name="duracion" value={form.duracion} onChange={handleChange} required>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1.5 horas</option>
                <option value="120">2 horas</option>
                {isCustomDuration && (
                  <option value={form.duracion}>
                    {form.duracion >= 60 
                      ? `${(form.duracion / 60).toFixed(1).replace(".0", "")} horas`
                      : `${form.duracion} minutos`} (personalizado)
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="form-group full-width" style={{ marginTop: '15px' }}>
            <label>ORDEN DEL DÍA / DETALLE</label>
            <textarea 
              name="detalle"
              value={form.detalle} 
              onChange={handleChange} 
              rows="4"
              placeholder="Detalles que se incluirán en la invitación de Teams..."
            />
          </div>
        </FormSection>

        <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading ? (
              <>
                <span className="spinner-small" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTopColor: '#fff', animation: 'spin 1s linear infinite' }}></span>
                Procesando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg>
                {form.modalidad === "Presencial" ? "Agendar Presencial" : "Agendar en Teams"}
              </>
            )}
          </button>
        </div>
      </form>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
      `}</style>
    </div>
  );
};

export default AgendarForm;
