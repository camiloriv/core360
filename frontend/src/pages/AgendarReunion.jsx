import React, { useState, useEffect, useRef } from "react";
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

const CustomWeekHeader = ({ date }) => {
  const dayName = format(date, "eee", { locale: esLocale });
  const dayNumber = format(date, "d");
  const cleanDayName = dayName.replace(".", "");
  const capitalizedDayName = cleanDayName.charAt(0).toUpperCase() + cleanDayName.slice(1);

  return (
    <div className="custom-week-header-inner">
      <span className="custom-week-header-name">{capitalizedDayName}</span>
      <span className="custom-week-header-number">{dayNumber}</span>
    </div>
  );
};

const AgendarReunion = () => {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("month");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSelectedSlot, setLastSelectedSlot] = useState(null);
  const lastClickRef = useRef({ time: 0, slotTime: null });

  // Limpiar la celda seleccionada al abrir/cerrar la modal o cambiar de vista
  useEffect(() => {
    if (!isModalOpen) {
      setLastSelectedSlot(null);
      setSelectedEndDate(null);
      lastClickRef.current = { time: 0, slotTime: null };
    }
  }, [isModalOpen, currentView]);

  useEffect(() => {
    document.title = "CORE 360 - Agendar en Teams";
    fetchEvents();
  }, []);

  const fetchEvents = async (dateParam = currentDate, specificStart = null, specificEnd = null) => {
    setIsLoading(true);
    try {
      let start, end;
      if (specificStart && specificEnd) {
        start = new Date(specificStart);
        start.setHours(0, 0, 0, 0);
        
        end = new Date(specificEnd);
        end.setHours(23, 59, 59, 999);
        
        start = start.toISOString();
        end = end.toISOString();
      } else {
        start = new Date(dateParam.getFullYear(), dateParam.getMonth() - 1, 1).toISOString();
        end = new Date(dateParam.getFullYear(), dateParam.getMonth() + 2, 0).toISOString();
      }
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    if (currentView === "month") {
      setCurrentDate(slotInfo.start);
      setCurrentView("day");
      return;
    }

    const now = Date.now();
    const slotTime = slotInfo.start.getTime();
    const prevClick = lastClickRef.current;

    // Si la acción es de arrastre/selección de rango
    if (slotInfo.action === "select") {
      setSelectedDate(slotInfo.start);
      setSelectedEndDate(slotInfo.end);
      setIsModalOpen(true);
      return;
    }

    // Si la acción es doble clic nativo
    if (slotInfo.action === "doubleClick") {
      setSelectedDate(slotInfo.start);
      setSelectedEndDate(slotInfo.end);
      setIsModalOpen(true);
      return;
    }

    // Para clics simples:
    if (slotInfo.action === "click") {
      // Si la celda es la misma que ya estaba seleccionada y han pasado más de 300ms
      // (para evitar el doble disparo de un único evento físico de clic)
      if (prevClick.slotTime === slotTime && (now - prevClick.time) > 300) {
        setSelectedDate(slotInfo.start);
        setSelectedEndDate(slotInfo.end);
        setIsModalOpen(true);
        lastClickRef.current = { time: 0, slotTime: null };
        setLastSelectedSlot(null);
      } else {
        // Primer clic -> Guardamos la selección
        lastClickRef.current = { time: now, slotTime: slotTime };
        setLastSelectedSlot(slotTime);
      }
    }
  };

  const handleSelectEvent = (event) => {
    if (currentView === "month") {
      setCurrentDate(event.start);
      setCurrentView("day");
      return;
    }

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
    <div className="encuesta-page agendar-page-wrapper">
      
      <div className="agendar-header-container">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.2rem', marginBottom: '2px', marginTop: 0 }}>Agendar Reunión (Teams)</h1>
          <p className="page-subtitle" style={{ fontSize: '0.8rem', margin: 0, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Sincronizado con tu calendario de Microsoft
            {isLoading ? (
              <span style={{color: '#eab308', fontWeight: 'bold', fontSize: '0.75rem'}}>⏳ Cargando...</span>
            ) : (
              <span style={{color: '#10b981', fontWeight: 'bold', fontSize: '0.75rem'}}>✓ Listo</span>
            )}
          </p>
        </div>
        <button 
          className="btn btn-primary btn-nueva-reunion" 
          onClick={() => { setSelectedDate(new Date()); setIsModalOpen(true); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg>
          Nueva Reunión
        </button>
      </div>

      <div className="agendar-body-wrapper">
        
        {/* Lado Derecho: Calendario ahora a ancho completo */}
        <div className="card calendar-card">
          <div className="calendar-scroll-wrapper">
            <Calendar
              localizer={localizer}
              events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ flex: 1 }}
            selectable
            slotPropGetter={(date) => {
              if (lastSelectedSlot && date.getTime() === lastSelectedSlot) {
                return {
                  className: "selected-calendar-slot"
                };
              }
              return {};
            }}
            components={{
              week: {
                header: CustomWeekHeader
              }
            }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            date={currentDate}
            view={currentView}
            min={minTime}
            max={maxTime}
            onRangeChange={(range) => {
              if (Array.isArray(range)) {
                fetchEvents(currentDate, range[0], range[range.length - 1]);
              } else {
                fetchEvents(currentDate, range.start, range.end);
              }
            }}
            onNavigate={(newDate) => {
              setCurrentDate(newDate);
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
            <AgendarForm selectedDate={selectedDate} selectedEndDate={selectedEndDate} onFormSubmitSuccess={handleFormSuccess} />
          </div>
        </div>
      )}

      <style>{`
        /* Tipografía general y contenedor */
        .rbc-calendar {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 12px;
          border: none !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .rbc-time-view {
          width: 100% !important;
          min-width: 0 !important;
        }
        .rbc-time-header, .rbc-time-content {
          min-width: 0 !important;
        }
        .rbc-header, .rbc-day-slot {
          min-width: 0 !important;
        }
        .rbc-time-header-gutter, .rbc-time-gutter {
          width: 50px !important;
          min-width: 50px !important;
          max-width: 50px !important;
          flex: 0 0 50px !important;
          flex-shrink: 0 !important;
        }

        /* Alineación exacta entre cabecera y celdas de la grilla */
        .rbc-row.rbc-time-header-cell {
          display: flex !important;
          flex: 1 !important;
          min-width: 0 !important;
        }
        .rbc-allday-cell {
          display: flex !important;
          flex: none !important;
          height: 15px !important;
          min-height: 15px !important;
          min-width: 0 !important;
        }
        .rbc-allday-cell .rbc-row-bg, 
        .rbc-time-header-cell .rbc-row-bg {
          width: 100% !important;
          display: flex !important;
        }
        .rbc-allday-cell .rbc-row-bg .rbc-day-bg, 
        .rbc-time-header-cell .rbc-header {
          flex: 1 0 0% !important;
          min-width: 0 !important;
        }

        /* Vista de Mes y Bordes */
        .rbc-month-view {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        .rbc-month-row {
          border-top: 1px solid #e2e8f0;
        }
        .rbc-day-bg {
          border-left: 1px solid #e2e8f0;
          transition: background-color 0.2s;
        }

        /* Cabecera de días (lun, mar, mié...) */
        .rbc-header {
          background: #f8fafc;
          padding: 4px 0;
          border-bottom: 1px solid #e2e8f0;
          border-left: 1px solid #e2e8f0;
          overflow: visible !important;
          min-height: 44px !important;
          height: auto !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
        }

        /* Cabecera de la semana personalizada */
        .custom-week-header-inner {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 2px 0;
          width: 100% !important;
        }
        .custom-week-header-name {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 600;
          color: #64748b;
          display: block !important;
          text-align: center !important;
          margin-bottom: 2px;
        }
        .custom-week-header-number {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 22px;
          height: 22px;
          border-radius: 50%;
        }
        .rbc-today .custom-week-header-number {
          background-color: #14b8a6 !important;
          color: white !important;
        }
        .rbc-today .custom-week-header-name {
          color: #14b8a6;
          font-weight: 700;
        }

        /* Eliminar estilos por defecto del botón en la cabecera */
        .rbc-header .rbc-button-link {
          color: inherit !important;
          font-weight: inherit !important;
          font-size: inherit !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          background: none !important;
          border-radius: 0 !important;
        }
        .rbc-header .rbc-button-link:hover {
          background: none !important;
          color: inherit !important;
        }

        /* Toolbar (Mes/Año y Botones) */
        .rbc-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding: 0 10px;
        }
        .rbc-toolbar .rbc-toolbar-label {
          font-weight: 800;
          font-size: 16px;
          color: #1e293b;
          text-transform: capitalize;
        }
        .rbc-btn-group {
          display: flex;
          gap: 6px;
        }
        .rbc-btn-group button {
          border-radius: 8px !important;
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .rbc-btn-group button:hover {
          background: #f1f5f9;
          color: #0f172a;
          border-color: #cbd5e1;
        }
        .rbc-toolbar button.rbc-active {
          background: #3b82f6 !important;
          color: white !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3) !important;
        }

        /* Casillas de Días */
        .rbc-date-cell {
          padding: 4px 6px;
          text-align: right;
        }
        .rbc-month-view .rbc-date-cell {
          text-align: left !important;
          padding: 4px 6px !important;
        }
        .rbc-button-link {
          color: #475569 !important;
          font-weight: 600;
          font-size: 12px;
          padding: 1px 4px;
          display: inline-block;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .rbc-month-view .rbc-button-link {
          font-size: 11px !important;
          padding: 1px 3px !important;
        }
        .rbc-button-link:hover {
          background-color: #e2e8f0 !important;
          color: #0f172a !important;
          text-decoration: none;
        }
        .rbc-today {
          background-color: #f0fdfa !important; /* Verde pastel muy sutil */
        }
        .rbc-month-view .rbc-today .rbc-button-link {
          background-color: #14b8a6 !important;
          color: white !important;
        }
        .rbc-off-range-bg {
          background-color: #f8fafc;
        }
        .rbc-off-range .rbc-button-link {
          color: #94a3b8 !important;
          font-weight: 500;
        }

        /* Hover sobre casillas vacías y día completo */
        .rbc-day-bg:hover, .rbc-time-slot:hover {
          background-color: #e2e8f0 !important;
          cursor: pointer !important;
        }

        /* Estilos para la celda horaria seleccionada */
        .selected-calendar-slot {
          background-color: #dbeafe !important;
          border-left: 3px solid #3b82f6 !important;
        }

        /* En la vista de mes, desactivamos eventos de puntero en todo lo que no sea el fondo (.rbc-row-bg)
           para que el hover y el click se apliquen directamente al fondo del día (.rbc-day-bg) */
        .rbc-month-view .rbc-month-row > *:not(.rbc-row-bg) {
          pointer-events: none !important;
        }
        .rbc-month-view .rbc-row-bg,
        .rbc-month-view .rbc-day-bg {
          pointer-events: auto !important;
        }

        /* Tarjetas de Eventos */
        .rbc-event {
          background-color: #eff6ff !important;
          color: #1d4ed8 !important;
          border: none !important;
          border-left: 3px solid #3b82f6 !important;
          border-radius: 4px !important;
          padding: 1px 3px !important;
          margin-bottom: 1px;
          margin-top: 1px;
          font-size: 10.5px;
          font-weight: 500;
          line-height: 1.2;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }
        .rbc-event:hover {
          background-color: #dbeafe !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
          z-index: 5;
        }
        .rbc-event .rbc-event-label {
          display: none;
        }
        .rbc-event-content {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Botón de '+X more' */
        .rbc-show-more {
          color: #3b82f6;
          font-weight: 600;
          font-size: 11px;
          background: transparent;
          padding: 2px 6px;
          display: block;
          text-align: center;
          margin: 2px 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .rbc-show-more:hover {
          background: #eff6ff;
          text-decoration: none;
        }

        /* Modal */
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999; backdrop-filter: blur(4px);
        }
        .modal-content {
          background: white; padding: 30px; border-radius: 16px;
          width: 550px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
          position: relative; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .modal-close {
          position: absolute; top: 16px; right: 20px;
          background: #f1f5f9; border: none; font-size: 16px; font-weight: bold; cursor: pointer; color: #64748b;
          width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .modal-close:hover {
          background: #fee2e2; color: #ef4444; transform: scale(1.05);
        }

        /* Layout Classes */
        .agendar-page-wrapper {
          background: var(--bg-body); height: 100vh; padding: 8px 12px; box-sizing: border-box; overflow: hidden; width: 100%; display: flex; flex-direction: column;
        }
        .agendar-header-container {
          margin-bottom: 8px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; flex-shrink: 0; width: 100%; gap: 15px;
        }
        .btn-nueva-reunion {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 13px; height: auto; border-radius: 6px; width: auto; flex-shrink: 0; margin: 0;
        }
        .agendar-body-wrapper {
          flex: 1; width: 100%; min-width: 0; overflow: hidden; display: flex; flex-direction: column;
        }
        .calendar-card {
          padding: 8px; height: 100%; width: 100%; min-width: 0; max-width: 100%; display: flex; flex-direction: column;
        }
        .calendar-scroll-wrapper {
          width: 100%; min-width: 0; height: 100%; display: flex; flex-direction: column; flex: 1;
        }

        /* Responsive Mobile Styles */
        @media (max-width: 768px) {
          .main-content {
            overflow-x: hidden !important;
          }
          .agendar-page-wrapper {
            padding: 6px;
            height: auto;
            min-height: 100vh;
            overflow-x: hidden !important;
          }
          .agendar-body-wrapper {
            overflow: visible;
            width: 100%;
            min-width: 0;
          }
          .agendar-header-container {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
            margin-bottom: 4px;
          }
          .btn-nueva-reunion {
            width: 100%;
            justify-content: center;
            padding: 6px;
            font-size: 12px;
          }
          .calendar-card {
            padding: 6px;
            border-radius: 8px;
            box-shadow: none;
            border: 1px solid #e2e8f0;
          }
          .rbc-toolbar {
            flex-direction: column;
            gap: 6px;
            margin-bottom: 8px;
          }
          .rbc-btn-group {
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
          }
          .rbc-btn-group button {
            flex: 1;
            padding: 4px 2px;
            font-size: 10px;
            min-width: 60px;
          }
          .rbc-toolbar .rbc-toolbar-label {
            font-size: 14px;
            order: 0;
          }
          .calendar-scroll-wrapper {
            min-width: 0 !important; 
          }
          .rbc-time-header-gutter,
          .rbc-time-gutter {
            width: 40px !important;
            min-width: 40px !important;
            max-width: 40px !important;
            flex: 0 0 40px !important;
            flex-shrink: 0 !important;
          }
          .rbc-time-gutter .rbc-time-slot {
            font-size: 9px;
            padding: 0 2px;
          }
          .rbc-header {
            padding: 2px 0;
            overflow: visible !important;
            min-height: 32px !important;
            height: auto !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
          }
          .rbc-header .rbc-button-link {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            background: none !important;
          }
          .custom-week-header-inner {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 1px 0;
            width: 100% !important;
          }
          .custom-week-header-name {
            font-size: 8px;
            display: block !important;
            text-align: center !important;
            margin-bottom: 1px;
          }
          .custom-week-header-number {
            font-size: 9px;
            width: 16px;
            height: 16px;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .rbc-event {
            padding: 0px 2px !important;
            font-size: 8.5px;
            border-left-width: 2px !important;
            margin-bottom: 0px;
          }
          .rbc-date-cell {
            font-size: 9px;
            padding: 1px;
          }
          .rbc-month-view .rbc-date-cell {
            text-align: left !important;
            padding: 2px 4px !important;
          }
          .rbc-button-link {
            font-size: 9px;
            padding: 0px 2px;
            white-space: normal;
            line-height: 1.1;
            display: block;
            text-align: center;
          }
          .rbc-month-view .rbc-button-link {
            font-size: 9px !important;
            padding: 0px 2px !important;
          }
          .modal-content {
            padding: 20px 15px;
            width: 100%;
            max-height: 100vh;
            border-radius: 12px 12px 0 0;
            position: absolute;
            bottom: 0;
          }
          .modal-overlay {
            align-items: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default AgendarReunion;
