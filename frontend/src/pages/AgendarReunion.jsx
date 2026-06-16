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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileViewMode, setMobileViewMode] = useState("day");

  // Detección de responsive para el layout móvil
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Obtiene los eventos para una fecha específica (usado para dots y agenda de móvil)
  const getEventsForDate = (date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return events.filter(ev => {
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end);
      return evStart <= dayEnd && evEnd >= dayStart;
    });
  };

  // Obtiene los eventos para un bloque de hora específico en un día (usado en Day View de móvil)
  const getEventsForSlot = (date, hour) => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);
    
    return events.filter(ev => {
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end);
      return evStart < slotEnd && evEnd > slotStart;
    });
  };

  // Obtiene todos los eventos de un mes
  const getEventsForMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    return events.filter(ev => {
      const evStart = new Date(ev.start);
      return evStart >= startOfMonth && evStart <= endOfMonth;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  };

  // Agrupa eventos del mes por día
  const getGroupedMonthEvents = (date) => {
    const monthEvents = getEventsForMonth(date);
    const grouped = {};
    
    monthEvents.forEach(ev => {
      const evDate = new Date(ev.start);
      const key = format(evDate, "yyyy-MM-dd");
      if (!grouped[key]) {
        grouped[key] = {
          date: evDate,
          events: []
        };
      }
      grouped[key].events.push(ev);
    });
    
    return Object.values(grouped);
  };

  // Obtiene los 7 días de la semana de una fecha
  const getDaysOfWeek = (date) => {
    const currentDay = date.getDay(); // 0 es domingo
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(date);
    monday.setDate(monday.getDate() + distanceToMonday);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Navegación en móvil
  const handlePrev = () => {
    if (mobileViewMode === "day") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (mobileViewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else if (mobileViewMode === "month") {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (mobileViewMode === "day") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    } else if (mobileViewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else if (mobileViewMode === "month") {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + 1);
      setCurrentDate(d);
    }
  };

  const formatDateLabel = () => {
    if (mobileViewMode === "day") {
      return format(currentDate, "eeee d 'de' MMMM", { locale: esLocale });
    } else if (mobileViewMode === "week") {
      const days = getDaysOfWeek(currentDate);
      const startDay = days[0];
      const endDay = days[6];
      return `${format(startDay, "d MMM", { locale: esLocale })} - ${format(endDay, "d MMM yyyy", { locale: esLocale })}`;
    } else if (mobileViewMode === "month") {
      return format(currentDate, "MMMM yyyy", { locale: esLocale });
    }
    return "";
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
      if (prevClick.slotTime === slotTime && (now - prevClick.time) > 300) {
        setSelectedDate(slotInfo.start);
        setSelectedEndDate(slotInfo.end);
        setIsModalOpen(true);
        lastClickRef.current = { time: 0, slotTime: null };
        setLastSelectedSlot(null);
      } else {
        lastClickRef.current = { time: now, slotTime: slotTime };
        setLastSelectedSlot(slotTime);
      }
    }
  };

  // Abre el modal SweetAlert con el menú de detalles completo
  const openEventDetails = (event) => {
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

  const handleSelectEvent = (event) => {
    if (currentView === "month") {
      setCurrentDate(event.start);
      setCurrentView("day");
      return;
    }
    openEventDetails(event);
  };

  const handleSelectEventFromList = (event) => {
    openEventDetails(event);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchEvents();
  };

  // Componente de cabecera de día personalizado en Desktop para renderizar los dots
  const MonthDateHeader = ({ date, label }) => {
    return (
      <div className="custom-date-header-cell">
        <span className="rbc-button-link">{label}</span>
      </div>
    );
  };

  // Renders de vistas móviles
  const renderDayView = () => {
    const slots = [];
    for (let h = 6; h <= 19; h++) {
      slots.push(h);
    }

    return (
      <div className="mobile-day-timeline">
        {slots.map(hour => {
          const hourEvents = getEventsForSlot(currentDate, hour);
          const isSlotLibre = hourEvents.length === 0;
          
          return (
            <div key={hour} className={`mobile-timeline-row ${isSlotLibre ? "libre" : "ocupado"}`}>
              <div className="timeline-time-col">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="timeline-card-col">
                {isSlotLibre ? (
                  <div 
                    className="timeline-card-libre"
                    onClick={() => {
                      const selectedStart = new Date(currentDate);
                      selectedStart.setHours(hour, 0, 0, 0);
                      
                      const selectedEnd = new Date(currentDate);
                      selectedEnd.setHours(hour, 30, 0, 0);
                      
                      setSelectedDate(selectedStart);
                      setSelectedEndDate(selectedEnd);
                      setIsModalOpen(true);
                    }}
                  >
                    <span className="status-label">Libre</span>
                    <span className="action-hint">+ Agendar</span>
                  </div>
                ) : (
                  hourEvents.map(event => (
                    <div 
                      key={event.id} 
                      className="timeline-card-event"
                      onClick={() => handleSelectEventFromList(event)}
                    >
                      <div className="event-card-header">
                        <span className="event-duration-badge">
                          {Math.round((new Date(event.end) - new Date(event.start)) / 60000)} min
                        </span>
                        <span className="event-time-range">
                          {format(new Date(event.start), "HH:mm")} - {format(new Date(event.end), "HH:mm")}
                        </span>
                      </div>
                      <h4 className="event-card-title">{event.title}</h4>
                      <div className="event-card-actions">
                        {event.joinUrl && (
                          <button 
                            className="btn-event-join"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(event.joinUrl, '_blank');
                            }}
                          >
                            Unirse
                          </button>
                        )}
                        <button 
                          className="btn-event-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEventFromList(event);
                          }}
                        >
                          Anular
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getDaysOfWeek(currentDate);

    return (
      <div className="mobile-week-timeline">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day).sort((a, b) => new Date(a.start) - new Date(b.start));
          const hasEvents = dayEvents.length > 0;
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <div 
              key={idx} 
              className={`mobile-week-day-card ${isToday ? "today" : ""}`}
              onClick={() => {
                setCurrentDate(day);
                setMobileViewMode("day");
              }}
            >
              <div className="week-day-header">
                <span className="week-day-name">
                  {format(day, "eeee d", { locale: esLocale }).charAt(0).toUpperCase() + 
                   format(day, "eeee d", { locale: esLocale }).slice(1)}
                </span>
                {isToday && <span className="today-badge">Hoy</span>}
              </div>
              <div className="week-day-events-list">
                {!hasEvents ? (
                  <div className="week-day-empty-msg">
                    <span>Libre todo el día</span>
                  </div>
                ) : (
                  dayEvents.map(event => (
                    <div key={event.id} className="week-day-event-item">
                      <span className="event-item-time">
                        {format(new Date(event.start), "HH:mm")}
                      </span>
                      <span className="event-item-title">{event.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const groupedEvents = getGroupedMonthEvents(currentDate);

    if (groupedEvents.length === 0) {
      return (
        <div className="mobile-month-empty">
          <p>No hay reuniones agendadas para este mes.</p>
        </div>
      );
    }

    return (
      <div className="mobile-month-timeline">
        {groupedEvents.map(({ date, events: dayEvents }, idx) => (
          <div key={idx} className="month-group-card">
            <div 
              className="month-group-header"
              onClick={() => {
                setCurrentDate(date);
                setMobileViewMode("day");
              }}
            >
              <h4>
                {format(date, "eeee d 'de' MMMM", { locale: esLocale }).charAt(0).toUpperCase() + 
                 format(date, "eeee d 'de' MMMM", { locale: esLocale }).slice(1)}
              </h4>
              <span className="view-day-link">Ver día ›</span>
            </div>
            <div className="month-group-events">
              {dayEvents.map(event => (
                <div 
                  key={event.id} 
                  className="month-event-card"
                  onClick={() => handleSelectEventFromList(event)}
                >
                  <div className="month-event-time">
                    {format(new Date(event.start), "HH:mm")} - {format(new Date(event.end), "HH:mm")}
                  </div>
                  <div className="month-event-title">{event.title}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
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
          onClick={() => { setSelectedDate(currentDate || new Date()); setIsModalOpen(true); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg>
          Nueva Reunión
        </button>
      </div>

      <div className="agendar-body-wrapper">
        
        {/* Vista Desktop: Calendario Big Calendar */}
        {!isMobile && (
          <div className={`card calendar-card ${currentView === "month" ? "view-month" : "view-detail"}`}>
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
                  },
                  month: {
                    dateHeader: MonthDateHeader
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
        )}

        {/* Vista Móvil: Listado de tarjetas de horas y navegación */}
        {isMobile && (
          <div className="mobile-cards-view">
            
            {/* Cabecera de navegación y selector de vista */}
            <div className="mobile-view-nav-wrapper">
              <div className="mobile-view-selector">
                <button 
                  className={`view-btn ${mobileViewMode === "day" ? "active" : ""}`}
                  onClick={() => setMobileViewMode("day")}
                >
                  Día
                </button>
                <button 
                  className={`view-btn ${mobileViewMode === "week" ? "active" : ""}`}
                  onClick={() => setMobileViewMode("week")}
                >
                  Semana
                </button>
                <button 
                  className={`view-btn ${mobileViewMode === "month" ? "active" : ""}`}
                  onClick={() => setMobileViewMode("month")}
                >
                  Mes
                </button>
              </div>

              <div className="mobile-date-navigator">
                <button className="nav-arrow-btn" onClick={handlePrev}>
                  ‹
                </button>
                
                <div className="mobile-date-display-btn">
                  <span>{formatDateLabel()}</span>
                  <input 
                    type="date" 
                    className="mobile-native-datepicker-overlay"
                    value={format(currentDate, "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCurrentDate(new Date(e.target.value + "T12:00:00"));
                      }
                    }}
                  />
                </div>

                <button className="nav-arrow-btn" onClick={handleNext}>
                  ›
                </button>
              </div>
            </div>

            {/* Listado de contenido según la vista activa */}
            <div className="mobile-view-scroll-content">
              {mobileViewMode === "day" && renderDayView()}
              {mobileViewMode === "week" && renderWeekView()}
              {mobileViewMode === "month" && renderMonthView()}
            </div>

          </div>
        )}

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
          background-color: #f0fdfa !important;
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
          width: 32px !important; height: 32px !important; min-width: 32px !important; max-width: 32px !important;
          border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important;
          padding: 0 !important; margin: 0 !important; box-sizing: border-box !important; flex-shrink: 0 !important;
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

        /* ESTILOS DE VISTA DE TARJETAS MÓVILES (PREMIUM) */
        .mobile-cards-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }
        .mobile-view-nav-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
          background: white;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .mobile-view-selector {
          display: flex;
          gap: 6px;
          width: 100%;
        }
        .mobile-view-selector .view-btn {
          flex: 1;
          padding: 6px 12px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mobile-view-selector .view-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }
        .mobile-date-navigator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          border-top: 1px solid #f1f5f9;
          padding-top: 8px;
        }
        .mobile-date-navigator .nav-arrow-btn {
          background: #f1f5f9;
          border: none;
          font-size: 18px;
          font-weight: 700;
          color: #475569;
          width: 32px !important;
          height: 32px !important;
          min-width: 32px !important;
          max-width: 32px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          flex-shrink: 0 !important;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mobile-date-navigator .nav-arrow-btn:active {
          background: #e2e8f0;
        }
        .mobile-date-display-btn {
          position: relative;
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          text-transform: capitalize;
          padding: 6px 12px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mobile-native-datepicker-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        .mobile-view-scroll-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          width: 100%;
          padding-bottom: 20px;
        }

        /* 1. Día View - Timeline style */
        .mobile-day-timeline {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .mobile-timeline-row {
          display: flex;
          flex-direction: row;
          gap: 12px;
          width: 100%;
          align-items: stretch;
        }
        .timeline-time-col {
          width: 48px;
          min-width: 48px;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding-top: 10px;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
        }
        .timeline-card-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .timeline-card-libre {
          border: 1.5px dashed #cbd5e1;
          border-radius: 10px;
          padding: 10px 14px;
          background: #fafafa;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .timeline-card-libre:active {
          background: #eff6ff;
          border-color: #3b82f6;
        }
        .timeline-card-libre .status-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
        }
        .timeline-card-libre .action-hint {
          font-size: 10px;
          font-weight: 700;
          color: #3b82f6;
        }
        .timeline-card-event {
          border: 1px solid #dbeafe;
          border-left: 4px solid #3b82f6;
          border-radius: 10px;
          padding: 10px 12px;
          background: #eff6ff;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .timeline-card-event .event-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .event-duration-badge {
          background: #3b82f6;
          color: white;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .event-time-range {
          font-size: 10.5px;
          font-weight: 700;
          color: #1d4ed8;
        }
        .event-card-title {
          font-size: 11.5px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          line-height: 1.3;
        }
        .event-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
          justify-content: flex-end;
        }
        .btn-event-join {
          background: #10b981;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 9.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-event-join:hover {
          background: #059669;
        }
        .btn-event-delete {
          background: #fee2e2;
          color: #ef4444;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 9.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-event-delete:hover {
          background: #fecaca;
        }

        /* 2. Semana View - Cards por día */
        .mobile-week-timeline {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .mobile-week-day-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .mobile-week-day-card:active {
          background: #f8fafc;
        }
        .mobile-week-day-card.today {
          border-color: #14b8a6;
          background: #f0fdfa;
        }
        .week-day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
        }
        .week-day-name {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
        }
        .today-badge {
          background: #14b8a6;
          color: white;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .week-day-events-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .week-day-empty-msg {
          font-size: 10.5px;
          color: #94a3b8;
          font-style: italic;
        }
        .week-day-event-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          padding: 6px 10px;
          border-radius: 6px;
        }
        .event-item-time {
          font-size: 10px;
          font-weight: 700;
          color: #475569;
          min-width: 32px;
        }
        .event-item-title {
          font-size: 10.5px;
          font-weight: 600;
          color: #1e293b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        /* 3. Mes View - Agrupado */
        .mobile-month-empty {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
          font-size: 12px;
        }
        .mobile-month-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .month-group-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .month-group-header {
          background: #f8fafc;
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .month-group-header h4 {
          margin: 0;
          font-size: 11.5px;
          font-weight: 700;
          color: #1e293b;
        }
        .view-day-link {
          font-size: 10px;
          font-weight: 700;
          color: #3b82f6;
        }
        .month-group-events {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: #e2e8f0;
        }
        .month-event-card {
          background: white;
          padding: 10px 12px;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .month-event-card:active {
          background: #f8fafc;
        }
        .month-event-time {
          font-size: 10px;
          font-weight: 700;
          color: #475569;
        }
        .month-event-title {
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
          flex: 1;
          text-align: right;
          margin-left: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
            display: flex !important;
            flex-direction: column !important;
          }
          .agendar-body-wrapper {
            overflow: visible;
            width: 100%;
            min-width: 0;
            display: flex !important;
            flex-direction: column !important;
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
