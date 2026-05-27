import React, { useEffect, useState } from "react";
import api from "../services/api";
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
import "../styles/core360-theme.css";

const TYPE_COLORS = {
  Inducción: "var(--secondary-color)", // Azul
  "Resolver dudas": "var(--text-muted)", // Gris
  "Implementación TI": "var(--success-color)", // Verde
  "Negativos/Aportes": "#800000", // Burdeo
};

const getMeetingColor = (type) => TYPE_COLORS[type] || "var(--text-light)"; // Default gris claro

export default function DashboardReuniones() {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  const userRol = user?.permisos;

  const [reuniones, setReuniones] = useState([]);
  const [jefaturas, setJefaturas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroMacroZona, setFiltroMacroZona] = useState("Todas");
  const [filtroJefatura, setFiltroJefatura] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");
  const [filtroTipo, setFiltroTipo] = useState("Todas");

  // Solo gerencia_general y admin pueden cambiar el filtro Macro-Zona
  const mostrarFiltroMacroZona = userRol === 'admin' || userRol === 'gerencia_general';
  // Solo admin, gerencia_general y gerencia pueden ver y cambiar el filtro de Jefatura
  const mostrarFiltroJefatura = userRol === 'admin' || userRol === 'gerencia_general' || userRol === 'gerencia';

  useEffect(() => {
    document.title = "CORE 360 - Minutas";
    const fetchData = async () => {
      try {
        const rol = userRol;
        const id = user?.id;
        const jefaturaId = user?.jefatura_id;

        // Parámetros según rol
        let jefaturasUrl = "/jefaturas";
        let empresasUrl = "/empresas";
        let reunionesUrl = "/reuniones";

        if (rol === "gerencia" && id) {
          jefaturasUrl = `/jefaturas?gerencia_id=${id}`;
          empresasUrl = `/empresas?gerencia_id=${id}`;
          reunionesUrl = `/reuniones?usuario_id=${id}&rol=gerencia`;
        } else if (rol === "gerencia_general" && id) {
          reunionesUrl = `/reuniones`;
        } else if (rol === "jefatura" && id) {
          jefaturasUrl = `/jefaturas?jefatura_id=${id}`;
          empresasUrl = `/empresas?jefatura_id=${id}`;
          reunionesUrl = `/reuniones?usuario_id=${id}&rol=jefatura`;
        } else if (rol === "ejecutiva" && id) {
          const targetJefId = jefaturaId || id;
          jefaturasUrl = `/jefaturas?jefatura_id=${targetJefId}`;
          empresasUrl = `/empresas?jefatura_id=${targetJefId}`;
          reunionesUrl = `/reuniones?usuario_id=${id}&rol=ejecutiva`;
        }

        const [reunRes, jefRes, empRes] = await Promise.all([
          api.get(reunionesUrl),
          api.get(jefaturasUrl),
          api.get(empresasUrl),
        ]);

        const isUserDemo = user?.nombre?.toLowerCase().includes("prueba") || 
                           user?.nombre?.toLowerCase().includes("demo") ||
                           user?.correo?.toLowerCase().includes("prueba") ||
                           user?.correo?.toLowerCase().includes("demo") ||
                           user?.cargos?.toLowerCase().includes("prueba") ||
                           user?.cargos?.toLowerCase().includes("demo");

        let filteredJefaturas = (jefRes.data || []).filter(j => {
          const jDemo = j.nombre?.toLowerCase().includes("prueba") || 
                        j.nombre?.toLowerCase().includes("demo") ||
                        j.correo?.toLowerCase().includes("prueba") ||
                        j.correo?.toLowerCase().includes("demo");
          return isUserDemo ? jDemo : !jDemo;
        });

        let filteredEmpresas = (empRes.data || []).filter(emp => {
          const empDemo = emp.nombre?.toLowerCase().includes("demo") || 
                          emp.nombre?.toLowerCase().includes("prueba") ||
                          emp.jefatura_id === 28;
          return isUserDemo ? empDemo : !empDemo;
        });

        if (rol === "jefatura" && id) {
          filteredJefaturas = filteredJefaturas.filter(j => j.id === id);
          // Keep all companies returned by the backend (includes direct and managing Gerencia companies)
        } else if (rol === "ejecutiva" && (jefaturaId || id)) {
          const targetJefId = jefaturaId || id;
          filteredJefaturas = filteredJefaturas.filter(j => j.id === targetJefId);
          // Keep all companies returned by the backend
        }

        const filteredReunionesList = (reunRes.data || []).filter(r => {
          const isDemoEmp = r.empresa_nombre?.toLowerCase().includes("demo") || 
                            r.empresa_nombre?.toLowerCase().includes("prueba") ||
                            r.ejecutiva_nombre?.toLowerCase().includes("prueba") ||
                            r.ejecutiva_nombre?.toLowerCase().includes("demo") ||
                            r.jefatura_nombre?.toLowerCase().includes("prueba") ||
                            r.jefatura_nombre?.toLowerCase().includes("demo");
          return isUserDemo ? isDemoEmp : !isDemoEmp;
        });

        setReuniones(filteredReunionesList);
        setJefaturas(filteredJefaturas);
        setEmpresas(filteredEmpresas);
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

  useEffect(() => {
    setFiltroJefatura("");
    setFiltroEmpresa("Todas");
  }, [filtroMacroZona]);

  // Jefaturas que tienen al menos una empresa en la macro-zona seleccionada
  const jefaturasFiltradas = jefaturas.filter(j =>
    empresas.some(e => {
      if (e.jefatura_id !== j.id) return false;
      if (filtroMacroZona === "Matriz") return e.zona_nombre && e.zona_nombre.toLowerCase().includes("matriz");
      if (filtroMacroZona === "Regiones") return !e.zona_nombre || !e.zona_nombre.toLowerCase().includes("matriz");
      return true;
    })
  );

  const esJefaturaMatriz = (jefId) => {
    return empresas.some(e => e.jefatura_id === jefId && e.zona_nombre && e.zona_nombre.toLowerCase().includes("matriz"));
  };

  const jefaturasFiltradasOrdenadas = [...jefaturasFiltradas].sort((a, b) => {
    const aEsMatriz = esJefaturaMatriz(a.id);
    const bEsMatriz = esJefaturaMatriz(b.id);
    if (aEsMatriz && !bEsMatriz) return -1;
    if (!aEsMatriz && bEsMatriz) return 1;
    return a.nombre.localeCompare(b.nombre);
  });

  const optionsMacroZona = ["TODAS", "MATRIZ", "REGIONES"];
  const optionsJefaturas = [
    "TODAS",
    ...jefaturasFiltradasOrdenadas.map(j => j.nombre.toUpperCase())
  ];

  const empresasPorJefatura = empresas.filter(emp => {
    const pasaJefatura = (userRol === "jefatura" || userRol === "ejecutiva") || filtroJefatura === "" || emp.jefatura_id === Number(filtroJefatura);
    
    let pasaMacroZona = true;
    if (filtroMacroZona === "Matriz") {
      pasaMacroZona = emp.zona_nombre && emp.zona_nombre.toLowerCase().includes("matriz");
    } else if (filtroMacroZona === "Regiones") {
      pasaMacroZona = !emp.zona_nombre || !emp.zona_nombre.toLowerCase().includes("matriz");
    }

    return pasaJefatura && pasaMacroZona;
  });

  const optionsEmpresas = [
    "Todas",
    ...[...new Set(empresasPorJefatura.map(emp => emp.nombre))].sort()
  ];

  const optionsTipos = [
    "Todas",
    ...[...new Set(reuniones.map(r => r.tipo_reu).filter(Boolean))].sort()
  ];

  const filteredReuniones = reuniones.filter((r) => {
    const pasaMacroYJef = empresasPorJefatura.some(emp => emp.id === r.empresa_id);
    const pasaEmpresa = filtroEmpresa === "Todas" || r.empresa_nombre === filtroEmpresa;
    const pasaTipo = filtroTipo === "Todas" || r.tipo_reu === filtroTipo;

    return pasaMacroYJef && pasaEmpresa && pasaTipo && r.estado_envio !== "pendiente";
  });

  // 🔹 CÁLCULO DE DATOS PARA GRÁFICOS DINÁMICOS

  // 1. Gráfico de Barras: Cantidad por Tipo
  const barData = Object.entries(
    filteredReuniones.reduce((acc, r) => {
      acc[r.tipo_reu] = (acc[r.tipo_reu] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, total]) => ({ name, total }));

  // 2. Gráfico de Líneas: Evolución por Fecha y Tipo
  const timelineMap = filteredReuniones.reduce((acc, r) => {
    const date = new Date(r.fecha_reu).toISOString().split("T")[0];
    if (!acc[date]) acc[date] = {};
    acc[date][r.tipo_reu] = (acc[date][r.tipo_reu] || 0) + 1;
    return acc;
  }, {});

  const lineData = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      ...counts,
    }));

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

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Cargando dashboard profesional...
      </div>
    );

  return (
    <div
      className="encuesta-page"
      style={{ background: "#f8fafc", minHeight: "100vh" }}
    >
      <div className="container">
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
          </div>
        </div>

        {/* --- KPI CARDS (4 COLUMNAS SEGÚN MOCKUP) --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <KpiCard
            title="Total Histórico"
            value={filteredReuniones.length}
            sub="Reuniones filtradas"
            color="#4338ca" // Deep Indigo
          />
          <KpiCard
            title="Reuniones Presenciales"
            value={
              filteredReuniones.filter((r) => r.lugar === "Presencial").length
            }
            sub="Modalidad física"
            color="#0891b2" // Teal/Cyan
          />
          <KpiCard
            title="Reuniones Online"
            value={
              filteredReuniones.filter((r) => r.lugar !== "Presencial").length
            }
            sub="Modalidad remota"
            color="#9333ea" // Purple
          />
          <KpiCard
            title="Este Mes"
            value={
              filteredReuniones.filter((r) => {
                const d = new Date(r.fecha_reu);
                const now = new Date();
                return (
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear()
                );
              }).length
            }
            sub="Actividad mensual"
            color="#e11d48" // Rose/Pink
          />
        </div>

        {/* --- CHARTS (SIDE BY SIDE SEGÚN MOCKUP) --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "30px",
            marginBottom: "30px",
          }}
        >
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
              <ResponsiveContainer width="100%" height="70%">
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
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "10px",
                  marginTop: "10px",
                  fontSize: "12px",
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
                Distribución por Tipo de Reunión
              </h3>
            </div>
            <div style={{ padding: "20px", height: "350px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ left: 20, right: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="var(--bg-muted)"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-muted)",
                      fontWeight: "bold",
                    }}
                    width={100}
                  />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={25}>
                    {barData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getMeetingColor(entry.name)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.th}>
                  <th style={styles.thCell}>FECHA / ID</th>
                  <th style={styles.thCell}>EMPRESA / EJECUTIVA</th>
                  <th style={styles.thCell}>TIPO / MOTIVO</th>
                  <th style={styles.thCell}>ADJUNTOS</th>
                  <th style={styles.thCell}>ENVÍO MINUTA</th>
                  <th style={styles.thCell}>ENVÍO ENCUESTA</th>
                </tr>
              </thead>
              <tbody>
                {filteredReuniones.map((r) => {
                  const adjuntos = r.archivos_nombres
                    ? JSON.parse(r.archivos_nombres)
                    : [];
                  return (
                    <tr key={r.id_reunion} style={styles.tr}>
                      <td style={styles.tdCell}>
                        <div style={styles.companyName}>
                          {new Date(r.fecha_reu).toLocaleDateString()}
                        </div>
                        <div style={styles.meetingIdText}>{r.id_reunion}</div>
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
                          }}
                        >
                          {r.motivo_reu}
                        </div>
                      </td>
                      <td style={styles.tdCell}>
                        {adjuntos.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            {adjuntos.map((file, idx) => (
                              <a
                                key={idx}
                                href={`http://localhost:8080/uploads/${file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: "10px",
                                  color: "var(--secondary-color)",
                                  textDecoration: "none",
                                }}
                              >
                                📄 {file.split("-").slice(2).join("-") || file}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--border-input)",
                            }}
                          >
                            -
                          </span>
                        )}
                      </td>
                      <td style={styles.tdCell}>
                        <div style={{ fontSize: "11px" }}>{r.enviado_a}</div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            marginTop: "4px",
                          }}
                        >
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: "bold",
                              background:
                                r.estado_envio === "enviado"
                                  ? "#dcfce7"
                                  : "#fef9c3",
                              color:
                                r.estado_envio === "enviado"
                                  ? "#166534"
                                  : "#854d0e",
                            }}
                          >
                            {r.estado_envio?.toUpperCase()}
                          </span>
                          {r.estado_envio === "enviado" && r.created_at && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--text-light)",
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
                          )}
                        </div>
                      </td>
                      <td style={styles.tdCell}>
                        {r.programar_encuesta ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: "bold",
                                width: "fit-content",
                                background:
                                  r.encuesta_estado_envio === "enviado"
                                    ? "#dcfce7"
                                    : "#e0f2fe",
                                color:
                                  r.encuesta_estado_envio === "enviado"
                                    ? "#166534"
                                    : "#0369a1",
                              }}
                            >
                              {r.encuesta_estado_envio?.toUpperCase()}
                            </span>
                            {r.encuesta_estado_envio === "enviado" &&
                              r.encuesta_programada_para && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--text-light)",
                                  }}
                                >
                                  {new Date(
                                    r.encuesta_programada_para,
                                  ).toLocaleString("es-CL", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--border-input)",
                            }}
                          >
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
