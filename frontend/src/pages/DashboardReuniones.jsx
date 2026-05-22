import React, { useEffect, useState } from "react";
import axios from "axios";
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

const TYPE_COLORS = {
  Inducción: "var(--secondary-color)", // Azul
  "Resolver dudas": "var(--text-muted)", // Gris
  "Implementación TI": "var(--success-color)", // Verde
  "Negativos/Aportes": "#800000", // Burdeo
};

const getMeetingColor = (type) => TYPE_COLORS[type] || "var(--text-light)"; // Default gris claro

export default function DashboardReuniones() {
  const [reuniones, setReuniones] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    empresa: "Todas",
    ejecutiva: "Todas",
    jefatura: "Todas",
    tipo: "Todas",
  });
  const [options, setOptions] = useState({
    empresas: ["Todas"],
    ejecutivas: ["Todas"],
    jefaturas: ["Todas"],
    tipos: ["Todas"],
  });

  useEffect(() => {
    document.title = "CORE 360 - Minutas";
    const fetchData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("usuario") || "null");
        const queryParams = user
          ? `?usuario_id=${user.id}&rol=${user.permisos}`
          : "";

        const [reunRes, statsRes] = await Promise.all([
          axios.get(`http://localhost:8080/reuniones${queryParams}`),
          axios.get(`http://localhost:8080/reuniones/stats${queryParams}`),
        ]);

        setReuniones(reunRes.data);
        setStats(statsRes.data);

        // Extraer opciones para filtros
        const emps = [
          "Todas",
          ...new Set(reunRes.data.map((r) => r.empresa_nombre).filter(Boolean)),
        ].sort();
        const ejes = [
          "Todas",
          ...new Set(
            reunRes.data.map((r) => r.ejecutiva_nombre).filter(Boolean),
          ),
        ].sort();
        const jefs = [
          "Todas",
          ...new Set(
            reunRes.data.map((r) => r.jefatura_nombre).filter(Boolean),
          ),
        ].sort();
        const tips = [
          "Todas",
          ...new Set(reunRes.data.map((r) => r.tipo_reu).filter(Boolean)),
        ].sort();
        setOptions({
          empresas: emps,
          ejecutivas: ejes,
          jefaturas: jefs,
          tipos: tips,
        });
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔹 CÁLCULO DE OPCIONES PARA FILTROS CASCADA
  const availableEjecutivas = [
    "Todas",
    ...[
      ...new Set(
        reuniones
          .filter(
            (r) =>
              filters.jefatura === "Todas" ||
              r.jefatura_nombre === filters.jefatura,
          )
          .map((r) => r.ejecutiva_nombre)
          .filter(Boolean),
      ),
    ].sort(),
  ];

  const availableEmpresas = [
    "Todas",
    ...[
      ...new Set(
        reuniones
          .filter(
            (r) =>
              (filters.jefatura === "Todas" ||
                r.jefatura_nombre === filters.jefatura) &&
              (filters.ejecutiva === "Todas" ||
                r.ejecutiva_nombre === filters.ejecutiva),
          )
          .map((r) => r.empresa_nombre)
          .filter(Boolean),
      ),
    ].sort(),
  ];

  const availableTipos = [
    "Todas",
    ...[...new Set(reuniones.map((r) => r.tipo_reu).filter(Boolean))].sort(),
  ];
  const availableJefaturas = [
    "Todas",
    ...[
      ...new Set(reuniones.map((r) => r.jefatura_nombre).filter(Boolean)),
    ].sort(),
  ];

  const filteredReuniones = reuniones.filter((r) => {
    return (
      (filters.empresa === "Todas" || r.empresa_nombre === filters.empresa) &&
      (filters.ejecutiva === "Todas" ||
        r.ejecutiva_nombre === filters.ejecutiva) &&
      (filters.jefatura === "Todas" ||
        r.jefatura_nombre === filters.jefatura) &&
      (filters.tipo === "Todas" || r.tipo_reu === filters.tipo) &&
      r.estado_envio !== "pendiente"
    );
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
  // Agrupamos por fecha y luego por tipo
  const timelineMap = filteredReuniones.reduce((acc, r) => {
    const date = new Date(r.fecha_reu).toISOString().split("T")[0];
    if (!acc[date]) acc[date] = {};
    acc[date][r.tipo_reu] = (acc[date][r.tipo_reu] || 0) + 1;
    return acc;
  }, {});

  const allTypes = [...new Set(filteredReuniones.map((r) => r.tipo_reu))];
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

        {/* --- FILTROS PRINCIPALES (ORGANIZACIÓN MOCKUP) --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "30px",
            background: "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        >
          <div>
            <label
              style={{
                ...styles.label,
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              EMPRESA
            </label>
            <SearchableFilter
              label=""
              value={filters.empresa}
              options={availableEmpresas}
              onChange={(val) => setFilters({ ...filters, empresa: val })}
              placeholder="Seleccionar Empresa..."
            />
          </div>

          <div>
            <label
              style={{
                ...styles.label,
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              JEFATURA
            </label>
            <select
              style={{ ...styles.select, width: "100%" }}
              value={filters.jefatura}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  jefatura: e.target.value,
                  ejecutiva: "Todas",
                  empresa: "Todas",
                })
              }
            >
              {availableJefaturas.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
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
