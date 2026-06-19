import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useDashboardData } from "../hooks/useDashboardData";
import Swal from "sweetalert2";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import styles from "../styles/DashboardStyles";
import SearchableFilter from "../components/form/fields/SearchableFilter";
import KpiCard from "../components/dashboard/KpiCard";
import { exportToExcel } from "../utils/exportExcel";
import "../styles/core360-theme.css";

// =============================================================================
// 🏗️ SUBCOMPONENTES (Modularización)
// =============================================================================

const SurveyRow = ({ r, onToggleStatus, onResend, onShowDetail }) => (
  <tr style={{ ...styles.tr, opacity: r.activo === 0 ? 0.6 : 1 }}>
    <td style={styles.tdCell}>
      <strong>#{r.id}</strong>
      <div style={styles.surveyTypeBadge}>{r.titulo}</div>
      <div style={styles.meetingIdText}>REUNIÓN: {r.reunion_id || "S/I"}</div>
    </td>
    <td style={styles.tdCell}>
      <div style={styles.dateCol}>
        <div>
          <span style={styles.dateLabel}>ENVÍO:</span>{" "}
          {new Date(r.fecha_creacion).toLocaleDateString()}
        </div>
        <div>
          <span style={styles.dateLabel}>RESP:</span>{" "}
          {r.fecha_respuesta
            ? new Date(r.fecha_respuesta).toLocaleDateString()
            : "---"}
        </div>
      </div>
    </td>
    <td style={styles.tdCell}>
      <div style={styles.companyName}>{r.empresa || "N/A"}</div>
      <div style={styles.ejecutivaName}>{r.ejecutiva || "N/A"}</div>
    </td>
    <td style={styles.tdCell}>
      <div style={{ marginTop: "5px" }}>
        <span
          style={{
            ...styles.statusBadge,
            background:
              r.activo === 0
                ? "#fee2e2"
                : r.estado === "completada"
                  ? "#dcfce7"
                  : "#fef9c3",
            color:
              r.activo === 0
                ? "#991b1b"
                : r.estado === "completada"
                  ? "#166534"
                  : "#854d0e",
          }}
        >
          {r.activo === 0 ? "INACTIVA" : r.estado.toUpperCase()}
        </span>
      </div>
    </td>
    <td style={styles.tdCell}>
      <div style={styles.actionsCol}>
        {r.detalles?.length > 0 ? (
          <button onClick={() => onShowDetail(r)} style={styles.btnSecondary}>
            Ver Respuestas ({r.detalles.length})
          </button>
        ) : (
          <div style={styles.respuestasBox}>
            <div style={{ textAlign: "center" }}>
              <span style={styles.noRespText}>
                Sin respuestas aún -{" "}
                <strong>{r.enviado_a || "Sin correo registrado"}</strong>
              </span>
            </div>
          </div>
        )}

        {r.estado === "pendiente" && (
          <div style={styles.pendingActions}>
            <button
              onClick={() => onToggleStatus(r.id, r.activo)}
              style={{
                ...styles.btnAction,
                background: r.activo === 1 ? "#fee2e2" : "#dcfce7",
                color: r.activo === 1 ? "#991b1b" : "#166534",
              }}
            >
              {r.activo === 1 ? "🚫 Anular" : "✅ Activar"}
            </button>
            <button
              onClick={() => onResend(r)}
              style={{
                ...styles.btnAction,
                background: "#dbeafe",
                color: "var(--primary-color)",
              }}
            >
              🔄 Reenviar
            </button>
          </div>
        )}
      </div>
    </td>
  </tr>
);

// =============================================================================
// 🚀 COMPONENTE PRINCIPAL (Dashboard)
// =============================================================================

export default function DashboardEncuestas() {
  const { user, jefaturas, empresas, reuniones, loading: dataLoading } = useDashboardData();
  const userRol = user?.permisos;

  const [respuestas, setRespuestas] = useState([]);
  const [programadas, setProgramadas] = useState([]);
  const [totalEnvios, setTotalEnvios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dimensionData, setDimensionData] = useState([]);
  const [rankingData, setRankingData] = useState([]);
  const navigate = useNavigate();

  const [filtroMacroZona, setFiltroMacroZona] = useState("Todas");
  const [filtroJefatura, setFiltroJefatura] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");
  const [filtroTipo, setFiltroTipo] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState("Todas");

  const [optionsEstados] = useState(["Todas", "Pendientes", "Respondidas", "Activas", "Inactivas"]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Solo gerencia_general y admin pueden cambiar el filtro Macro-Zona
  const mostrarFiltroMacroZona = userRol === 'admin' || userRol === 'gerencia_general';
  // Solo admin, gerencia_general y gerencia pueden ver y cambiar el filtro de Jefatura
  const mostrarFiltroJefatura = userRol === 'admin' || userRol === 'gerencia_general' || userRol === 'gerencia';

  // 🔹 Fetch inicial de datos específicos de encuestas
  useEffect(() => {
    if (dataLoading || !user) return;

    const fetchData = async () => {
      try {
        const rol = userRol;
        const id = user?.id;
        const queryParams = `?usuario_id=${id}&rol=${rol}`;

        const [respRes, statsRes, kpiRes] = await Promise.all([
          api.get(`/encuestas/respuestas/all${queryParams}`),
          api.get(`/encuestas/resumen/general${queryParams}`),
          api.get(`/encuestas/resumen/kpis${queryParams}`)
        ]);

        const filteredResponses = respRes.data || [];

        const filteredRanking = kpiRes.data.ranking || [];

        const filteredDetalles = kpiRes.data.detalles || [];

        const masterData = filteredResponses.map((r) => ({
          ...r,
          detalles: filteredDetalles.filter((d) => d.encuesta_id === r.id),
        }));

        setRespuestas(masterData);
        setTotalEnvios(filteredResponses.length);

        const prog = reuniones.filter(
          (r) =>
            r.programar_encuesta && r.encuesta_estado_envio === "pendiente",
        );
        setProgramadas(prog);

        const radar = (kpiRes.data.dimensiones || []).map((dimObj) => {
          const dimName = dimObj.nombre;
          const found = kpiRes.data.promedios.find(
            (p) => p.dimension === dimName,
          );
          return {
            subject: dimName,
            A: found ? parseFloat(found.promedio) : 0,
            fullMark: 10,
          };
        });
        setDimensionData(radar);

        setRankingData(
          filteredRanking.map((r) => ({
            name: r.jefatura,
            nps: Math.round(r.promedio * 20),
          })),
        );

      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dataLoading, user?.id, userRol, reuniones]);

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
    ...[...new Set(respuestas.map(r => r.titulo).filter(Boolean))].sort()
  ], [respuestas]);

  // 🔹 MEMOIZACIÓN: Filtrado y Estadísticas
  const { filteredTableData, stats } = useMemo(() => {
    // 1. Filtro base
    const baseFiltered = respuestas.filter((r) => {
      const pasaMacroYJef = empresasPorJefatura.some(emp => emp.id === r.empresa_id);
      const pasaEmpresa = filtroEmpresa === "Todas" || r.empresa === filtroEmpresa;
      const pasaTipo = filtroTipo === "Todas" || r.titulo === filtroTipo;

      return pasaMacroYJef && pasaEmpresa && pasaTipo;
    });

    // 2. Stats sobre base
    const creadas = baseFiltered.length;
    const respondidas = baseFiltered.filter(
      (r) => r.estado === "completada",
    ).length;
    const pendientes = baseFiltered.filter(
      (r) => r.estado === "pendiente" && r.activo === 1,
    ).length;
    const activas = baseFiltered.filter((r) => r.activo === 1).length;
    const inactivas = baseFiltered.filter((r) => r.activo === 0).length;

    let sumaValores = 0,
      countValores = 0;
    baseFiltered.forEach((f) =>
      f.detalles?.forEach((d) => {
        if (d.valor_numerico) {
          sumaValores += parseFloat(d.valor_numerico);
          countValores++;
        }
      }),
    );

    // 3. Filtro visual para la tabla
    const visualFiltered = baseFiltered.filter((r) => {
      if (filtroEstado === "Todas") return true;
      if (filtroEstado === "Pendientes")
        return r.estado === "pendiente" && r.activo === 1;
      if (filtroEstado === "Respondidas") return r.estado === "completada";
      if (filtroEstado === "Activas") return r.activo === 1;
      if (filtroEstado === "Inactivas") return r.activo === 0;
      return true;
    });

    return {
      filteredTableData: visualFiltered,
      stats: {
        creadas,
        respondidas,
        pendientes,
        activas,
        inactivas,
        promedio:
          countValores > 0 ? (sumaValores / countValores).toFixed(1) : 0,
      },
    };
  }, [respuestas, filtroMacroZona, filtroJefatura, filtroEmpresa, filtroTipo, filtroEstado, empresasPorJefatura]);

  const filteredProgramadas = programadas.filter((p) => {
    const pasaMacroYJef = empresasPorJefatura.some(emp => emp.id === p.empresa_id);
    const pasaEmpresa = filtroEmpresa === "Todas" || p.empresa_nombre === filtroEmpresa;
    return pasaMacroYJef && pasaEmpresa;
  });

  // 🔹 Reset Paginación
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroMacroZona, filtroJefatura, filtroEmpresa, filtroTipo, filtroEstado]);

  // 🔹 Cálculos Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = filteredTableData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // 🔹 Handlers
  const toggleActivo = async (id, currentStatus) => {
    try {
      await api.patch("/encuestas/toggle-estado", {
        id,
        activo: !currentStatus,
      });
      setRespuestas((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, activo: !currentStatus ? 1 : 0 } : r,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleReenviar = async (encuesta) => {
    const url = `${window.location.origin}/encuesta/${encuesta.token}`;
    const { value: result } = await Swal.fire({
      title: "Gestión de Envío",
      html: `
        <div style="text-align: left; font-size: 14px;">
          <label style="${styles.swalLabel}">Link de la encuesta:</label>
          <div style="display: flex; gap: 8px; margin-bottom: 20px;">
            <input id="swal-link" class="swal2-input" style="margin: 0; flex: 1; font-size: 12px;" value="${url}" readonly>
            <button id="swal-copy-btn" class="swal2-confirm swal2-styled" style="margin: 0; padding: 8px 15px; background: #3b82f6;">Copiar</button>
          </div>
          <label style="${styles.swalLabel}">Correo del destinatario:</label>
          <input id="swal-email" class="swal2-input" style="margin: 0; width: 100%;" type="email" value="${encuesta.enviado_a || ""}" placeholder="correo@empresa.com">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Enviar Correo",
      cancelButtonText: "Cerrar",
      didOpen: () => {
        const btn = document.getElementById("swal-copy-btn");
        btn.onclick = () => {
          const input = document.getElementById("swal-link");
          input.select();
          document.execCommand("copy");
          btn.innerText = "¡Copiado!";
          btn.style.background = "var(--success-color)";
          setTimeout(() => {
            btn.innerText = "Copiar";
            btn.style.background = "var(--secondary-color)";
          }, 2000);
        };
      },
      preConfirm: () => {
        const email = document.getElementById("swal-email").value;
        if (!email) {
          Swal.showValidationMessage("Email requerido");
          return false;
        }
        return email;
      },
    });

    if (result) {
      try {
        await api.post("/encuestas/enviar-correo", {
          email: result,
          url,
          encuesta_id: encuesta.id,
        });
        Swal.fire("¡Enviado!", "Correo enviado correctamente.", "success");
        setRespuestas((prev) =>
          prev.map((r) =>
            r.id === encuesta.id ? { ...r, enviado_a: result } : r,
          ),
        );
      } catch (err) {
        Swal.fire("Error", "No se pudo enviar.", "error");
      }
    }
  };

  const showRespuestasModal = (encuesta) => {
    const html = encuesta.detalles
      .map(
        (d) => `
      <div style="text-align: left; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
        <div style="font-weight: bold; color: #475569; font-size: 11px; line-height: 1.4;">${d.pregunta}</div>
        <div style="color: #1e3a8a; font-weight: bold; font-size: 13px; margin-top: 4px;">R: ${d.valor_texto || d.valor_numerico}</div>
      </div>
    `,
      )
      .join("");

    Swal.fire({
      title: `<span style="font-size: 18px;">Respuestas - ${encuesta.empresa || "S/E"}</span>`,
      html: `<div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">${html}</div>`,
      confirmButtonText: "Cerrar",
      confirmButtonColor: "var(--secondary-color)",
      width: "500px",
    });
  };

  const handleExport = () => {
    const dataToExport = filteredTableData.map((r) => ({
      ID_Encuesta: r.id,
      ID_Reunion: r.reunion_id || "S/I",
      Tipo_Encuesta: r.titulo,
      Empresa: r.empresa,
      Ejecutiva: r.ejecutiva,
      Jefatura: r.jefatura,
      Estado:
        r.activo === 0
          ? "Inactiva"
          : r.estado === "completada"
            ? "Completada"
            : "Pendiente",
      Enviado_a: r.enviado_a,
      Fecha_Envio: new Date(r.fecha_creacion),
      Fecha_Respuesta: r.fecha_respuesta ? new Date(r.fecha_respuesta) : null,
    }));
    exportToExcel(
      dataToExport,
      `Encuestas_Core360_${new Date().toISOString().split("T")[0]}`,
    );
  };

  return (
    <div className="encuesta-page" style={{ background: 'var(--bg-body)', minHeight: '100vh' }}>
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
            Dashboard Encuestas
          </h1>
          <p className="page-subtitle">ANÁLISIS DE DATOS OBTENIDOS</p>
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
              <div style={{ minWidth: "180px", flex: "1 1 180px" }}>
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
              <div style={{ minWidth: "180px", flex: "1 1 180px" }}>
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
            <div style={{ minWidth: "180px", flex: "1 1 180px" }}>
              <SearchableFilter 
                label="Buscar Empresa"
                value={filtroEmpresa}
                options={optionsEmpresas}
                onChange={(val) => setFiltroEmpresa(val)}
                placeholder="Escribe para buscar..."
              />
            </div>

            {/* Tipo de Encuesta */}
            <div style={{ minWidth: "180px", flex: "1 1 180px" }}>
              <SearchableFilter 
                label="Tipo de Encuesta"
                value={filtroTipo}
                options={optionsTipos}
                onChange={(val) => setFiltroTipo(val)}
                placeholder="Escribe para buscar..."
              />
            </div>

            {/* Estado */}
            <div style={{ minWidth: "180px", flex: "1 1 180px" }}>
              <SearchableFilter 
                label="Estado"
                value={filtroEstado}
                options={optionsEstados}
                onChange={(val) => setFiltroEstado(val)}
                placeholder="Escribe para buscar..."
              />
            </div>
          </div>
        </div>

        <div className="kpi-grid-container" style={styles.kpiGrid}>
          <KpiCard
            title="Total Creadas"
            value={stats.creadas}
            sub="Encuestas emitidas"
            color="#4338ca"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
          />
          <KpiCard
            title="Respondidas"
            value={stats.respondidas}
            sub="Tasa de respuesta"
            color="#10b981"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            trend={`${stats.creadas > 0 ? Math.round((stats.respondidas / stats.creadas) * 100) : 0}%`}
          />
          <KpiCard
            title="Pendientes"
            value={stats.pendientes}
            sub="Esperando respuesta"
            color="#f59e0b"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          />
          <KpiCard
            title="Activas"
            value={stats.activas}
            sub="En proceso / Abiertas"
            color="#0ea5e9"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>}
          />
          <KpiCard
            title="Inactivas"
            value={stats.inactivas}
            sub="Links anulados"
            color="#ef4444"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>}
          />
        </div>

        {loading ? (
          <p>Cargando datos...</p>
        ) : (
          <>
            <div style={styles.chartsGrid}>
              <div style={{ ...styles.chartBox, overflow: "hidden" }}>
                <h3 style={styles.sectionTitle}>
                  Desempeño por Dimensión (DB)
                </h3>
                <ResponsiveContainer width="99%" height={320} minWidth={1} minHeight={1}>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="65%"
                    data={dimensionData}
                  >
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{
                        fill: "var(--text-muted)",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                    />
                    <Radar
                      name="Promedio"
                      dataKey="A"
                      stroke="var(--secondary-color)"
                      fill="var(--secondary-color)"
                      fillOpacity={0.4}
                      isAnimationActive={false}
                    />
                    <Tooltip isAnimationActive={false} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ ...styles.chartBox, overflow: "hidden" }}>
                <h3 style={styles.sectionTitle}>Ranking NPS por Jefatura</h3>
                <ResponsiveContainer width="99%" height={320} minWidth={1} minHeight={1}>
                  <BarChart
                    data={rankingData}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                      stroke="var(--bg-muted)"
                    />
                    <XAxis type="number" domain={[-100, 100]} hide />
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
                      width={90}
                    />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="nps" radius={[0, 4, 4, 0]} barSize={20}>
                      {rankingData.map((e, i) => (
                        <Cell
                          key={i}
                          fill={
                            e.nps > 50
                              ? "var(--success-color)"
                              : e.nps > 0
                                ? "var(--secondary-color)"
                                : "var(--danger-color)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.tableCard}>
              <div
                style={{
                  ...styles.tableHeader,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "var(--text-main)",
                    textTransform: "uppercase",
                  }}
                >
                  Detalle de Respuestas con Preguntas Reales
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
                      <th style={styles.thCell}>ID / Tipo</th>
                      <th style={styles.thCell}>Fechas (Envío / Resp)</th>
                      <th style={styles.thCell}>Empresa / Ejecutiva</th>
                      <th style={styles.thCell}>Estado</th>
                      <th style={styles.thCell}>Respuestas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTableData.map((r) => (
                      <SurveyRow
                        key={r.id}
                        r={r}
                        onToggleStatus={toggleActivo}
                        onResend={handleReenviar}
                        onShowDetail={showRespuestasModal}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredTableData.length)} de {filteredTableData.length} registros
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
            <div
              style={{
                ...styles.tableCard,
                marginTop: "40px",
                border: "1px solid #bae6fd",
                background: "#f0f9ff",
              }}
            >
              <div style={{ ...styles.tableHeader, background: "#e0f2fe" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#0369a1",
                    textTransform: "uppercase",
                  }}
                >
                  📅 Encuestas Programadas (Pendientes de Envío)
                </h3>
              </div>
              <div className="table-responsive">
                {filteredProgramadas.length > 0 ? (
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.th}>
                        <th style={styles.thCell}>REUNIÓN / TIPO</th>
                        <th style={styles.thCell}>EMPRESA / EJECUTIVA</th>
                        <th style={styles.thCell}>PROGRAMADO PARA</th>
                        <th style={styles.thCell}>ESTADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProgramadas.map((p) => (
                        <tr key={p.id} style={styles.tr}>
                          <td style={styles.tdCell}>
                            <div style={{ fontWeight: "bold" }}>
                              {p.id_reunion}
                            </div>
                            <div style={{ fontSize: "11px", color: "#0369a1" }}>
                              {p.encuesta_tipo}
                            </div>
                          </td>
                          <td style={styles.tdCell}>
                            <div style={styles.companyName}>
                              {p.empresa_nombre}
                            </div>
                            <div style={styles.ejecutivaName}>
                              {p.ejecutiva_nombre}
                            </div>
                          </td>
                          <td style={styles.tdCell}>
                            <div
                              style={{
                                fontWeight: "bold",
                                color: "var(--primary-color)",
                              }}
                            >
                              {new Date(
                                p.encuesta_programada_para,
                              ).toLocaleString()}
                            </div>
                          </td>
                          <td style={styles.tdCell}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "10px",
                                fontWeight: "bold",
                                background: "#e0f2fe",
                                color: "#0369a1",
                                border: "1px solid #7dd3fc",
                              }}
                            >
                              RELOJ DE ARENA / PENDIENTE
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    No hay encuestas programadas para el futuro.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
