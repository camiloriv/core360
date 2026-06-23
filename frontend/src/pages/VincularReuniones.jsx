import React, { useEffect, useState } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { syncEventosPasados, getSyncStatus, obtenerHuerfanas, vincularHuerfana, descartarHuerfana } from "../services/agendamientoService";
import SearchableFilter from "../components/form/fields/SearchableFilter";
import Swal from "sweetalert2";
import "../styles/core360-theme.css";

export default function VincularReuniones() {
  const { user, empresas } = useDashboardData();
  const [huerfanas, setHuerfanas] = useState([]);
  const [huerfanasSeleccionadas, setHuerfanasSeleccionadas] = useState({});
  const [loadingSync, setLoadingSync] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState(null);

  const fetchHuerfanas = async () => {
    try {
      const { data } = await obtenerHuerfanas();
      setHuerfanas(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await getSyncStatus();
      setUltimaSincronizacion(res.data?.ultima_sincronizacion || null);
    } catch (e) {
      console.error(e);
    }
  };

  const runSync = async (manual = false) => {
    if (manual) {
      setSyncingNow(true);
      Swal.fire({
        title: "Sincronizando...",
        text: "Consultando tu calendario de Microsoft Outlook / Teams mediante Consultas Delta",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      try {
        await syncEventosPasados();
        Swal.fire("Sincronizado", "Tu calendario ha sido sincronizado con éxito", "success");
        await fetchSyncStatus();
      } catch (e) {
        console.error("Error sincronizando calendario", e);
        Swal.fire("Error", "No se pudo sincronizar el calendario", "error");
      } finally {
        await fetchHuerfanas();
        setLoadingSync(false);
        setSyncingNow(false);
      }
    } else {
      // On load
      await Promise.all([fetchHuerfanas(), fetchSyncStatus()]);
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    document.title = "CORE 360 - Vincular Reuniones";
    runSync(false);
  }, []);

  const handleVincular = async (idHuerfana, empresaId) => {
    if (!empresaId) return;
    try {
      Swal.fire({
        title: 'Vinculando y buscando coincidencias...',
        text: 'Por favor espera, esto puede tomar unos segundos.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const result = await vincularHuerfana(idHuerfana, empresaId);
      
      Swal.fire({
        title: "Vinculada",
        text: result?.data?.message || "La reunión ha sido vinculada correctamente y se creó el borrador.",
        icon: "success",
      });
      fetchHuerfanas();
    } catch (e) {
      Swal.fire("Error", "No se pudo vincular la reunión", "error");
    }
  };

  const handleDescartar = async (idHuerfana) => {
    try {
      await descartarHuerfana(idHuerfana);
      Swal.fire({
        title: "Descartada",
        text: "La reunión ha sido ignorada.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
      fetchHuerfanas();
    } catch (e) {
      Swal.fire("Error", "No se pudo descartar", "error");
    }
  };

  return (
    <div className="container fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1 style={{ fontSize: "24px", color: "var(--primary-color)", fontWeight: "600", display: "inline-block", marginBottom: "8px" }}>
            Vincular Reuniones
          </h1>
          <p className="page-subtitle">CLASIFICACIÓN DE REUNIONES COMERCIALES PASADAS</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {ultimaSincronizacion && (
            <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "500", background: "white", padding: "8px 12px", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              Última sincronización: <span style={{ fontWeight: "bold", color: "var(--primary-color)" }}>
                {new Date(ultimaSincronizacion).toLocaleString("es-CL", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <button
            onClick={() => runSync(true)}
            disabled={syncingNow}
            style={{
              background: "var(--success-color)",
              color: "white",
              height: "42px",
              padding: "0 20px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => { e.currentTarget.style.filter = "brightness(1.05)"; }}
            onMouseOut={(e) => { e.currentTarget.style.filter = "none"; }}
          >
            🔄 {syncingNow ? "Sincronizando..." : "Sincronizar Calendario"}
          </button>
        </div>
      </div>

      {loadingSync ? (
        <div style={{ textAlign: "center", padding: "50px", color: "var(--text-muted)" }}>
          <h3>Cargando reuniones del calendario...</h3>
        </div>
      ) : huerfanas.length === 0 ? (
        <div style={{
          background: "white",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "50px 30px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.02)"
        }}>
          <div style={{ fontSize: "50px", marginBottom: "20px" }}>🎉</div>
          <h3 style={{ color: "var(--primary-color)", margin: "0 0 10px 0", fontWeight: "600" }}>¡Todo al día!</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", maxWidth: "500px", margin: "0 auto 20px auto" }}>
            No tienes reuniones comerciales pasadas sin clasificar en tu calendario. El sistema está perfectamente sincronizado.
          </p>
          <button
            onClick={() => runSync(true)}
            style={{
              background: "white",
              color: "var(--primary-color)",
              border: "1.5px solid var(--primary-color)",
              padding: "8px 20px",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Sincronizar de nuevo
          </button>
        </div>
      ) : (
        <div style={{
          background: "#fff1f2",
          border: "1px solid #fecdd3",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 4px 18px rgba(0,0,0,0.03)"
        }}>
          <h3 style={{ color: "#be123c", marginTop: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "18px" }}>
            ⚠️ Reuniones por Clasificar ({huerfanas.length})
          </h3>
          <p style={{ color: "#881337", fontSize: "14px", marginBottom: "20px" }}>
            Se detectaron eventos comerciales en tu calendario de Teams/Outlook con dominios no reconocidos. Por favor, selecciona la empresa correspondiente para cada reunión para crear su minuta borrador, o descártala si no corresponde.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {huerfanas.map(h => (
              <div key={h.id} style={{
                background: "white",
                padding: "20px",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
                border: "1px solid #ffe4e6",
                boxShadow: "0 2px 8px rgba(225, 29, 72, 0.04)"
              }}>
                <div style={{ flex: "1 1 350px", minWidth: "280px" }}>
                  <strong style={{ color: "#1e293b", fontSize: "15px", display: "block", marginBottom: "4px" }}>{h.asunto}</strong>
                  <div style={{ fontSize: "13px", color: "#64748b", display: "flex", gap: "8px", alignItems: "center" }}>
                    <span>📅 {new Date(h.fecha).toLocaleDateString()} a las {h.hora}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px", lineHeight: "1.4" }}>
                    <span style={{ fontWeight: "600", color: "#475569" }}>Asistentes:</span> {(() => {
                      if (!h.asistentes) return "Ninguno";
                      try {
                        const parsed = typeof h.asistentes === "string" ? JSON.parse(h.asistentes) : h.asistentes;
                        if (Array.isArray(parsed)) {
                          return parsed.map(item => {
                            if (typeof item === 'string') return item;
                            if (item && typeof item === 'object') {
                              return item.name ? `${item.name} (${item.email})` : item.email;
                            }
                            return String(item);
                          }).join(", ");
                        }
                      } catch (e) {}
                      return String(h.asistentes);
                    })()}
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  flex: "2 1 600px",
                  minWidth: "320px",
                  justifyContent: "flex-end",
                  flexWrap: "wrap"
                }}>
                  <div style={{ flex: "1 1 250px", minWidth: "220px" }}>
                    <SearchableFilter
                      label=""
                      value={huerfanasSeleccionadas[h.id] ? (empresas.find(e => e.id.toString() === huerfanasSeleccionadas[h.id])?.nombre || "") : ""}
                      options={empresas.map(emp => emp.nombre)}
                      onChange={(val) => {
                        const found = empresas.find(e => e.nombre.toUpperCase() === (val || "").toUpperCase());
                        setHuerfanasSeleccionadas(prev => ({
                          ...prev,
                          [h.id]: found ? found.id.toString() : ""
                        }));
                      }}
                      placeholder="Buscar empresa..."
                    />
                  </div>
                  <button 
                    onClick={() => handleVincular(h.id, huerfanasSeleccionadas[h.id])}
                    disabled={!huerfanasSeleccionadas[h.id]}
                    style={{ 
                      background: huerfanasSeleccionadas[h.id] ? "var(--primary-color)" : "#cbd5e1", 
                      color: "white", 
                      height: "42px", 
                      padding: "0 22px", 
                      border: "none", 
                      borderRadius: "8px", 
                      cursor: huerfanasSeleccionadas[h.id] ? "pointer" : "not-allowed", 
                      fontWeight: "bold",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: huerfanasSeleccionadas[h.id] ? "0 2px 4px rgba(30, 41, 59, 0.1)" : "none"
                    }}
                    onMouseOver={(e) => { if (huerfanasSeleccionadas[h.id]) e.currentTarget.style.filter = "brightness(1.1)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.filter = "none"; }}
                  >
                    Vincular
                  </button>
                  <button 
                    onClick={() => handleDescartar(h.id)}
                    style={{ 
                      background: "white", 
                      color: "#475569", 
                      height: "42px", 
                      padding: "0 20px", 
                      border: "1.5px solid #cbd5e1", 
                      borderRadius: "8px", 
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    onMouseOver={(e) => { 
                      e.currentTarget.style.background = "#f8fafc"; 
                      e.currentTarget.style.borderColor = "#94a3b8";
                    }}
                    onMouseOut={(e) => { 
                      e.currentTarget.style.background = "white"; 
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }}
                  >
                    No requiere minuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
