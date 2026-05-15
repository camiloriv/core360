import React, { useState, useEffect } from "react";
import api from "../services/api";
import styles from "../styles/DashboardStyles";

export default function SeguimientoEmpresas() {
  const [jefaturas, setJefaturas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [filtroJefatura, setFiltroJefatura] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resJ, resE, resR] = await Promise.all([
          api.get("/jefaturas"),
          api.get("/empresas"),
          api.get("/reuniones")
        ]);
        setJefaturas(resJ.data || []);
        setEmpresas(resE.data || []);
        setReuniones(resR.data || []);
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const empresasFiltradas = empresas.filter(emp => 
    filtroJefatura === "" || emp.jefatura_id === Number(filtroJefatura)
  );

  const tieneReunion = (empresaId) => {
    return reuniones.some(r => r.empresa_id === empresaId && r.estado_envio !== 'pendiente');
  };

  const totalEmpresas = empresasFiltradas.length;
  const totalGestionadas = empresasFiltradas.filter(emp => tieneReunion(emp.id)).length;
  const porcentajeAvance = totalEmpresas > 0 ? Math.round((totalGestionadas / totalEmpresas) * 100) : 0;

  if (loading) return <div style={{ padding: 40 }}>Cargando seguimiento...</div>;

  return (
    <div className="container">
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2rem", color: "#1e293b", fontWeight: "bold" }}>Seguimiento de Cobertura</h1>
        <p style={{ color: "#64748b" }}>Estado de reuniones por empresa y jefatura</p>
      </div>

      {/* FILTRO JEFATURA Y CONTADOR ALINEADOS */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-end", 
        background: "white", 
        padding: "25px", 
        borderRadius: "15px", 
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", 
        marginBottom: "30px",
        gap: "40px"
      }}>
        <div style={{ flexShrink: 0 }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Seleccionar Jefatura
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              onClick={() => setFiltroJefatura("")}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
                transition: "all 0.2s",
                background: filtroJefatura === "" ? "#3b82f6" : "#f1f5f9",
                color: filtroJefatura === "" ? "white" : "#64748b"
              }}
            >
              TODAS
            </button>
            {jefaturas.map(j => (
              <button
                key={j.id}
                onClick={() => setFiltroJefatura(j.id.toString())}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "13px",
                  transition: "all 0.2s",
                  background: filtroJefatura === j.id.toString() ? "#3b82f6" : "#f1f5f9",
                  color: filtroJefatura === j.id.toString() ? "white" : "#64748b"
                }}
              >
                {j.nombre.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* CONTADOR DE AVANCE ABARCANDO EL ESPACIO RESTANTE */}
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
            Avance de Cobertura
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", justifyContent: "flex-end" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#3b82f6" }}>
              {porcentajeAvance}%
            </div>
            <div style={{ flex: 1, maxWidth: "400px", height: "10px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ 
                width: `${porcentajeAvance}%`, 
                height: "100%", 
                background: "#3b82f6", 
                transition: "width 0.5s ease" 
              }}></div>
            </div>
          </div>
          <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "5px" }}>
            {totalGestionadas} de {totalEmpresas} empresas listas
          </div>
        </div>
      </div>

      {/* GRID DE EMPRESAS */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
        gap: "20px" 
      }}>
        {empresasFiltradas.map(emp => {
          const gestionada = tieneReunion(emp.id);
          return (
            <div 
              key={emp.id}
              style={{
                background: gestionada ? "#507255" : "#7f1d1d", // Verde opaco si tiene reuniones, Burdeo si está pendiente
                color: "white",
                padding: "25px",
                borderRadius: "12px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "120px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                transition: "transform 0.2s ease",
                cursor: "default"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>
                {emp.nombre}
              </div>
              <div style={{ 
                fontSize: "10px", 
                background: gestionada ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", 
                padding: "4px 10px", 
                borderRadius: "20px",
                fontWeight: "bold"
              }}>
                {gestionada ? "GESTIONADA" : "PENDIENTE"}
              </div>
            </div>
          );
        })}
      </div>

      {empresasFiltradas.length === 0 && (
        <div style={{ textAlign: "center", padding: "100px", color: "#94a3b8" }}>
          No hay empresas asignadas a esta jefatura.
        </div>
      )}
    </div>
  );
}
