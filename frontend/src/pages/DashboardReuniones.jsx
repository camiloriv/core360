import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import styles from "../styles/DashboardStyles";
import SearchableFilter from "../components/form/fields/SearchableFilter";
import KpiCard from "../components/dashboard/KpiCard";
import { exportToExcel } from "../utils/exportExcel";
import Swal from "sweetalert2";
import "../styles/core360-theme.css";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getPeriodoActual() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildPeriodoOptions() {
  const now = new Date();
  const y = now.getFullYear();
  const opts = [{ value: `anio-${y}`, label: `AÑO ${y}` }];
  for (let i = 0; i < 12; i++) {
    const m = String(i + 1).padStart(2, "0");
    opts.push({ value: `${y}-${m}`, label: `${MESES[i].toUpperCase()}` });
  }
  return opts;
}

const TYPE_COLORS = {
  Inducción: "var(--secondary-color)", // Azul
  "Resolver dudas": "var(--text-muted)", // Gris
  "Implementación TI": "var(--success-color)", // Verde
  "Negativos/Aportes": "#800000", // Burdeo
};

const getMeetingColor = (type) => TYPE_COLORS[type] || "var(--text-light)"; // Default gris claro

export default function DashboardReuniones() {
  const { user, reuniones, jefaturas, empresas, loading } = useDashboardData();
  const userRol = user?.permisos;

  const [filtroMacroZona, setFiltroMacroZona] = useState("Todas");
  const [filtroJefatura, setFiltroJefatura] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");
  const [filtroTipo, setFiltroTipo] = useState("Todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState(`anio-${new Date().getFullYear()}`);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const periodoOptions = useMemo(() => buildPeriodoOptions(), []);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Solo gerencia_general y admin pueden cambiar el filtro Macro-Zona
  const mostrarFiltroMacroZona = userRol === 'admin' || userRol === 'gerencia_general';
  // Solo admin, gerencia_general y gerencia pueden ver y cambiar el filtro de Jefatura
  const mostrarFiltroJefatura = userRol === 'admin' || userRol === 'gerencia_general' || userRol === 'gerencia';

  useEffect(() => {
    document.title = "CORE 360 - Minutas";
  }, []);

  useEffect(() => {
    setFiltroEmpresa("Todas");
  }, [filtroJefatura]);

  useEffect(() => {
    setFiltroJefatura("");
    setFiltroEmpresa("Todas");
  }, [filtroMacroZona]);

  // Jefaturas que tienen al menos una empresa en la macro-zona seleccionada
  const jefaturasFiltradas = useMemo(() => {
    return jefaturas.filter(j =>
      empresas.some(e => {
        if (e.jefatura_id !== j.id) return false;
        if (filtroMacroZona === "Matriz") return e.zona_nombre && e.zona_nombre.toLowerCase().includes("matriz");
        if (filtroMacroZona === "Regiones") return !e.zona_nombre || !e.zona_nombre.toLowerCase().includes("matriz");
        return true;
      })
    );
  }, [jefaturas, empresas, filtroMacroZona]);

  const esJefaturaMatriz = useCallback((jefId) => {
    return empresas.some(e => e.jefatura_id === jefId && e.zona_nombre && e.zona_nombre.toLowerCase().includes("matriz"));
  }, [empresas]);

  const jefaturasFiltradasOrdenadas = useMemo(() => {
    return [...jefaturasFiltradas].sort((a, b) => {
      const aEsMatriz = esJefaturaMatriz(a.id);
      const bEsMatriz = esJefaturaMatriz(b.id);
      if (aEsMatriz && !bEsMatriz) return -1;
      if (!aEsMatriz && bEsMatriz) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [jefaturasFiltradas, esJefaturaMatriz]);

  const optionsMacroZona = ["TODAS", "MATRIZ", "REGIONES"];
  const optionsJefaturas = useMemo(() => [
    "TODAS",
    ...jefaturasFiltradasOrdenadas.map(j => j.nombre.toUpperCase())
  ], [jefaturasFiltradasOrdenadas]);

  const empresasPorJefatura = useMemo(() => {
    return empresas.filter(emp => {
      const pasaJefatura = (userRol === "jefatura" || userRol === "ejecutiva") || filtroJefatura === "" || emp.jefatura_id === Number(filtroJefatura);
      
      let pasaMacroZona = true;
      if (filtroMacroZona === "Matriz") {
        pasaMacroZona = emp.zona_nombre && emp.zona_nombre.toLowerCase().includes("matriz");
      } else if (filtroMacroZona === "Regiones") {
        pasaMacroZona = !emp.zona_nombre || !emp.zona_nombre.toLowerCase().includes("matriz");
      }

      return pasaJefatura && pasaMacroZona;
    });
  }, [empresas, userRol, filtroJefatura, filtroMacroZona]);

  const optionsEmpresas = useMemo(() => [
    "Todas",
    ...[...new Set(empresasPorJefatura.map(emp => emp.nombre))].sort()
  ], [empresasPorJefatura]);

  const optionsTipos = useMemo(() => [
    "Todas",
    ...[...new Set(reuniones.map(r => r.tipo_reu).filter(Boolean))].sort()
  ], [reuniones]);

  const filteredReuniones = useMemo(() => {
    const result = reuniones.filter((r) => {
      const pasaMacroYJef = empresasPorJefatura.some(emp => emp.id === r.empresa_id);
      const pasaEmpresa = filtroEmpresa === "Todas" || r.empresa_nombre === filtroEmpresa;
      const pasaTipo = filtroTipo === "Todas" || r.tipo_reu === filtroTipo;

      let pasaPeriodo = true;
      if (r.fecha_reu) {
        const d = new Date(r.fecha_reu);
        const rYear = d.getFullYear();
        const rMonth = String(d.getMonth() + 1).padStart(2, "0");
        
        if (filtroPeriodo.startsWith("anio-")) {
          const anioSeleccionado = Number(filtroPeriodo.replace("anio-", ""));
          pasaPeriodo = rYear === anioSeleccionado;
        } else {
          // Formato YYYY-MM
          const [fYear, fMonth] = filtroPeriodo.split("-");
          pasaPeriodo = rYear === Number(fYear) && rMonth === fMonth;
        }
      }

      return pasaMacroYJef && pasaEmpresa && pasaTipo && pasaPeriodo && r.estado_envio !== "pendiente";
    });

    return result.sort(
      (a, b) => new Date(b.fecha_reu) - new Date(a.fecha_reu),
    );
  }, [
    reuniones,
    filtroMacroZona,
    filtroJefatura,
    filtroEmpresa,
    filtroTipo,
    filtroPeriodo,
    userRol,
    user,
  ]);

  // Reiniciar página a 1 cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroMacroZona, filtroJefatura, filtroEmpresa, filtroTipo, filtroPeriodo]);

  // 🔹 CÁLCULO DE DATOS DE REUNIONES ÚNICAS
  const reunionesEsteMes = useMemo(() => {
    return filteredReuniones.filter((r) => {
      const d = new Date(r.fecha_reu);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });
  }, [filteredReuniones]);

  const empresasUnicasEsteMes = useMemo(() => new Set(reunionesEsteMes.map((r) => r.empresa_id)).size, [reunionesEsteMes]);
  const empresasUnicasTotal = useMemo(() => new Set(filteredReuniones.map((r) => r.empresa_id)).size, [filteredReuniones]);

  // 🔹 CÁLCULO DE DATOS PARA GRÁFICOS DINÁMICOS

  // 1. Gráfico de Barras: Cantidad por Tipo
  const barData = useMemo(() => {
    return Object.entries(
      filteredReuniones.reduce((acc, r) => {
        acc[r.tipo_reu] = (acc[r.tipo_reu] || 0) + 1;
        return acc;
      }, {}),
    ).map(([name, total]) => ({ name, total }));
  }, [filteredReuniones]);

  // 2. Gráfico de Líneas: Evolución por Fecha y Tipo
  const timelineMap = useMemo(() => {
    return filteredReuniones.reduce((acc, r) => {
      const date = new Date(r.fecha_reu).toISOString().split("T")[0];
      if (!acc[date]) acc[date] = {};
      acc[date][r.tipo_reu] = (acc[date][r.tipo_reu] || 0) + 1;
      return acc;
    }, {});
  }, [filteredReuniones]);

  const lineData = useMemo(() => {
    return Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        ...counts,
      }));
  }, [timelineMap]);

  // 3. Top 5 Empresas con más Reuniones
  const topEmpresasData = useMemo(() => {
    const counts = filteredReuniones.reduce((acc, r) => {
      const nombre = r.empresa_nombre || "Desconocida";
      acc[nombre] = (acc[nombre] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredReuniones]);

  const handleExport = () => {
    const dataToExport = filteredReuniones.map((r) => ({
      ID: r.id_reunion,
      Fecha: new Date(r.fecha_reu),
      Hora: r.hora,
      Tipo: r.tipo_reu,
      Motivo: r.motivo_reu,
      Empresa: r.empresa_nombre,
      Ejecutiva: r.ejecutiva_nombre,
      Jefatura: r.jefatura_nombre,
      Lugar: r.lugar,
      Participantes: r.participantes,
      Destinatario: r.enviado_a,
      Estado: r.estado_envio,
    }));
    exportToExcel(
      dataToExport,
      `Reuniones_Core360_${new Date().toISOString().split("T")[0]}`,
    );
  };

  // Lógica de Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReuniones = filteredReuniones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReuniones.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Cargando dashboard profesional...
      </div>
    );

  return (
    <div
      className="encuesta-page"
      style={{ background: "var(--bg-body)", minHeight: "100vh" }}
    >
      <div className="container" style={{ padding: "30px 20px" }}>
        <div style={{ marginBottom: "30px" }}>
          <h1
            className="page-title"
            style={{
              borderBottom: "2px solid var(--secondary-color)",
              paddingBottom: "8px",
              display: "inline-block",
              marginBottom: "8px",
            }}
          >
            Dashboard de Reuniones
          </h1>
          <p className="page-subtitle">ANÁLISIS DE REUNIONES REALIZADAS</p>
        </div>

        {/* CONTENEDOR DE FILTROS HOMOLOGADO CON COBERTURA */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 18px rgba(0, 0, 0, 0.03)", 
          marginBottom: "30px",
          gap: "20px"
        }}>
          <div style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            alignItems: "flex-end", 
            gap: "25px",
            width: "100%"
          }}>
            {/* Filtro Macro-Zona */}
            {mostrarFiltroMacroZona && (
              <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
                <SearchableFilter 
                  label="Macro-Zona"
                  value={filtroMacroZona.toUpperCase()}
                  options={optionsMacroZona}
                  onChange={(val) => {
                    if (val === "TODAS" || !val) setFiltroMacroZona("Todas");
                    else if (val === "MATRIZ") setFiltroMacroZona("Matriz");
                    else if (val === "REGIONES") setFiltroMacroZona("Regiones");
                  }}
                  placeholder="Escribe para buscar..."
                />
              </div>
            )}

            {/* Seleccionar Jefatura */}
            {mostrarFiltroJefatura && (
              <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
                <SearchableFilter 
                  label="Seleccionar Jefatura / Ejecutiva"
                  value={
                    filtroJefatura
                      ? (jefaturas.find(j => j.id.toString() === filtroJefatura)?.nombre?.toUpperCase() || "TODAS")
                      : "TODAS"
                  }
                  options={optionsJefaturas}
                  onChange={(val) => {
                    if (val === "TODAS" || !val) {
                      setFiltroJefatura("");
                    } else {
                      const found = jefaturas.find(j => j.nombre.toUpperCase() === val.toUpperCase());
                      if (found) setFiltroJefatura(found.id.toString());
                      else setFiltroJefatura("");
                    }
                  }}
                  placeholder="Escribe para buscar..."
                />
              </div>
            )}

            {/* Tipo de Reunión */}
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <SearchableFilter 
                label="Tipo de Reunión"
                value={filtroTipo}
                options={optionsTipos}
                onChange={(val) => setFiltroTipo(val)}
                placeholder="Escribe para buscar..."
              />
            </div>

            {/* Seleccionar Período */}
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <div style={{ marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#475569" }}>
                Seleccionar Período
              </div>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                style={{
                  width: "100%",
                  height: "45px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  padding: "0 15px",
                  fontSize: "14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {periodoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Buscar Empresa */}
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <SearchableFilter 
                label="Buscar Empresa"
                value={filtroEmpresa}
                options={optionsEmpresas}
                onChange={(val) => setFiltroEmpresa(val)}
                placeholder="Escribe para buscar..."
              />
            </div>
          </div>
        </div>

        {/* --- KPI CARDS (6 COLUMNAS CON REUNIONES ÚNICAS) --- */}
        <div className="responsive-grid-6" style={{ marginBottom: "30px" }}>
          <KpiCard
            title="Total Histórico"
            value={filteredReuniones.length}
            sub="Reuniones filtradas"
            color="#4338ca" // Deep Indigo
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>}
          />
          <KpiCard
            title="Empresas Únicas"
            value={empresasUnicasTotal}
            sub="Empresas atendidas (total)"
            color="#0ea5e9" // Sky Blue
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
          <KpiCard
            title="Reuniones Presenciales"
            value={
              filteredReuniones.filter((r) => r.lugar === "Presencial").length
            }
            sub="Modalidad física"
            color="#0891b2" // Teal/Cyan
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>}
          />
          <KpiCard
            title="Reuniones Online"
            value={
              filteredReuniones.filter((r) => r.lugar !== "Presencial").length
            }
            sub="Modalidad remota"
            color="#9333ea" // Purple
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><circle cx="12" cy="12" r="10"/></svg>}
          />
          <KpiCard
            title="Este Mes (Total)"
            value={reunionesEsteMes.length}
            sub="Actividad mensual"
            color="#e11d48" // Rose/Pink
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          />
          <KpiCard
            title="Este Mes (Únicas)"
            value={empresasUnicasEsteMes}
            sub="Empresas reunidas"
            color="#10b981" // Emerald Green
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          />
        </div>

        {/* --- CHARTS (SIDE BY SIDE SEGÚN MOCKUP) --- */}
        <div className="responsive-grid-2" style={{ marginBottom: "30px" }}>
          <div
            style={{
              ...styles.chartBox,
              padding: 0,
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                background: "var(--text-light)",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: "15px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                Distribución por Tipo de Reunión
              </h3>
            </div>
            <div
              style={{
                padding: "20px",
                height: "350px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ResponsiveContainer width="99%" height="70%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={barData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="total"
                    nameKey="name"
                  >
                    {barData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getMeetingColor(entry.name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* LEYENDA PERSONALIZADA AL ESTILO DE LA IMAGEN */}
              <div
                className="responsive-grid-2"
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  gap: "10px",
                }}
              >
                {barData.map((entry, index) => {
                  const total = barData.reduce(
                    (acc, curr) => acc + curr.total,
                    0,
                  );
                  const percent = ((entry.total / total) * 100).toFixed(1);
                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: getMeetingColor(entry.name),
                        }}
                      ></div>
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          {entry.name} ({entry.total})
                        </span>
                        <span style={{ fontWeight: "bold" }}>{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ ...styles.chartBox, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                background: "var(--text-light)",
                padding: "10px",
                textAlign: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Top 5 Empresas con más Reuniones
              </h3>
            </div>
            <div style={{ padding: "20px", height: "350px" }}>
              <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                <BarChart
                  data={topEmpresasData}
                  layout="vertical"
                  margin={{ left: 10, right: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    stroke="var(--bg-muted)"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "var(--text-muted)",
                      fontWeight: "bold",
                    }}
                    width={110}
                  />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20} fill="var(--secondary-color)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- LINE CHART: EVOLUCIÓN EN EL TIEMPO --- */}
        <div style={{ ...styles.chartBox, padding: 0, overflow: "hidden", marginBottom: "30px", border: "1px solid #e2e8f0" }}>
          <div
            style={{
              background: "var(--text-light)",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "white",
                fontSize: "15px",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              Evolución de Reuniones en el Tiempo
            </h3>
          </div>
          <div style={{ padding: "20px", height: "300px" }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={lineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bg-muted)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: "var(--text-muted)", fontWeight: "bold" }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => {
                    const parts = val.split("-");
                    return `${parts[2]}/${parts[1]}`;
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: "var(--text-muted)", fontWeight: "bold" }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  labelFormatter={(val) => `Fecha: ${val}`}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                
                {Object.keys(TYPE_COLORS).map((tipo) => (
                  <Line
                    key={tipo}
                    type="monotone"
                    dataKey={tipo}
                    name={tipo}
                    stroke={TYPE_COLORS[tipo]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- HISTORIAL (TABLA AL FINAL) --- */}
        <div style={styles.tableCard}>
          <div
            style={{
              ...styles.tableHeader,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
              Historial de Reuniones
            </h3>
            <button
              onClick={handleExport}
              style={{
                padding: "8px 16px",
                background: "#dcfce7",
                color: "#166534",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#bbf7d0")}
              onMouseLeave={(e) => (e.target.style.background = "#dcfce7")}
            >
              📊 Exportar a Excel
            </button>
          </div>
          <div className="table-responsive">
            <table style={styles.table}>
              <thead>
                <tr style={styles.th}>
                  <th style={styles.thCell}>FECHA / ID</th>
                  <th style={styles.thCell}>EMPRESA / EJECUTIVA</th>
                  <th style={styles.thCell}>TIPO / MOTIVO</th>
                  <th style={styles.thCell}>ENVÍO</th>
                  <th style={styles.thCell}>FECHA DE ENVÍO</th>
                  <th style={styles.thCell}>ADJUNTOS</th>
                </tr>
              </thead>
              <tbody>
                {currentReuniones.map((r, index) => {
                  const isLastRows = index >= currentReuniones.length - 2 && currentReuniones.length > 3;
                  const adjuntos = r.archivos_nombres
                    ? JSON.parse(r.archivos_nombres)
                    : [];
                  return (
                    <tr key={r.id_reunion} style={styles.tr}>
                      <td style={styles.tdCell}>
                        <div style={styles.companyName}>
                          {new Date(r.fecha_reu).toLocaleDateString()}
                        </div>
                        <div style={{ ...styles.meetingIdText, whiteSpace: "nowrap" }}>{r.id_reunion}</div>
                      </td>
                      <td style={styles.tdCell}>
                        <div style={styles.companyName}>{r.empresa_nombre}</div>
                        <div style={styles.ejecutivaName}>
                          {r.ejecutiva_nombre}
                        </div>
                      </td>
                      <td style={styles.tdCell}>
                        <div style={{ fontWeight: "bold", color: "#334155" }}>
                          {r.tipo_reu}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "250px",
                          }}
                          title={r.motivo_reu}
                        >
                          {r.motivo_reu}
                        </div>
                      </td>
                      <td style={styles.tdCell}>
                        <div style={{ position: "relative" }} onMouseLeave={() => setOpenDropdownId(null)}>
                          <div
                            onClick={() => setOpenDropdownId(openDropdownId === r.id_reunion ? null : r.id_reunion)}
                            style={{
                              color: "#166534",
                              fontWeight: "bold",
                              cursor: "pointer",
                              textDecoration: "none",
                              fontSize: "12px",
                              background: "#dcfce7",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              display: "inline-block",
                              whiteSpace: "nowrap",
                              transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#bbf7d0")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#dcfce7")}
                          >
                            Enviado
                          </div>

                          {openDropdownId === r.id_reunion && (
                            <div style={{
                              position: "absolute",
                              left: 0,
                              top: isLastRows ? "auto" : "100%",
                              bottom: isLastRows ? "100%" : "auto",
                              marginTop: 0,
                              marginBottom: 0,
                              background: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                              padding: "4px 8px",
                              zIndex: 50,
                              minWidth: "180px",
                              maxHeight: "150px",
                              overflowY: "auto"
                            }}>
                              {(r.enviado_a || "No especificado").split(",").map((email, idx, arr) => (
                                <div key={idx} style={{ 
                                  padding: "6px 0", 
                                  fontSize: "11px", 
                                  color: "#334155", 
                                  borderBottom: idx < arr.length - 1 ? "1px solid #f1f5f9" : "none",
                                  wordBreak: "break-all"
                                }}>
                                  {email.trim()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={styles.tdCell}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            marginTop: "4px",
                          }}
                        >
                          {r.estado_envio === "enviado" && r.created_at ? (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-light)",
                                fontWeight: "bold",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {new Date(r.created_at).toLocaleString("es-CL", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : r.estado_envio === "programado" ? (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#ca8a04", // Yellow for scheduled
                                fontStyle: "italic",
                                fontWeight: "bold"
                              }}
                            >
                              Programada
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                fontStyle: "italic"
                              }}
                            >
                              No enviado
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.tdCell}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {/* Botón Adjuntos (Clip) */}
                          {adjuntos.length > 0 ? (
                            <div style={{ position: "relative" }} onMouseLeave={() => setOpenDropdownId(null)}>
                              <div
                                onClick={() => setOpenDropdownId(openDropdownId === `${r.id_reunion}-adjuntos` ? null : `${r.id_reunion}-adjuntos`)}
                                style={{
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  padding: "4px",
                                  borderRadius: "4px",
                                  background: "#f1f5f9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                title="Ver adjuntos"
                              >
                                📎
                              </div>

                              {openDropdownId === `${r.id_reunion}-adjuntos` && (
                                <div style={{
                                  position: "absolute",
                                  right: 0,
                                  top: isLastRows ? "auto" : "100%",
                                  bottom: isLastRows ? "100%" : "auto",
                                  marginTop: 0,
                                  marginBottom: 0,
                                  background: "white",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "6px",
                                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                  padding: "6px 8px",
                                  zIndex: 50,
                                  width: "max-content",
                                  maxHeight: "150px",
                                  overflowY: "auto",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px"
                                }}>
                                  <div style={{ fontSize: "10px", fontWeight: "bold", color: "var(--text-light)", marginBottom: "2px" }}>Adjuntos:</div>
                                  {adjuntos.map((file, idx) => (
                                    <a
                                      key={idx}
                                      href={`${import.meta.env.VITE_API_URL || "http://localhost:8080"}/uploads/${file}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: "11px",
                                        color: "var(--secondary-color)",
                                        textDecoration: "none",
                                        borderBottom: "1px solid #f1f5f9",
                                        paddingBottom: "4px",
                                        whiteSpace: "nowrap"
                                      }}
                                    >
                                      📄 {file.split("-").slice(2).join("-") || file}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}

                          {/* Botón Encuesta (Documento) */}
                          {r.programar_encuesta ? (
                            <div style={{ position: "relative" }} onMouseLeave={() => setOpenDropdownId(null)}>
                              <div
                                onClick={() => setOpenDropdownId(openDropdownId === `${r.id_reunion}-encuesta` ? null : `${r.id_reunion}-encuesta`)}
                                style={{
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  padding: "4px",
                                  borderRadius: "4px",
                                  background: r.encuesta_estado_envio === "enviado" ? "#dcfce7" : "#e0f2fe",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = r.encuesta_estado_envio === "enviado" ? "#bbf7d0" : "#bae6fd")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = r.encuesta_estado_envio === "enviado" ? "#dcfce7" : "#e0f2fe")}
                                title="Ver envío de encuesta"
                              >
                                📄
                              </div>

                              {openDropdownId === `${r.id_reunion}-encuesta` && (
                                <div style={{
                                  position: "absolute",
                                  right: 0,
                                  top: isLastRows ? "auto" : "100%",
                                  bottom: isLastRows ? "100%" : "auto",
                                  marginTop: 0,
                                  marginBottom: 0,
                                  background: "white",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "6px",
                                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                  padding: "8px",
                                  zIndex: 50,
                                  minWidth: "180px",
                                  textAlign: "left"
                                }}>
                                  <div style={{ fontSize: "11px", color: "#334155" }}>
                                    {r.encuesta_estado_envio === "enviado" ? (
                                      <div style={{ whiteSpace: "nowrap" }}>
                                        Enviado a: <strong>{r.enviado_a || "No especificado"}</strong> el {new Date(r.encuesta_programada_para).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                    ) : (
                                      <div style={{ whiteSpace: "nowrap" }}>
                                        Estado: <strong>{r.encuesta_estado_envio?.toUpperCase()}</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}

                          {!adjuntos.length && !r.programar_encuesta && (
                            <span style={{ fontSize: "11px", color: "var(--border-input)", marginLeft: "4px" }}>-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredReuniones.length)} de {filteredReuniones.length} registros
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                >
                  Anterior
                </button>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '30px', fontSize: '12px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {currentPage} / {totalPages}
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#334155', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
