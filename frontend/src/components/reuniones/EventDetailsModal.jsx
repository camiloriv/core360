import React, { useEffect } from 'react';

const EventDetailsModal = ({ event, onClose, onJoin, onCancel, onReschedule }) => {
  // Configuración de tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Formateo de fecha y hora
  const formatDateTime = (startStr, endStr) => {
    if (!startStr) return "";
    const optionsDate = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
    const dateStr = new Date(startStr).toLocaleDateString('es-ES', optionsDate);
    const startTime = new Date(startStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const endTime = endStr ? new Date(endStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : "";
    
    // Capitalizar la primera letra del día
    const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1).replace(/,/g, '');
    return `${dateFormatted}, 'de' ${startTime} a ${endTime}`;
  };

  // Asistentes por estado
  let asistentes = [];
  try {
    asistentes = typeof event.asistentes === 'string' ? JSON.parse(event.asistentes) : (event.asistentes || []);
  } catch (e) {
    console.error("Error parsing asistentes", e);
  }

  const aceptados = asistentes.filter(a => a.response === 'accepted');
  const sinRespuesta = asistentes.filter(a => a.response === 'none' || a.response === 'tentativelyAccepted');
  const rechazados = asistentes.filter(a => a.response === 'declined');

  let organizador = null;
  if (event.organizador) {
    try {
      organizador = typeof event.organizador === 'string' ? JSON.parse(event.organizador) : event.organizador;
    } catch (e) {
      console.error(e);
    }
  }

  // Identificador visual de respuesta (Pills superiores)
  const getPillColor = (response) => {
    switch(response) {
      case 'accepted': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'declined': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: '#fff',
        width: '950px',
        maxWidth: '95vw',
        height: '650px',
        maxHeight: '90vh',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}>
        {/* Header / Barra de Título */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>
            {event.asunto || event.title || "Evento de Teams"}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => onReschedule(event)}
              style={{
                background: 'transparent', border: '1px solid #d1d5db',
                padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Reagendar
            </button>
            <button 
              onClick={() => onCancel(event)}
              style={{
                background: 'transparent', border: '1px solid #d1d5db',
                padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ color: '#ef4444' }}>✖</span> Anular
            </button>
            {event.joinUrl && (
              <button 
                onClick={() => onJoin(event)}
                style={{
                  background: '#4f46e5', border: '1px solid #4338ca',
                  padding: '6px 16px', borderRadius: '4px', cursor: 'pointer',
                  fontSize: '13px', color: 'white', fontWeight: '500'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
              >
                Unirse
              </button>
            )}
            <button 
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none',
                padding: '6px', cursor: 'pointer',
                fontSize: '16px', color: '#6b7280'
              }}
            >
              ✖
            </button>
          </div>
        </div>

        {/* Cuerpo (2 Columnas) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Columna Izquierda (Principal) */}
          <div style={{ flex: 1, borderRight: '1px solid #e5e7eb', padding: '24px', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div style={{ 
                background: '#4f46e5', color: '#fff', padding: '10px', 
                borderRadius: '8px', flexShrink: 0, marginTop: '4px' 
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                  {event.asunto || event.title || "Evento de Teams"}
                </h1>
                
                {/* Asistentes (Pills) */}
                {asistentes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {asistentes.map((a, i) => {
                      const colors = getPillColor(a.response);
                      return (
                        <div key={i} style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          padding: '4px 10px', borderRadius: '16px', 
                          border: `1px solid ${colors.border}`, backgroundColor: colors.bg,
                          fontSize: '13px', color: '#111827'
                        }}>
                          <div style={{ 
                            width: '20px', height: '20px', borderRadius: '50%', 
                            backgroundColor: colors.border, display: 'flex', 
                            justifyContent: 'center', alignItems: 'center',
                            fontSize: '10px', fontWeight: 'bold', color: colors.text
                          }}>
                            {getInitials(a.name || a.email)}
                          </div>
                          <span>{a.name || a.email}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

                {/* Detalles (Tiempo y Ubicación) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Fecha / Hora */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span style={{ fontSize: '14px', color: '#374151' }}>
                      {formatDateTime(event.start || event.fecha, event.end || event.hora_fin)}
                    </span>
                  </div>

                  {/* Ubicación */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span style={{ fontSize: '14px', color: '#374151' }}>
                      {event.joinUrl ? "Reunión de Microsoft Teams" : "Desconocido"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Descripción (Body Preview) */}
            <div style={{ marginTop: '32px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0', color: '#374151' }}>Descripción del Evento</h3>
              {event.bodyPreview || event.body_preview ? (
                <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {event.bodyPreview || event.body_preview}
                </p>
              ) : (
                <p style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                  Sin detalles adicionales de la reunión.
                </p>
              )}
            </div>
            
          </div>

          {/* Columna Derecha (Tracking / Seguimiento) */}
          <div style={{ width: '280px', padding: '24px', backgroundColor: '#fcfcfc', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 20px 0' }}>Seguimiento</h3>
            
            {/* Organizador */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>Organizador</div>
              {organizador ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    backgroundColor: '#f3f4f6', display: 'flex', 
                    justifyContent: 'center', alignItems: 'center',
                    fontSize: '12px', fontWeight: 'bold', color: '#4b5563', border: '1px solid #e5e7eb'
                  }}>
                    {getInitials(organizador.name || organizador.email)}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{organizador.name || 'Organizador'}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{organizador.email}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>Información no disponible</div>
              )}
            </div>

            {/* Asistentes List */}
            <div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', fontWeight: '500' }}>Asistentes</div>
              
              {/* Aceptados */}
              {aceptados.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Aceptada: {aceptados.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {aceptados.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#166534', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                          {getInitials(a.name || a.email)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.2' }}>{a.name || a.email}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Obligatorio</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rechazados */}
              {rechazados.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    Rechazada: {rechazados.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rechazados.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#991b1b', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                          {getInitials(a.name || a.email)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.2' }}>{a.name || a.email}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Obligatorio</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sin Respuesta */}
              {sinRespuesta.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    Sin respuesta / Provisoria: {sinRespuesta.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sinRespuesta.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                          {getInitials(a.name || a.email)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.2' }}>{a.name || a.email}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Obligatorio</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {asistentes.length === 0 && (
                <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                  No hay asistentes registrados
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
