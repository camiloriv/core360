import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import esLocale from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Swal from "sweetalert2";

import AgendarForm from "../components/agendar/AgendarForm";
import { obtenerEventosCalendario, anularReunionTeams } from "../services/agendamientoService";

const locales = {
  "es": esLocale,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const minTime = new Date(2026, 0, 1, 6, 0, 0); // 06:00
const maxTime = new Date(2026, 0, 1, 20, 0, 0); // 20:00

const AgendarReunion = () => {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("month");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    document.title = "CORE 360 - Agendar en Teams";
    fetchEvents();
  }, []);

  const fetchEvents = async (dateParam = currentDate) => {
    try {
      const start = new Date(dateParam.getFullYear(), dateParam.getMonth() - 1, 1).toISOString();
      const end = new Date(dateParam.getFullYear(), dateParam.getMonth() + 2, 0).toISOString();
      
      const res = await obtenerEventosCalendario(start, end);
      if (res.data && res.data.events) {
        const formattedEvents = res.data.events.map(ev => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end)
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Error al obtener eventos", error);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    setSelectedDate(slotInfo.start);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    Swal.fire({
      title: 'Detalles de Reunión',
      text: event.title,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Unirse a la llamada',
      denyButtonText: 'Anular Reunión',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#ef4444',
      showCloseButton: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (event.joinUrl) window.open(event.joinUrl, '_blank');
        else Swal.fire('Sin enlace', 'Esta reunión no tiene un enlace de Teams asociado.', 'info');
      } else if (result.isDenied) {
        const confirmDelete = await Swal.fire({
          title: '¿Seguro que deseas anular?',
          text: 'Esta acción eliminará el evento de Microsoft Teams y revertirá la cobertura.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, anular',
          cancelButtonText: 'Cancelar'
        });
        if (confirmDelete.isConfirmed) {
          try {
            const res = await anularReunionTeams({ eventId: event.id });
            if (res.data.success) {
              Swal.fire('Anulada', 'La reunión ha sido anulada exitosamente.', 'success');
              fetchEvents();
            }
          } catch (err) {
            Swal.fire('Error', 'No se pudo anular la reunión.', 'error');
          }
        }
      }
    });
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchEvents();
  };

  return (
    <div className="encuesta-page" style={{ background: 'var(--bg-body)', height: '100vh', padding: '15px 20px', boxSizing: 'border-box', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, width: '100%' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.4rem', marginBottom: '4px', marginTop: 0 }}>Agendar Reunión (Teams)</h1>
          <p className="page-subtitle" style={{ fontSize: '0.9rem', margin: 0, color: '#64748b' }}>Sincronizado con tu calendario de Microsoft</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => { setSelectedDate(new Date()); setIsModalOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '14px', height: 'auto', borderRadius: '6px', width: 'auto', flexShrink: 0, margin: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg>
          Nueva Reunión
        </button>
      </div>

      <div style={{ flex: 1, width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Lado Derecho: Calendario ahora a ancho completo */}
        <div className="card" style={{ padding: '15px', height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
          <div style={{ minWidth: '600px', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Calendar
              localizer={localizer}
              events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ flex: 1 }}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            date={currentDate}
            view={currentView}
            min={minTime}
            max={maxTime}
            onNavigate={(newDate) => {
              setCurrentDate(newDate);
              fetchEvents(newDate);
            }}
            onView={(newView) => setCurrentView(newView)}
            messages={{
              next: "Sig",
              previous: "Ant",
              today: "Hoy",
              month: "Mes",
              week: "Semana",
              day: "Día",
              agenda: "Agenda",
              noEventsInRange: "No hay eventos en este rango."
            }}
            culture="es"
          />
          </div>
        </div>

      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            <AgendarForm selectedDate={selectedDate} onFormSubmitSuccess={handleFormSuccess} />
          </div>
        </div>
      )}

      <style>{`
        .rbc-calendar {
          font-family: var(--font-main);
          font-size: 12px;
        }
        .rbc-time-gutter .rbc-time-slot {
          font-size: 11px;
          color: var(--text-muted, #64748b);
        }
        .rbc-header {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 0;
        }
        .rbc-event {
          font-size: 11px;
          line-height: 1.2;
        }
        .rbc-date-cell {
          font-size: 12px;
        }
        .rbc-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 15px;
          margin-bottom: 20px;
        }
        .rbc-toolbar .rbc-toolbar-label {
          width: 100%;
          text-align: center;
          font-weight: 700;
          font-size: 18px;
          text-transform: capitalize;
          order: -1; /* Mueve el mes/año arriba del todo */
          color: var(--text-color, #1e293b);
        }
        .rbc-btn-group {
          display: flex;
          gap: 0;
        }
        .rbc-btn-group button {
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 500;
        }
        .rbc-toolbar button.rbc-active {
          background-color: var(--secondary-color);
          color: white;
          border-color: var(--secondary-color);
        }
        .rbc-toolbar button:active, .rbc-toolbar button:focus {
          background-color: var(--primary-color);
          color: white;
        }
        .rbc-event {
          background-color: #e0e7ff; /* Azul pastel claro */
          color: #1e40af; /* Texto azul oscuro */
          border: 1px solid #c7d2fe; /* Borde sutil */
          border-radius: 6px; /* Bordes redondeados suaves */
          padding: 2px 6px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .rbc-event:hover {
          background-color: #c7d2fe; /* Azul pastel un poco más oscuro al pasar el mouse */
          color: #1e3a8a;
          transform: translateY(-1px);
          box-shadow: 0 3px 5px rgba(0,0,0,0.08);
        }
        .rbc-event .rbc-event-label {
          display: none; /* Opcional: Oculta la hora en formato feo del bloque si está */
        }
        .rbc-day-bg:hover, .rbc-time-slot:hover {
          background-color: #f8fafc; /* Color muy sutil al hacer hover en casillas vacías */
          cursor: pointer;
        }
        .rbc-today {
          background-color: #fefce8; /* Amarillo pastel sutil para el día de hoy */
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          backdrop-filter: blur(3px);
        }
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 12px;
          width: 550px;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .modal-close {
          position: absolute;
          top: 15px; right: 20px;
          background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8;
          transition: color 0.2s;
        }
        .modal-close:hover {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default AgendarReunion;
