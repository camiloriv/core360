import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
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
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  const userRol = user?.permisos;

  const [respuestas, setRespuestas] = useState([]);
  const [programadas, setProgramadas] = useState([]);
  const [jefaturas, setJefaturas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
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

  // Solo gerencia_general y admin pueden cambiar el filtro Macro-Zona
  const mostrarFiltroMacroZona = userRol === 'admin' || userRol === 'gerencia_general';
  // Solo admin, gerencia_general y gerencia pueden ver y cambiar el filtro de Jefatura
  const mostrarFiltroJefatura = userRol === 'admin' || userRol === 'gerencia_general' || userRol === 'gerencia';

  // 🔹 Fetch inicial de datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const rol = userRol;
        const id = user?.id;
        const jefaturaId = user?.jefatura_id;

        // Parámetros según rol
        let jefaturasUrl = "/jefaturas";
        let empresasUrl = "/empresas";
        let queryParams = `?usuario_id=${id}&rol=${rol}`;

        if (rol === "gerencia" && id) {
          jefaturasUrl = `/jefaturas?gerencia_id=${id}`;
          empresasUrl = `/empresas?gerencia_id=${id}`;
        } else if (rol === "jefatura" && id) {
          jefaturasUrl = `/jefaturas?jefatura_id=${id}`;
          empresasUrl = `/empresas?jefatura_id=${id}`;
        } else if (rol === "ejecutiva" && id) {
          const targetJefId = jefaturaId || id;
          jefaturasUrl = `/jefaturas?jefatura_id=${targetJefId}`;
          empresasUrl = `/empresas?jefatura_id=${targetJefId}`;
        }

        const [respRes, statsRes, kpiRes, reuniRes, jefRes, empRes] = await Promise.all([
          api.get(`/encuestas/respuestas/all${queryParams}`),
          api.get(`/encuestas/stats/summary${queryParams}`),
          api.get(`/encuestas/stats/kpis${queryParams}`),
          api.get(`/reuniones${queryParams}`),
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

        const filteredResponses = (respRes.data || []).filter(r => {
          const isDemoEmp = r.empresa?.toLowerCase().includes("demo") || 
                            r.empresa?.toLowerCase().includes("prueba") ||
                            r.jefatura?.toLowerCase().includes("prueba") ||
                            r.jefatura?.toLowerCase().includes("demo");
          return isUserDemo ? isDemoEmp : !isDemoEmp;
        });

        const filteredReuniones = (reuniRes.data || []).filter(r => {
          const isDemoEmp = r.empresa_nombre?.toLowerCase().includes("demo") || 
                            r.empresa_nombre?.toLowerCase().includes("prueba") ||
                            r.ejecutiva_nombre?.toLowerCase().includes("prueba") ||
                            r.ejecutiva_nombre?.toLowerCase().includes("demo") ||
                            r.jefatura_nombre?.toLowerCase().includes("prueba") ||
                            r.jefatura_nombre?.toLowerCase().includes("demo");
          return isUserDemo ? isDemoEmp : !isDemoEmp;
        });

        const filteredRanking = (kpiRes.data.ranking || []).filter(r => {
          const isDemoJef = r.jefatura?.toLowerCase().includes("prueba") || 
                            r.jefatura?.toLowerCase().includes("demo");
          return isUserDemo ? isDemoJef : !isDemoJef;
        });

        const filteredDetalles = (kpiRes.data.detalles || []).filter(d => {
          const isDemoEmp = d.empresa?.toLowerCase().includes("demo") || 
                            d.empresa?.toLowerCase().includes("prueba") ||
                            d.jefatura?.toLowerCase().includes("prueba") ||
                            d.jefatura?.toLowerCase().includes("demo");
          return isUserDemo ? isDemoEmp : !isDemoEmp;
        });

        const masterData = filteredResponses.map((r) => ({
          ...r,
          detalles: filteredDetalles.filter((d) => d.encuesta_id === r.id),
        }));

        setRespuestas(masterData);
        setTotalEnvios(filteredResponses.length);

        const prog = filteredReuniones.filter(
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
    ...[...new Set(respuestas.map(r => r.titulo).filter(Boolean))].sort()
  ];

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
    <div className="encuesta-page" style={{ background: '#f8fafc', minHeight: '100vh' }}>
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

        <div style={styles.kpiGrid}>
          <KpiCard
            title="Creadas"
            value={stats.creadas}
            sub="Total"
            color="var(--primary-color)"
          />
          <KpiCard
            title="Respondidas"
            value={stats.respondidas}
            sub="Completadas"
            color="var(--success-color)"
          />
          <KpiCard
            title="Pendientes"
            value={stats.pendientes}
            sub="Por responder"
            color="var(--warning-color)"
          />
          <KpiCard
            title="Activas"
            value={stats.activas}
            sub="Links hábiles"
            color="var(--secondary-color)"
          />
          <KpiCard
            title="Inactivas"
            value={stats.inactivas}
            sub="Links anulados"
            color="var(--danger-color)"
          />
        </div>

        {loading ? (
          <p>Cargando datos...</p>
        ) : (
          <>
            <div style={styles.chartsGrid}>
              <div style={styles.chartBox}>
                <h3 style={styles.sectionTitle}>
                  Desempeño por Dimensión (DB)
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
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
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartBox}>
                <h3 style={styles.sectionTitle}>Ranking NPS por Jefatura</h3>
                <ResponsiveContainer width="100%" height={320}>
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
              <div style={{ overflowX: "auto" }}>
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
                    {filteredTableData.map((r) => (
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
              <div style={{ overflowX: "auto" }}>
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
