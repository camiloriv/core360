import React, { useState, useEffect } from "react";
import api from "../services/api";
import styles from "../styles/DashboardStyles";
import SearchableFilter from "../components/form/fields/SearchableFilter";

import Swal from "sweetalert2";

export default function SeguimientoEmpresas() {
  const [jefaturas, setJefaturas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [filtroJefatura, setFiltroJefatura] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");
  const [viewMode, setViewMode] = useState("grid");
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

  useEffect(() => {
    setFiltroEmpresa("Todas");
  }, [filtroJefatura]);

  const tieneReunion = (empresaId) => {
    return reuniones.some(r => r.empresa_id === empresaId && r.estado_envio !== 'pendiente');
  };

  const getReunionInfo = (empresaId) => {
    return reuniones.find(r => r.empresa_id === empresaId && r.estado_envio !== 'pendiente');
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "";
    const matches = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matches) {
      return `${matches[3]}/${matches[2]}/${matches[1]}`;
    }
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return "";
      const formatter = new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Santiago',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return formatter.format(d).replace(/-/g, '/');
    } catch {
      return "";
    }
  };

  const empresasPorJefatura = empresas.filter(emp => 
    filtroJefatura === "" || emp.jefatura_id === Number(filtroJefatura)
  );

  const empresasFiltradas = empresasPorJefatura.filter(emp =>
    filtroEmpresa === "Todas" || emp.nombre === filtroEmpresa
  ).sort((a, b) => {
    const gestionadaA = tieneReunion(a.id);
    const gestionadaB = tieneReunion(b.id);
    
    // Prioridad: 1. concretada, 2. solicitada, 3. pendiente, 4. gestionada
    let prioA = 3; // Pendiente por defecto
    if (gestionadaA) prioA = 4;
    else if (a.estado_seguimiento === 'concretada') prioA = 1;
    else if (a.estado_seguimiento === 'solicitada') prioA = 2;

    let prioB = 3; // Pendiente por defecto
    if (gestionadaB) prioB = 4;
    else if (b.estado_seguimiento === 'concretada') prioB = 1;
    else if (b.estado_seguimiento === 'solicitada') prioB = 2;

    if (prioA !== prioB) return prioA - prioB;
    return a.nombre.localeCompare(b.nombre);
  });

  const optionsEmpresas = [
    "Todas",
    ...[...new Set(empresasPorJefatura.map(emp => emp.nombre))].sort()
  ];

  const handleEstadoClick = async (emp) => {
    if (tieneReunion(emp.id)) {
      Swal.fire('Aviso', 'Esta empresa ya tiene una minuta registrada y está GESTIONADA.', 'info');
      return;
    }

    const { value: nuevoEstado } = await Swal.fire({
      title: `<div style="font-size: 22px;">Estado de seguimiento</div>`,
      html: `<div style="font-size: 15px; color: var(--text-muted);">${emp.nombre}</div>`,
      input: 'select',
      inputOptions: {
        pendiente: 'Pendiente',
        solicitada: 'Solicitada',
        concretada: 'Concretada'
      },
      showCancelButton: true,
      confirmButtonColor: 'var(--primary-color)',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Guardar',
      inputValue: emp.estado_seguimiento || 'pendiente',
      width: '350px',
      didOpen: () => {
        const select = Swal.getInput();
        select.style.width = '100%';
        select.style.maxWidth = '260px';
        select.style.margin = '15px auto 0';
        select.style.fontSize = '14px';
      }
    });

    if (nuevoEstado && nuevoEstado !== (emp.estado_seguimiento || 'pendiente')) {
      try {
        const res = await api.patch(`/empresas/${emp.id}/estado`, { estado_seguimiento: nuevoEstado });
        const { fecha_solicitada, fecha_concretada } = res.data;
        setEmpresas(prev => prev.map(e => e.id === emp.id ? { 
          ...e, 
          estado_seguimiento: nuevoEstado,
          fecha_solicitada,
          fecha_concretada
        } : e));
        Swal.fire({ title: '¡Actualizado!', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err) {
        Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
      }
    }
  };

  const totalEmpresas = empresasPorJefatura.length;
  const totalGestionadas = empresasPorJefatura.filter(emp => tieneReunion(emp.id)).length;
  const porcentajeAvance = totalEmpresas > 0 ? Math.round((totalGestionadas / totalEmpresas) * 100) : 0;

  if (loading) return <div style={{ padding: 40 }}>Cargando seguimiento...</div>;

  return (
    <div className="container">
      <div style={{ marginBottom: "30px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: "2rem", color: "var(--text-main)", fontWeight: "bold" }}>Seguimiento de Cobertura</h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Estado de reuniones por empresa y jefatura</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', background: 'white', padding: '5px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setViewMode('grid')}
            style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', background: viewMode === 'grid' ? 'var(--secondary-color)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'all 0.2s' }}
          >
            🔲 Vista Cuadrícula
          </button>
          <button 
            onClick={() => setViewMode('split')}
            style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', background: viewMode === 'split' ? 'var(--secondary-color)' : 'transparent', color: viewMode === 'split' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'all 0.2s' }}
          >
            📋 Vista Dividida
          </button>
          <button 
            onClick={() => setViewMode('detail')}
            style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', background: viewMode === 'detail' ? 'var(--secondary-color)' : 'transparent', color: viewMode === 'detail' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'all 0.2s' }}
          >
            📊 Detalle
          </button>
        </div>
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
        gap: "40px",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", gap: "30px", flex: 1, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flexShrink: 0 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
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
                  background: filtroJefatura === "" ? "var(--secondary-color)" : "var(--bg-muted)",
                  color: filtroJefatura === "" ? "white" : "var(--text-muted)"
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
                    background: filtroJefatura === j.id.toString() ? "var(--secondary-color)" : "var(--bg-muted)",
                    color: filtroJefatura === j.id.toString() ? "white" : "var(--text-muted)"
                  }}
                >
                  {j.nombre.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ minWidth: "220px", maxWidth: "300px", flex: 1 }}>
            <SearchableFilter 
              label="Buscar Empresa"
              value={filtroEmpresa}
              options={optionsEmpresas}
              onChange={(val) => setFiltroEmpresa(val)}
              placeholder="Escribe para buscar..."
            />
          </div>
        </div>

        {/* CONTADOR DE AVANCE ABARCANDO EL ESPACIO RESTANTE */}
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-light)", textTransform: "uppercase", marginBottom: "8px" }}>
            Avance de Cobertura
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", justifyContent: "flex-end" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--secondary-color)" }}>
              {porcentajeAvance}%
            </div>
            <div style={{ flex: 1, maxWidth: "400px", height: "10px", background: "var(--bg-muted)", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ 
                width: `${porcentajeAvance}%`, 
                height: "100%", 
                background: "var(--secondary-color)", 
                transition: "width 0.5s ease" 
              }}></div>
            </div>
          </div>
          <div style={{ fontSize: "11px", color: "var(--border-input)", marginTop: "5px" }}>
            {totalGestionadas} de {totalEmpresas} empresas listas
          </div>
        </div>
      </div>

      {/* GRID DE EMPRESAS (CUADRÍCULA) */}
      {viewMode === 'grid' && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
          gap: "20px" 
        }}>
          {empresasFiltradas.map(emp => {
            const gestionada = tieneReunion(emp.id);
            const estadoStr = gestionada ? 'gestionada' : (emp.estado_seguimiento || 'pendiente');
            
            let bgColor = "#b91c1c"; // Rojo claro para pendiente (antes oscuro)
            if (gestionada) bgColor = "#507255";
            else if (estadoStr === 'solicitada') bgColor = "#f97316"; // Naranjo vivo
            else if (estadoStr === 'concretada') bgColor = "#ca8a04"; // Amarillo oscuro/dorado para contraste blanco

            return (
              <div 
                key={emp.id}
                onClick={() => handleEstadoClick(emp)}
                style={{
                  background: bgColor,
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
                  transition: "transform 0.2s ease, opacity 0.2s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1"; }}
              >
                <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>
                  {emp.nombre}
                </div>
                <div style={{ 
                  fontSize: "10px", 
                  background: "rgba(255,255,255,0.2)", 
                  padding: "4px 10px", 
                  borderRadius: "20px",
                  fontWeight: "bold",
                  marginBottom: "6px"
                }}>
                  {estadoStr.toUpperCase()}
                </div>
                <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {estadoStr === 'solicitada' && emp.fecha_solicitada && (
                    <span>Sol: {formatearFecha(emp.fecha_solicitada)}</span>
                  )}
                  {estadoStr === 'concretada' && (
                    <>
                      {emp.fecha_solicitada && <span>Sol: {formatearFecha(emp.fecha_solicitada)}</span>}
                      {emp.fecha_concretada && <span>Conc: {formatearFecha(emp.fecha_concretada)}</span>}
                    </>
                  )}
                  {estadoStr === 'grid' && emp.fecha_solicitada && (
                    <span>Sol: {formatearFecha(emp.fecha_solicitada)}</span>
                  )}
                  {estadoStr === 'gestionada' && (() => {
                    const reu = getReunionInfo(emp.id);
                    return reu ? (
                      <>
                        {reu.fecha_reu && <span>Reunión: {formatearFecha(reu.fecha_reu)}</span>}
                        {reu.created_at && <span>Minuta: {formatearFecha(reu.created_at)}</span>}
                      </>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA DIVIDIDA (LISTA) */}
      {viewMode === 'split' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          
          {/* PENDIENTES */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderTop: '4px solid #ef4444' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              EMPRESAS PENDIENTES <span>{empresasFiltradas.filter(e => !tieneReunion(e.id)).length}</span>
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '500px', overflowY: 'auto' }}>
              {empresasFiltradas.filter(e => !tieneReunion(e.id)).map(emp => {
                const estado = emp.estado_seguimiento || 'pendiente';
                let dotColor = "#dc2626"; // Rojo vivo para pendiente
                let badgeBg = "#fee2e2";
                let badgeText = "#991b1b";
                
                if (estado === 'solicitada') { dotColor = "#f97316"; badgeBg = "#ffedd5"; badgeText = "#c2410c"; } // Naranjo brillante
                else if (estado === 'concretada') { dotColor = "#eab308"; badgeBg = "#fef08a"; badgeText = "#854d0e"; } // Tonos amarillos

                return (
                  <li 
                    key={emp.id} 
                    onClick={() => handleEstadoClick(emp)}
                    style={{ padding: '12px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotColor, flexShrink: 0 }}></span>
                      <div>
                        <div style={{ fontWeight: "bold" }}>{emp.nombre}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {estado === 'solicitada' && emp.fecha_solicitada && (
                            <span>Sol: {formatearFecha(emp.fecha_solicitada)}</span>
                          )}
                          {estado === 'concretada' && (
                            <>
                              {emp.fecha_solicitada && <span>Sol: {formatearFecha(emp.fecha_solicitada)}</span>}
                              {emp.fecha_concretada && <span>Conc: {formatearFecha(emp.fecha_concretada)}</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {estado !== 'pendiente' && (
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', background: badgeBg, color: badgeText, textTransform: 'uppercase' }}>
                        {estado}
                      </span>
                    )}
                  </li>
                );
              })}
              {empresasFiltradas.filter(e => !tieneReunion(e.id)).length === 0 && (
                <li style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>¡Excelente! No hay empresas pendientes.</li>
              )}
            </ul>
          </div>
          
          {/* GESTIONADAS */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderTop: '4px solid #10b981' }}>
            <h3 style={{ marginTop: 0, color: '#10b981', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              EMPRESAS GESTIONADAS <span>{empresasFiltradas.filter(e => tieneReunion(e.id)).length}</span>
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '500px', overflowY: 'auto' }}>
              {empresasFiltradas.filter(e => tieneReunion(e.id)).map(emp => {
                const reu = getReunionInfo(emp.id);
                return (
                  <li key={emp.id} style={{ padding: '12px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></span>
                    <div>
                      <div style={{ fontWeight: "bold" }}>{emp.nombre}</div>
                      {reu && (
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {reu.fecha_reu && <span>Reunión: {formatearFecha(reu.fecha_reu)}</span>}
                          {reu.created_at && <span>Minuta: {formatearFecha(reu.created_at)}</span>}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
              {empresasFiltradas.filter(e => tieneReunion(e.id)).length === 0 && (
                <li style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Aún no hay empresas gestionadas.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* VISTA DETALLE (TABLA) */}
      {viewMode === 'detail' && (
        <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-main)', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Resumen de Cobertura por Jefatura
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 15px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Jefatura</th>
                  <th style={{ padding: '12px 15px', color: '#dc2626', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'center' }}>Pendientes</th>
                  <th style={{ padding: '12px 15px', color: '#f97316', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'center' }}>Solicitadas</th>
                  <th style={{ padding: '12px 15px', color: '#ca8a04', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'center' }}>Concretadas</th>
                  <th style={{ padding: '12px 15px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'center' }}>Gestionadas</th>
                  <th style={{ padding: '12px 15px', color: 'var(--text-main)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'center' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(filtroJefatura === "" ? jefaturas : jefaturas.filter(j => j.id === Number(filtroJefatura))).map(jef => {
                  const empsJef = empresas.filter(e => e.jefatura_id === jef.id && (filtroEmpresa === "Todas" || e.nombre === filtroEmpresa));
                  const pendientes = empsJef.filter(e => !tieneReunion(e.id) && (e.estado_seguimiento || 'pendiente') === 'pendiente').length;
                  const solicitadas = empsJef.filter(e => !tieneReunion(e.id) && e.estado_seguimiento === 'solicitada').length;
                  const concretadas = empsJef.filter(e => !tieneReunion(e.id) && e.estado_seguimiento === 'concretada').length;
                  const gestionadas = empsJef.filter(e => tieneReunion(e.id)).length;
                  const total = empsJef.length;

                  return (
                    <tr key={jef.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--text-main)' }}>{jef.nombre.toUpperCase()}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{pendientes}</span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ background: '#ffedd5', color: '#c2410c', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{solicitadas}</span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{concretadas}</span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{gestionadas}</span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-main)' }}>{total}</td>
                    </tr>
                  );
                })}
                {(filtroJefatura === "" ? jefaturas : jefaturas.filter(j => j.id === Number(filtroJefatura))).length > 1 && (
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 'bold' }}>
                    <td style={{ padding: '15px', color: 'var(--text-main)' }}>TOTAL GENERAL</td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{ background: '#dc2626', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {jefaturas.reduce((acc, jef) => acc + empresas.filter(e => e.jefatura_id === jef.id && (filtroEmpresa === "Todas" || e.nombre === filtroEmpresa) && !tieneReunion(e.id) && (e.estado_seguimiento || 'pendiente') === 'pendiente').length, 0)}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{ background: '#f97316', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {jefaturas.reduce((acc, jef) => acc + empresas.filter(e => e.jefatura_id === jef.id && (filtroEmpresa === "Todas" || e.nombre === filtroEmpresa) && !tieneReunion(e.id) && e.estado_seguimiento === 'solicitada').length, 0)}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{ background: '#ca8a04', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {jefaturas.reduce((acc, jef) => acc + empresas.filter(e => e.jefatura_id === jef.id && (filtroEmpresa === "Todas" || e.nombre === filtroEmpresa) && !tieneReunion(e.id) && e.estado_seguimiento === 'concretada').length, 0)}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{ background: '#10b981', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {jefaturas.reduce((acc, jef) => acc + empresas.filter(e => e.jefatura_id === jef.id && (filtroEmpresa === "Todas" || e.nombre === filtroEmpresa) && tieneReunion(e.id)).length, 0)}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', fontSize: '14px', color: 'var(--text-main)' }}>
                      {jefaturas.reduce((acc, jef) => acc + empresas.filter(e => e.jefatura_id === jef.id && (filtroEmpresa === "Todas" || e.nombre === filtroEmpresa)).length, 0)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {empresasFiltradas.length === 0 && (
        <div style={{ textAlign: "center", padding: "100px", color: "var(--text-light)" }}>
          No hay empresas asignadas a esta jefatura.
        </div>
      )}
    </div>
  );
}
