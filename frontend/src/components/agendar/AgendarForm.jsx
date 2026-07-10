import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";

import useReunionesData from "../../hooks/reuniones/useReunionesData";
import { crearReunionTeams } from "../../services/agendamientoService";
import SelectEmpresa from "../form/fields/SelectEmpresa";
import AutocompleteInput from "../form/fields/AutocompleteInput";

const CustomTimePicker = ({ value, onChange, name, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [hour, min] = (value || "").split(":");

  const handleHourSelect = (h) => {
    onChange({ target: { name, value: `${h}:${min || '00'}` } });
  };
  
  const handleMinSelect = (m) => {
    onChange({ target: { name, value: `${hour || '09'}:${m}` } });
    setIsOpen(false);
  };

  const handleManualTyping = (e) => {
    let val = e.target.value.replace(/[^0-9:]/g, '');
    onChange({ target: { name, value: val } });
  };

  const hours = Array.from({length: 24}, (_, i) => {
    const h = i + 1;
    return h === 24 ? "00" : String(h).padStart(2, "0");
  });
  const mins = ["00", "30"];

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={wrapperRef}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <input 
          type="text" 
          value={value} 
          onChange={handleManualTyping} 
          onClick={() => setIsOpen(true)}
          placeholder="HH:MM"
          maxLength={5}
          style={{ padding: '8px 12px', paddingRight: '28px', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
          required={required}
        />
        <svg onClick={() => setIsOpen(!isOpen)} style={{ position: 'absolute', right: '8px', cursor: 'pointer', color: '#6b7280' }} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          background: 'white', border: '1px solid #d1d5db', borderRadius: '6px',
          display: 'flex', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50,
          height: '180px', overflow: 'hidden'
        }}>
          <div style={{ overflowY: 'auto', borderRight: '1px solid #e5e7eb', padding: '4px', width: '60px' }}>
            <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', paddingBottom: '4px', fontWeight: 'bold' }}>Hora</div>
            {hours.map(h => (
              <div 
                key={h} 
                onClick={() => handleHourSelect(h)}
                style={{
                  padding: '6px', cursor: 'pointer', textAlign: 'center', fontSize: '13px',
                  background: hour === h ? '#3b82f6' : 'transparent',
                  color: hour === h ? 'white' : '#374151',
                  borderRadius: '4px', marginBottom: '2px'
                }}
              >
                {h}
              </div>
            ))}
          </div>
          <div style={{ overflowY: 'auto', padding: '4px', width: '60px' }}>
            <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', paddingBottom: '4px', fontWeight: 'bold' }}>Min</div>
            {mins.map(m => (
              <div 
                key={m} 
                onClick={() => handleMinSelect(m)}
                style={{
                  padding: '6px', cursor: 'pointer', textAlign: 'center', fontSize: '13px',
                  background: min === m ? '#3b82f6' : 'transparent',
                  color: min === m ? 'white' : '#374151',
                  borderRadius: '4px', marginBottom: '2px'
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AgendarForm = ({ selectedDate, selectedEndDate, onFormSubmitSuccess, onClose, dayEvents = [] }) => {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  
  const [form, setForm] = useState({
    empresa_id: "",
    destinatarios: "", // Para contactos externos
    asistentes_internos: "", // Para contactos internos (jefaturas/ejecutivas)
    fecha: "",
    hora: "",
    hora_fin: "",
    asunto: "",
    detalle: "",
    modalidad: "Teams",
    direccion: ""
  });
  
  const [loading, setLoading] = useState(false);

  // Hook para obtener empresas, destinatarios, etc.
  const { empresas, destinatarios, ejecutivas } = useReunionesData(user, form.empresa_id);

  // Sincronizar fecha y hora desde la selección en el calendario
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      const fecha = localDate.toISOString().split("T")[0];
      const hora = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      
      let hora_fin = "";
      if (selectedEndDate) {
        const dEnd = new Date(selectedEndDate);
        hora_fin = String(dEnd.getHours()).padStart(2, "0") + ":" + String(dEnd.getMinutes()).padStart(2, "0");
      } else {
        const dEnd = new Date(d.getTime() + 30 * 60000);
        hora_fin = String(dEnd.getHours()).padStart(2, "0") + ":" + String(dEnd.getMinutes()).padStart(2, "0");
      }
      
      setForm(prev => ({ ...prev, fecha, hora, hora_fin }));
    }
  }, [selectedDate, selectedEndDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAutocompleteChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getDuracionTexto = () => {
    if (!form.hora || !form.hora_fin || !form.hora.includes(':') || !form.hora_fin.includes(':')) return "";
    const [hInicio, mInicio] = form.hora.split(":").map(Number);
    const [hFin, mFin] = form.hora_fin.split(":").map(Number);
    
    if (isNaN(hInicio) || isNaN(mInicio) || isNaN(hFin) || isNaN(mFin)) return "";

    let diff = (hFin * 60 + mFin) - (hInicio * 60 + mInicio);
    if (diff <= 0) return "Horas inválidas";
    
    const horas = Math.floor(diff / 60);
    const mins = diff % 60;
    if (horas > 0 && mins > 0) return `${horas}h ${mins}m`;
    if (horas > 0) return `${horas}h`;
    return `${mins} min`;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!form.empresa_id) {
      return Swal.fire("Empresa Requerida", "Por favor selecciona una Empresa", "warning");
    }
    if (!form.asunto) {
      return Swal.fire("Título Requerido", "Por favor ingresa un título para la reunión", "warning");
    }
    if (!form.fecha || !form.hora || !form.hora_fin) {
      return Swal.fire("Fechas Requeridas", "Por favor ingresa la fecha, hora de inicio y hora de fin", "warning");
    }

    setLoading(true);
    try {
      const [hInicio, mInicio] = form.hora.split(":").map(Number);
      const [hFin, mFin] = form.hora_fin.split(":").map(Number);
      let duracionCalculada = (hFin * 60 + mFin) - (hInicio * 60 + mInicio);
      if (duracionCalculada <= 0) duracionCalculada = 30; // Fallback por defecto si ingresan horas invertidas

      const payload = { ...form, duracion: String(duracionCalculada) };
      const res = await crearReunionTeams(payload);
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "¡Reunión Agendada!",
          text: "El evento se ha creado en Microsoft Teams",
          confirmButtonColor: "#4f46e5",
        });
        if (onFormSubmitSuccess) onFormSubmitSuccess();
      }
    } catch (error) {
      Swal.fire("Error", "No se pudo agendar la reunión", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar eventos del día seleccionado para mostrarlos en la barra lateral derecha
  const filterDayEvents = () => {
    if (!form.fecha) return [];
    return dayEvents.filter(ev => {
      const evDate = new Date(ev.start).toISOString().split("T")[0];
      return evDate === form.fecha;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  };

  const selectedDayEvents = filterDayEvents();

  // Calcular bloques ocupados y disponibles
  const getScheduleSlots = () => {
    if (!form.fecha) return { busy: [], free: [] };

    // 1. Obtener y ordenar eventos del día
    const dayEvts = selectedDayEvents.map(ev => {
      const s = new Date(ev.start);
      const e = ev.end ? new Date(ev.end) : new Date(s.getTime() + 30 * 60 * 1000);
      return { start: s, end: e };
    }).sort((a, b) => a.start - b.start);

    // 2. Unificar rangos solapados
    const mergedBusy = [];
    dayEvts.forEach(ev => {
      if (mergedBusy.length === 0) {
        mergedBusy.push(ev);
      } else {
        const last = mergedBusy[mergedBusy.length - 1];
        if (ev.start <= last.end) {
          if (ev.end > last.end) {
            last.end = ev.end;
          }
        } else {
          mergedBusy.push(ev);
        }
      }
    });

    const formatTime = (d) => {
      return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    };

    // 3. Definir jornada de 08:00 a 20:00 en local
    // Usamos el constructor local con partes para evitar saltos de zona horaria
    const [year, month, day] = form.fecha.split("-").map(Number);
    const dayStart = new Date(year, month - 1, day, 8, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 20, 0, 0);

    const freeRanges = [];
    let currentStart = dayStart;

    mergedBusy.forEach(busy => {
      if (busy.start > currentStart) {
        const gapEnd = busy.start > dayEnd ? dayEnd : busy.start;
        if (gapEnd > currentStart) {
          freeRanges.push({ start: new Date(currentStart), end: new Date(gapEnd) });
        }
      }
      if (busy.end > currentStart) {
        currentStart = busy.end > dayEnd ? dayEnd : busy.end;
      }
    });

    if (currentStart < dayEnd) {
      freeRanges.push({ start: new Date(currentStart), end: new Date(dayEnd) });
    }

    return {
      busy: mergedBusy.map(b => `${formatTime(b.start)} - ${formatTime(b.end)}`),
      free: freeRanges.map(f => `${formatTime(f.start)} - ${formatTime(f.end)}`)
    };
  };

  const { busy, free } = getScheduleSlots();

  return (
    <div className="teams-create-container" style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", background: '#f3f4f6'
    }}>
      {/* Barra de Menú Superior */}
      <div className="teams-header-bar" style={{
        padding: '10px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div style={{
            background: '#eff6ff', color: '#1d4ed8', borderBottom: '3px solid #1d4ed8',
            padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>
            📅 Evento
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            style={{
              background: '#4f46e5', border: '1px solid #4338ca', color: '#white',
              padding: '6px 20px', borderRadius: '4px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
              color: '#ffffff'
            }}
          >
            {loading ? "Guardando..." : "💾 Guardar"}
          </button>
          <button 
            onClick={onClose}
            style={{
              background: '#f3f4f6', border: '1px solid #d1d5db', color: '#4b5563',
              padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Grid del Formulario + Calendario Lateral */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Columna Izquierda: Formulario (Teams-like fields) */}
        <div className="teams-form-col" style={{ flex: 1, padding: '24px 36px', overflowY: 'auto', background: '#ffffff' }}>
          
          {/* Campo Empresa (sin el label doble superior) */}
          <div style={{ marginBottom: '20px' }}>
            <SelectEmpresa 
              value={form.empresa_id} 
              onChange={handleChange} 
              empresas={empresas} 
            />
          </div>

          {/* Campo Agregar Título (Placeholder corregido y padding proporcional) */}
          <div style={{ marginBottom: '24px', marginTop: '12px' }}>
            <input 
              type="text" 
              name="asunto"
              value={form.asunto} 
              onChange={handleChange} 
              placeholder="Agregar título" 
              style={{
                width: '100%', border: 'none', borderBottom: '1px solid #e2e8f0',
                fontSize: '22px', fontWeight: '500', padding: '10px 0', outline: 'none',
                color: '#111827', transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderBottomColor = '#4f46e5'}
              onBlur={(e) => e.target.style.borderBottomColor = '#e2e8f0'}
              required 
            />
          </div>

          {/* Campo Asistentes Externos */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Contactos Externos (Empresa)</label>
            <AutocompleteInput 
              id="destinatarios"
              suggestions={destinatarios}
              value={form.destinatarios}
              onChange={(e) => {
                let val = e.target ? e.target.value : e;
                const match = val.match(/<([^>]+)>/);
                if (match) val = match[1];
                handleAutocompleteChange("destinatarios", val);
              }}
              placeholder="Invita contactos externos (escribe o selecciona)..."
            />
          </div>

          {/* Campo Asistentes Internos */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Asistentes Internos (Proforma)</label>
            <AutocompleteInput 
              id="asistentes_internos"
              suggestions={ejecutivas.filter(e => e && e.correo).map(e => e.correo)}
              value={form.asistentes_internos}
              onChange={(e) => {
                let val = e.target ? e.target.value : e;
                const match = val.match(/<([^>]+)>/);
                if (match) val = match[1];
                handleAutocompleteChange("asistentes_internos", val);
              }}
              placeholder="Invita equipo interno (escribe o selecciona)..."
            />
          </div>

          {/* Fila de Fecha y Hora */}
          <div className="teams-date-row" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', marginBottom: '4px' }}>FECHA</label>
              <input 
                type="date" 
                name="fecha" 
                value={form.fecha} 
                onChange={handleChange} 
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                required 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', marginBottom: '4px' }}>DE (INICIO)</label>
              <CustomTimePicker 
                name="hora" 
                value={form.hora} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', marginBottom: '4px' }}>HASTA (FIN)</label>
              <CustomTimePicker 
                name="hora_fin" 
                value={form.hora_fin} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', height: '37px' }}>
              {getDuracionTexto() ? (
                <span style={{ display: 'inline-block', width: '85px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#4338ca', backgroundColor: '#e0e7ff', padding: '6px 0', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                  ⏳ {getDuracionTexto()}
                </span>
              ) : (
                <span style={{ display: 'inline-block', width: '85px' }}></span>
              )}
            </div>
          </div>

          {/* Toggle Modalidad (Reunión de Teams) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Reunión de Teams</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {form.modalidad === "Teams" ? "Se generará un enlace automático en Microsoft Teams" : "Reunión presencial / física"}
              </div>
            </div>
            <div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                <input 
                  type="checkbox" 
                  checked={form.modalidad === "Teams"}
                  onChange={(e) => setForm(prev => ({ ...prev, modalidad: e.target.checked ? "Teams" : "Presencial" }))}
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
                <span className="slider" style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: form.modalidad === "Teams" ? '#4f46e5' : '#ccc',
                  transition: '.3s', borderRadius: '24px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                    backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
                    transform: form.modalidad === "Teams" ? 'translateX(24px)' : 'none'
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Campo Dirección (si no es Teams) */}
          {form.modalidad === "Presencial" && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Ubicación / Dirección *</label>
              <input 
                type="text" 
                name="direccion"
                value={form.direccion} 
                onChange={handleChange} 
                placeholder="Agregar dirección (Ej. Av. Providencia 1234)" 
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px', width: '100%' }}
                required={form.modalidad === "Presencial"} 
              />
            </div>
          )}

          {/* Campo Orden del Día */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Orden del día / Descripción</label>
            <textarea 
              name="detalle"
              value={form.detalle} 
              onChange={handleChange} 
              rows="4"
              placeholder="Agrega un mensaje para el cuerpo de la invitación..."
              style={{
                width: '100%', border: '1px solid #d1d5db', borderRadius: '4px',
                padding: '10px', fontSize: '13px', outline: 'none', resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

        </div>

        {/* Columna Derecha: Calendario del Día (Tope de agenda + Ocupado / Disponible) */}
        <div className="teams-schedule-col" style={{ width: '280px', padding: '24px', backgroundColor: '#fcfcfc', borderLeft: '1px solid #e5e7eb', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0 0 4px 0' }}>Horario del Día</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>Comprueba si tienes topes de agenda</p>
          
          {/* Listado de Citas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((ev, i) => {
                const startTime = new Date(ev.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const endTime = ev.end ? new Date(ev.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : "";
                
                return (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: '6px',
                    background: '#f1f5f9', borderLeft: '3px solid #3b82f6',
                    fontSize: '12px', color: '#1e293b'
                  }}>
                    <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {startTime} - {endTime}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                Sin citas agendadas
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />

          {/* Bloques Ocupados */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔴 Ocupado
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {busy.length > 0 ? (
                busy.map((timeRange, idx) => (
                  <div key={idx} style={{ fontSize: '12px', color: '#475569', paddingLeft: '8px', borderLeft: '2px solid #ef4444' }}>
                    {timeRange}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Ninguno</div>
              )}
            </div>
          </div>

          {/* Bloques Disponibles */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🟢 Disponible (08:00 - 20:00)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {free.length > 0 ? (
                free.map((timeRange, idx) => (
                  <div key={idx} style={{ fontSize: '12px', color: '#475569', paddingLeft: '8px', borderLeft: '2px solid #22c55e' }}>
                    {timeRange}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Sin disponibilidad</div>
              )}
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
        
        /* Toggle Switch Teams-like style */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px !important;
          height: 22px !important;
        }
        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc;
          transition: .2s;
          border-radius: 22px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .2s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #4f46e5;
        }
        input:checked + .slider:before {
          transform: translateX(22px);
        }
        
        /* Autocomplete Input overrides to resemble Teams borderless line input */
        .teams-create-container .autocomplete-container input {
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-radius: 0 !important;
          padding: 8px 0 !important;
          font-size: 14px !important;
          outline: none !important;
          width: 100% !important;
        }
        .teams-create-container .autocomplete-container input:focus {
          border-bottom-color: #4f46e5 !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
};

export default AgendarForm;
