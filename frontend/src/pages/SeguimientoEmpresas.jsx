import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import { useDashboardData } from "../hooks/useDashboardData";
// DashboardStyles imported via core360-theme.css
import SearchableFilter from "../components/form/fields/SearchableFilter";
import Swal from "sweetalert2";
import "../styles/core360-theme.css";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
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
  const opts = [{ value: `anio-${y}`, label: `Año ${y}` }];
  for (let i = 0; i < 12; i++) {
    const m = String(i + 1).padStart(2, "0");
    opts.push({ value: `${y}-${m}`, label: MESES[i] });
  }
  return opts;
}

export default function SeguimientoEmpresas() {
  const { user, jefaturas, empresas, reuniones, loading: dataLoading } = useDashboardData();
  const userRol = user?.permisos;

  const [seguimientoLogs, setSeguimientoLogs] = useState([]);
  const [filtroJefatura, setFiltroJefatura] = useState(() => {
    // Initialize based on role to avoid setState in useEffect
    return "";
  });
  const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");
  const [filtroMacroZona, setFiltroMacroZona] = useState("Todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState(getPeriodoActual());
  const [viewMode, setViewMode] = useState("split");
  const [loading, setLoading] = useState(true);
  
  const periodoOptions = useMemo(() => buildPeriodoOptions(), []);

  // Solo gerencia_general y admin pueden cambiar el filtro Macro-Zona
  const mostrarFiltroMacroZona = userRol === "admin" || userRol === "gerencia_general";
  // Solo admin, gerencia_general y gerencia pueden ver y cambiar el filtro de Jefatura
  const mostrarFiltroJefatura = userRol === "admin" || userRol === "gerencia_general" || userRol === "gerencia";

  useEffect(() => {
    if (!dataLoading && user) {
      // Use functional update to avoid cascading render warnings
      const jefId = userRol === "jefatura" && user.id
        ? user.id.toString()
        : userRol === "ejecutiva" && (user.jefatura_id || user.id)
          ? (user.jefatura_id || user.id).toString()
          : null;
      if (jefId !== null) {
        setFiltroJefatura(jefId);
      }
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading]);

  // Load seguimiento logs when period filter changes
  const cargarLogs = useCallback(async () => {
    try {
      const isAnio = filtroPeriodo.startsWith("anio-");
      let url;
      if (isAnio) {
        url = `/empresas/seguimiento-logs?anio=${filtroPeriodo.replace("anio-", "")}`;
      } else {
        url = `/empresas/seguimiento-logs?periodo=${filtroPeriodo}`;
      }
      const res = await api.get(url);
      setSeguimientoLogs(res.data || []);
    } catch (err) {
      console.error("Error cargando logs de seguimiento:", err);
    }
  }, [filtroPeriodo]);

  useEffect(() => {
    if (!loading) {
      cargarLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPeriodo, loading]);

  const getReunionesDelPeriodo = useCallback((empresaId) => {
    return (reuniones || []).filter((r) => {
      if (r.empresa_id !== empresaId) return false;
      if (!r.fecha_reu) return false;
      
      const d = new Date(r.fecha_reu);
      const rYear = d.getFullYear();
      const rMonth = String(d.getMonth() + 1).padStart(2, "0");
      
      if (filtroPeriodo.startsWith("anio-")) {
        const anioSeleccionado = Number(filtroPeriodo.replace("anio-", ""));
        return rYear === anioSeleccionado;
      } else {
        const [fYear, fMonth] = filtroPeriodo.split("-");
        return rYear === Number(fYear) && rMonth === fMonth;
      }
    });
  }, [reuniones, filtroPeriodo]);

  // Temporal state resolution: determines the state of an empresa based on the filtered period logs and actual meetings
  const getEstadoTemporal = useCallback((empresaId) => {
    const meetings = getReunionesDelPeriodo(empresaId);
    
    // Si hay reuniones en el periodo de tipo borrador o enviado, la empresa ha sido gestionada en este periodo
    const hasRealized = meetings.some(r => r.estado_envio === 'enviado' || r.estado_envio === 'borrador');
    if (hasRealized) return "gestionada";

    const hasAgendadaMeeting = meetings.some(r => r.estado_envio === 'agendada');

    const logs = seguimientoLogs.filter((l) => l.empresa_id === empresaId);
    if (logs.some((l) => l.estado === "gestionada")) return "gestionada";
    if (hasAgendadaMeeting || logs.some((l) => l.estado === "agendada")) return "agendada";
    if (logs.some((l) => l.estado === "solicitada")) return "solicitada";
    return "pendiente";
  }, [getReunionesDelPeriodo, seguimientoLogs]);

  const getLogsSolicitada = (empresaId) => {
    return seguimientoLogs.filter(
      (l) => l.empresa_id === empresaId && l.estado === "solicitada",
    );
  };

  // getReunionInfo removed (unused)

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "";
    const matches = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matches) {
      return `${matches[3]}/${matches[2]}/${matches[1]}`;
    }
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return "";
      const formatter = new Intl.DateTimeFormat("es-CL", {
        timeZone: "America/Santiago",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return formatter.format(d).replace(/-/g, "/");
    } catch {
      return "";
    }
  };

  const empresasPorJefatura = useMemo(() => {
    return empresas.filter((emp) => {
      const pasaJefatura =
        userRol === "jefatura" ||
        userRol === "ejecutiva" ||
        filtroJefatura === "" ||
        emp.jefatura_id === Number(filtroJefatura);

      let pasaMacroZona = true;
      if (filtroMacroZona === "Matriz") {
        pasaMacroZona =
          emp.zona_nombre && emp.zona_nombre.toLowerCase().includes("matriz");
      } else if (filtroMacroZona === "Regiones") {
        pasaMacroZona =
          !emp.zona_nombre || !emp.zona_nombre.toLowerCase().includes("matriz");
      }

      return pasaJefatura && pasaMacroZona;
    });
  }, [empresas, userRol, filtroJefatura, filtroMacroZona]);

  const empresasFiltradas = useMemo(() => {
    return empresasPorJefatura
      .filter((emp) => filtroEmpresa === "Todas" || emp.nombre === filtroEmpresa)
      .sort((a, b) => {
        const estadoA = getEstadoTemporal(a.id);
        const estadoB = getEstadoTemporal(b.id);

        // Prioridad: 1. gestionada, 2. agendada, 3. solicitada, 4. pendiente
        const prioMap = {
          gestionada: 1,
          agendada: 2,
          solicitada: 3,
          pendiente: 4,
        };
        const prioA = prioMap[estadoA] || 4;
        const prioB = prioMap[estadoB] || 4;

        if (prioA !== prioB) return prioA - prioB;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [empresasPorJefatura, filtroEmpresa, getEstadoTemporal]);

  const optionsEmpresas = useMemo(() => [
    "Todas",
    ...[...new Set(empresas.map((emp) => emp.nombre))].sort(),
  ], [empresas]);

  const handleEmpresaFilterChange = (val) => {
    if (val === "Todas" || !val) {
      setFiltroEmpresa("Todas");
      setFiltroJefatura("");
      setFiltroMacroZona("Todas");
    } else {
      const emp = empresas.find((e) => e.nombre === val);
      if (emp) {
        // Set the macro-zona of the selected company
        const esMatriz =
          emp.zona_nombre && emp.zona_nombre.toLowerCase().includes("matriz");
        setFiltroMacroZona(esMatriz ? "Matriz" : "Regiones");

        // Set the jefatura of the selected company
        setFiltroJefatura(emp.jefatura_id ? emp.jefatura_id.toString() : "");

        setFiltroEmpresa(val);
      } else {
        setFiltroEmpresa("Todas");
      }
    }
  };

  const handleEstadoClick = async (emp) => {
    // 1. Obtener historial de seguimiento del backend (logs de agendamiento/solicitud)
    let logs = [];
    try {
      const hRes = await api.get(`/empresas/${emp.id}/historial`);
      logs = hRes.data || [];
    } catch (e) {
      console.error("Error obteniendo historial:", e);
    }

    // 2. Obtener reuniones asociadas a esta empresa desde el dashboard
    const companyMeetings = (reuniones || []).filter((r) => r.empresa_id === emp.id);

    // 3. Consolidar la línea de tiempo histórica
    const timeline = [];

    // Agregar reuniones de la tabla reuniones (realizadas, con o sin minuta, y agendadas)
    companyMeetings.forEach((r) => {
      let tipoText = "Realizada (Con Minuta)";
      let estadoVal = "gestionada";
      if (r.estado_envio === "borrador") {
        tipoText = "Realizada (Sin Minuta)";
        estadoVal = "borrador";
      } else if (r.estado_envio === "agendada") {
        tipoText = "Agendada (Teams)";
        estadoVal = "agendada";
      }

      timeline.push({
        key: `meeting-${r.id_reunion || r.id}`,
        fecha: r.fecha_reu,
        hora: r.hora || "",
        tipo: tipoText,
        detalle: r.motivo_reu || "Reunión comercial",
        responsable: r.ejecutiva_nombre || "",
        estado: estadoVal,
      });
    });

    // Agregar logs de agendamiento y solicitudes (filtrando gestionadas y agendadas duplicadas)
    logs.forEach((log) => {
      if (log.estado === "gestionada") return; // ya representada por las reuniones con minuta

      // Si ya hay un item en timeline con el mismo event_id (reunion_id), evitar duplicar!
      if (log.estado === "agendada" && log.reunion_id) {
        const existeEnTimeline = companyMeetings.some(r => r.event_id === log.reunion_id || r.id_reunion === log.reunion_id);
        if (existeEnTimeline) return;
      }

      let tipoText = "Solicitud de Reunión";
      let detalleText = "Contacto iniciado / Solicitada";
      if (log.estado === "agendada") {
         tipoText = "Agendada (Teams)";
         detalleText = log.asunto || "Reunión agendada en Teams";
      } else if (log.estado === "cancelada") {
         tipoText = "Cancelada (Teams)";
         detalleText = log.asunto || "Reunión cancelada en Teams";
      } else if (log.estado === "reagendada") {
         tipoText = "Reagendada (Teams)";
         detalleText = log.asunto || "Reunión reagendada en Teams";
      }

      timeline.push({
        key: `log-${log.id}`,
        fecha: log.fecha,
        hora: "",
        tipo: tipoText,
        detalle: detalleText,
        responsable: log.usuario_nombre || "",
        estado: log.estado,
      });
    });

    // Ordenar de más reciente a más antigua
    timeline.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const colorMap = {
      gestionada: "#10b981", // verde
      borrador: "#ca8a04",   // amarillo
      agendada: "#3b82f6",   // azul
      reagendada: "#6366f1", // indigo
      solicitada: "#f97316", // naranja
      cancelada: "#ef4444",  // rojo
    };

    const bgBadgeMap = {
      gestionada: "#dcfce7",
      borrador: "#fef08a",
      agendada: "#dbeafe",
      reagendada: "#e0e7ff",
      solicitada: "#ffedd5",
      cancelada: "#fee2e2",
    };

    const textBadgeMap = {
      gestionada: "#166534",
      borrador: "#854d0e",
      agendada: "#1e40af",
      reagendada: "#3730a3",
      solicitada: "#c2410c",
      cancelada: "#991b1b",
    };

    const meetingsHtml = timeline.length > 0 
      ? `
        <div style="margin-top: 25px; text-align: left;">
          <h4 style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
            📋 Historial de Reuniones y Eventos (${timeline.length})
          </h4>
          <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10;">
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Fecha</th>
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Tipo / Estado</th>
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Motivo / Detalle</th>
                  <th style="padding: 10px; color: #64748b; font-weight: 600;">Responsable</th>
                </tr>
              </thead>
              <tbody>
                ${timeline.map(item => {
                  const dateStr = formatearFecha(item.fecha);
                  const bulletColor = colorMap[item.estado] || "#64748b";
                  const bgBadge = bgBadgeMap[item.estado] || "#f1f5f9";
                  const textBadge = textBadgeMap[item.estado] || "#475569";
                  const respText = item.responsable ? `👤 ${item.responsable}` : "-";

                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px; font-weight: 500; color: #334155; white-space: nowrap;">📅 ${dateStr}</td>
                      <td style="padding: 10px; white-space: nowrap;">
                        <span style="display: inline-flex; align-items: center; gap: 6px; background: ${bgBadge}; color: ${textBadge}; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${bulletColor}; flex-shrink: 0;"></span>
                          ${item.tipo}
                        </span>
                      </td>
                      <td style="padding: 10px; color: #475569; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.detalle}">${item.detalle}</td>
                      <td style="padding: 10px; color: #475569; white-space: nowrap;">${respText}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
      : `
        <div style="margin-top: 25px; text-align: center; padding: 30px; border: 1.5px dashed #e2e8f0; border-radius: 12px; background: #f8fafc;">
          <div style="font-size: 30px; margin-bottom: 10px;">📅</div>
          <h4 style="margin: 0 0 5px 0; color: #475569; font-size: 14px; font-weight: 600;">Sin Eventos</h4>
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">No se registran visitas, solicitudes ni reuniones comerciales.</p>
        </div>
      `;

    const initial = emp.nombre.charAt(0).toUpperCase();
    const gradients = [
      "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      "linear-gradient(135deg, #10b981 0%, #047857 100%)",
      "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    ];
    const gradient = gradients[emp.id % gradients.length];

    const carnetHtml = `
      <div style="background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-bottom: 15px;">
        <div style="background: ${gradient}; padding: 25px 20px; color: white; display: flex; align-items: center; gap: 20px; text-align: left; position: relative;">
          <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); border: 2.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0;">
            ${initial}
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.8); display: block; margin-bottom: 2px;">
              Ficha de Empresa
            </span>
            <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: white; line-height: 1.2;">
              ${emp.nombre}
            </h3>
          </div>
        </div>
        
        <div style="padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; background: #fafafa;">
          <div>
            <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px;">Macro-Zona</span>
            <span style="font-size: 13px; font-weight: 700; color: #334155; display: inline-flex; align-items: center; gap: 6px;">
              🏢 ${emp.zona_nombre || 'Sin Zona'}
            </span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px;">Jefatura Asignada</span>
            <span style="font-size: 13px; font-weight: 700; color: #334155; display: inline-flex; align-items: center; gap: 6px;">
              👤 ${emp.jefatura_nombre || 'Sin Jefatura'}
            </span>
          </div>
        </div>
      </div>
    `;

    Swal.fire({
      html: `
        ${carnetHtml}
        ${meetingsHtml}
      `,
      showConfirmButton: true,
      confirmButtonText: "Cerrar",
      confirmButtonColor: "#3b82f6",
      width: "650px",
    });
  };

  const totalEmpresas = empresasFiltradas.length;
  const totalGestionadas = empresasFiltradas.filter(
    (emp) => getEstadoTemporal(emp.id) === "gestionada",
  ).length;
  const porcentajeAvance =
    totalEmpresas > 0
      ? Math.round((totalGestionadas / totalEmpresas) * 100)
      : 0;

  // Jefaturas que tienen al menos una empresa en la macro-zona seleccionada
  const jefaturasFiltradas = jefaturas.filter((j) =>
    empresas.some((e) => {
      if (e.jefatura_id !== j.id) return false;
      if (filtroMacroZona === "Matriz")
        return e.zona_nombre && e.zona_nombre.toLowerCase().includes("matriz");
      if (filtroMacroZona === "Regiones")
        return (
          !e.zona_nombre || !e.zona_nombre.toLowerCase().includes("matriz")
        );
      return true;
    }),
  );

  // Clasificador de Jefatura Matriz o Región
  const esJefaturaMatriz = (jefId) => {
    return empresas.some(
      (e) =>
        e.jefatura_id === jefId &&
        e.zona_nombre &&
        e.zona_nombre.toLowerCase().includes("matriz"),
    );
  };

  // Ordenar jefaturas filtradas: primero Matriz, luego Regiones. Dentro de cada grupo, alfabéticamente.
  const jefaturasFiltradasOrdenadas = [...jefaturasFiltradas].sort((a, b) => {
    const aEsMatriz = esJefaturaMatriz(a.id);
    const bEsMatriz = esJefaturaMatriz(b.id);

    if (aEsMatriz && !bEsMatriz) return -1;
    if (!aEsMatriz && bEsMatriz) return 1;

    return a.nombre.localeCompare(b.nombre);
  });

  // Ordenar lista general de jefaturas: primero Matriz, luego Regiones. Dentro de cada grupo, alfabéticamente.
  const jefaturasGeneralOrdenadas = [...jefaturas].sort((a, b) => {
    const aEsMatriz = esJefaturaMatriz(a.id);
    const bEsMatriz = esJefaturaMatriz(b.id);

    if (aEsMatriz && !bEsMatriz) return -1;
    if (!aEsMatriz && bEsMatriz) return 1;

    return a.nombre.localeCompare(b.nombre);
  });

  const optionsMacroZona = ["TODAS", "MATRIZ", "REGIONES"];
  const selectedMacroValue = (filtroMacroZona || "Todas").toUpperCase();

  const handleMacroZonaChange = (val) => {
    let target = "Todas";
    if (val === "MATRIZ") target = "Matriz";
    else if (val === "REGIONES") target = "Regiones";

    setFiltroMacroZona(target);
    setFiltroJefatura("");
    setFiltroEmpresa("Todas");
  };

  const optionsJefaturas = [
    "TODAS",
    ...jefaturasFiltradasOrdenadas.map((j) => j.nombre.toUpperCase()),
  ];

  const selectedJefValue = filtroJefatura
    ? jefaturas
        .find((j) => j.id.toString() === filtroJefatura)
        ?.nombre?.toUpperCase() || "TODAS"
    : "TODAS";

  const handleJefaturaChange = (val) => {
    if (val === "TODAS" || !val) {
      setFiltroJefatura("");
    } else {
      const found = jefaturas.find(
        (j) => j.nombre.toUpperCase() === val.toUpperCase(),
      );
      if (found) {
        setFiltroJefatura(found.id.toString());
      } else {
        setFiltroJefatura("");
      }
    }
    setFiltroEmpresa("Todas");
  };

  if (loading)
    return <div style={{ padding: 40 }}>Cargando seguimiento...</div>;

  return (
    <div
      className="encuesta-page"
      style={{ background: "var(--bg-body)", minHeight: "100vh" }}
    >
      <div className="container" style={{ padding: "30px 20px" }}>
        {/* Unified Page Header */}
        <header className="page-header">
          <div className="page-title-area" style={{ marginBottom: "30px" }}>
            <h1
              className="page-title"
              style={{
                borderBottom: "2px solid var(--secondary-color)",
                paddingBottom: "8px",
                display: "inline-block",
                marginBottom: "8px",
              }}
            >
              Seguimiento de Cobertura
            </h1>
            <p className="page-subtitle">
              ESTADO DE REUNIONES POR EMPRESA Y JEFATURA
            </p>
          </div>

          {/* Avance de Cobertura en la Cabecera */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              minWidth: "260px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "bold",
                color: "var(--text-light)",
                textTransform: "uppercase",
                marginBottom: "6px",
                letterSpacing: "1px",
              }}
            >
              Avance de Cobertura
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "var(--secondary-color)",
                  lineHeight: 1,
                }}
              >
                {porcentajeAvance}%
              </div>
              <div
                style={{
                  width: "150px",
                  height: "8px",
                  background: "var(--bg-muted)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${porcentajeAvance}%`,
                    height: "100%",
                    background: "var(--secondary-color)",
                    transition: "width 0.5s ease",
                  }}
                ></div>
              </div>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "4px",
                fontWeight: "500",
              }}
            >
              {totalGestionadas} de {totalEmpresas} empresas listas
            </div>
          </div>
        </header>

        {/* CONTENEDOR DE FILTROS REESTRUCTURADO */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "white",
            padding: "25px",
            borderRadius: "var(--radius-card)",
            boxShadow: "0 4px 18px rgba(0, 0, 0, 0.03)",
            marginBottom: "30px",
            gap: "20px",
          }}
        >
          {/* FILTROS UNIFICADOS EN UNA SOLA LÍNEA HORIZONTAL */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "25px",
              width: "100%",
            }}
          >
            {/* Filtro Macro-Zona */}
            {mostrarFiltroMacroZona && (
              <div
                style={{
                  minWidth: "260px",
                  maxWidth: "320px",
                  flex: "1 1 300px",
                }}
              >
                <SearchableFilter
                  label="Macro-Zona"
                  value={selectedMacroValue}
                  options={optionsMacroZona}
                  onChange={handleMacroZonaChange}
                  placeholder="Escribe para buscar..."
                />
              </div>
            )}

            {/* Seleccionar Jefatura */}
            {mostrarFiltroJefatura && (
              <div
                style={{
                  minWidth: "260px",
                  maxWidth: "320px",
                  flex: "1 1 300px",
                }}
              >
                <SearchableFilter
                  label="Seleccionar Jefatura / Ejecutiva"
                  value={selectedJefValue}
                  options={optionsJefaturas}
                  onChange={handleJefaturaChange}
                  placeholder="Escribe para buscar..."
                />
              </div>
            )}

            {/* Filtro Período */}
            <div
              style={{
                minWidth: "200px",
                maxWidth: "280px",
                flex: "1 1 240px",
              }}
            >
              <SearchableFilter
                label="📅 Período"
                value={
                  periodoOptions.find((o) => o.value === filtroPeriodo)
                    ?.label || ""
                }
                options={periodoOptions.map((o) => o.label)}
                onChange={(val) => {
                  const found = periodoOptions.find((o) => o.label === val);
                  if (found) setFiltroPeriodo(found.value);
                }}
                placeholder="Seleccionar período..."
              />
            </div>
          </div>

          {/* DIVISOR SUTIL */}
          <div
            style={{ height: "1px", background: "#f1f5f9", margin: "5px 0" }}
          ></div>

          {/* BOTONES DE VISTA Y BUSCAR EMPRESA */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "10px",
            }}
          >
            {/* SELECTOR DE VISTAS */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                background: "#f8fafc",
                padding: "5px",
                borderRadius: "var(--radius-btn)",
                border: "1px solid #e2e8f0",
                flexWrap: "wrap",
                height: "42px",
                alignItems: "center",
                boxSizing: "border-box",
              }}
            >
              <button
                onClick={() => setViewMode("split")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-btn)",
                  border: "none",
                  background:
                    viewMode === "split"
                      ? "var(--secondary-color)"
                      : "transparent",
                  color: viewMode === "split" ? "white" : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "12px",
                  transition: "all 0.2s",
                  height: "32px",
                }}
              >
                📋 Vista Dividida
              </button>
              <button
                onClick={() => setViewMode("detail")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-btn)",
                  border: "none",
                  background:
                    viewMode === "detail"
                      ? "var(--secondary-color)"
                      : "transparent",
                  color: viewMode === "detail" ? "white" : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "12px",
                  transition: "all 0.2s",
                  height: "32px",
                }}
              >
                📊 Detalle
              </button>
            </div>

            {/* DIVISOR TIPO " | " */}
            <div
              style={{
                width: "1px",
                height: "20px",
                background: "#cbd5e1",
                margin: "0 6px",
                alignSelf: "center",
              }}
            ></div>

            {/* Buscar Empresa */}
            <div style={{ minWidth: "240px", maxWidth: "300px" }}>
              <SearchableFilter
                value={filtroEmpresa}
                options={optionsEmpresas}
                onChange={handleEmpresaFilterChange}
                placeholder="🔍 Buscar empresa..."
              />
            </div>
          </div>
        </div>

        {/* VISTA DIVIDIDA (LISTA) */}
        {viewMode === "split" && (
          <div className="responsive-grid-2">
            {/* PENDIENTES */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                borderTop: "4px solid #ef4444",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: "#ef4444",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                EMPRESAS PENDIENTES{" "}
                <span>
                  {
                    empresasFiltradas.filter(
                      (e) => getEstadoTemporal(e.id) !== "gestionada",
                    ).length
                  }
                </span>
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  maxHeight: "500px",
                  overflowY: "auto",
                }}
              >
                {empresasFiltradas
                  .filter((e) => getEstadoTemporal(e.id) !== "gestionada")
                  .map((emp) => {
                    const estado = getEstadoTemporal(emp.id);
                    const solCount = getLogsSolicitada(emp.id).length;
                    let dotColor = "#dc2626"; // Rojo vivo para pendiente
                    let badgeBg = "#fee2e2";
                    let badgeText = "#991b1b";

                    if (estado === "solicitada") {
                      dotColor = "#f97316";
                      badgeBg = "#ffedd5";
                      badgeText = "#c2410c";
                    } // Naranjo brillante
                    else if (estado === "agendada") {
                      dotColor = "#eab308";
                      badgeBg = "#fef08a";
                      badgeText = "#854d0e";
                    } // Tonos amarillos

                    const logsEmpresa = seguimientoLogs.filter(
                      (l) => l.empresa_id === emp.id,
                    );
                    const lastSolicitada = logsEmpresa.find(
                      (l) => l.estado === "solicitada",
                    );
                    const lastAgendada = logsEmpresa.find(
                      (l) => l.estado === "agendada",
                    );

                    return (
                      <li
                        key={emp.id}
                        onClick={() => handleEstadoClick(emp)}
                        style={{
                          padding: "12px 10px",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "13px",
                          color: "var(--text-main)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8fafc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: dotColor,
                              flexShrink: 0,
                            }}
                          ></span>
                          <div>
                            <div style={{ fontWeight: "bold" }}>
                              {emp.nombre}
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--text-muted)",
                                marginTop: "2px",
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              {estado === "solicitada" && lastSolicitada && (
                                <span>
                                  Sol: {formatearFecha(lastSolicitada.fecha)}
                                </span>
                              )}
                              {estado === "agendada" && (
                                <>
                                  {lastSolicitada && (
                                    <span>
                                      Sol:{" "}
                                      {formatearFecha(lastSolicitada.fecha)}
                                    </span>
                                  )}
                                  {lastAgendada && (
                                    <span>
                                      Agen: {formatearFecha(lastAgendada.fecha)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {estado !== "pendiente" && (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "10px",
                              fontWeight: "bold",
                              background: badgeBg,
                              color: badgeText,
                              textTransform: "uppercase",
                            }}
                          >
                            {estado}
                            {estado === "solicitada" && solCount > 1
                              ? ` (${solCount}°)`
                              : ""}
                          </span>
                        )}
                      </li>
                    );
                  })}
                {empresasFiltradas.filter(
                  (e) => getEstadoTemporal(e.id) !== "gestionada",
                ).length === 0 && (
                  <li
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                    }}
                  >
                    ¡Excelente! No hay empresas pendientes.
                  </li>
                )}
              </ul>
            </div>

            {/* GESTIONADAS */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                borderTop: "4px solid #10b981",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: "#10b981",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                EMPRESAS GESTIONADAS{" "}
                <span>
                  {
                    empresasFiltradas.filter(
                      (e) => getEstadoTemporal(e.id) === "gestionada",
                    ).length
                  }
                </span>
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  maxHeight: "500px",
                  overflowY: "auto",
                }}
              >
                {empresasFiltradas
                  .filter((e) => getEstadoTemporal(e.id) === "gestionada")
                  .map((emp) => {
                    const logsEmpresa = seguimientoLogs.filter(
                      (l) => l.empresa_id === emp.id,
                    );
                    const lastGestionada = logsEmpresa.find(
                      (l) => l.estado === "gestionada",
                    );
                    return (
                      <li
                        key={emp.id}
                        onClick={() => handleEstadoClick(emp)}
                        style={{
                          padding: "12px 10px",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "13px",
                          color: "var(--text-main)",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8fafc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: "#10b981",
                            flexShrink: 0,
                          }}
                        ></span>
                        <div>
                          <div style={{ fontWeight: "bold" }}>{emp.nombre}</div>
                          {lastGestionada && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--text-muted)",
                                marginTop: "2px",
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span>
                                Reunión: {formatearFecha(lastGestionada.fecha)}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                {empresasFiltradas.filter(
                  (e) => getEstadoTemporal(e.id) === "gestionada",
                ).length === 0 && (
                  <li
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                    }}
                  >
                    Aún no hay empresas gestionadas.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* VISTA DETALLE (TABLA) */}
        {viewMode === "detail" && (
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "var(--radius-card)",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              marginBottom: "30px",
              maxWidth: "850px",
              margin: "0 auto 30px auto",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "var(--text-main)",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "15px",
                fontSize: "16px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Resumen de Cobertura por Jefatura
            </h3>
            <div className="table-responsive">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th
                      style={{
                        padding: "8px 12px",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Jefatura
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        color: "#dc2626",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        textAlign: "center",
                        width: "95px",
                      }}
                    >
                      Pendientes
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        color: "#f97316",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        textAlign: "center",
                        width: "95px",
                      }}
                    >
                      Solicitadas
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        color: "#ca8a04",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        textAlign: "center",
                        width: "95px",
                      }}
                    >
                      Agendadas
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        color: "#10b981",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        textAlign: "center",
                        width: "95px",
                      }}
                    >
                      Gestionadas
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        color: "var(--text-main)",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        textAlign: "center",
                        width: "80px",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(filtroJefatura === ""
                    ? jefaturasGeneralOrdenadas.filter((jef) =>
                        empresas.some((e) => e.jefatura_id === jef.id),
                      )
                    : jefaturasGeneralOrdenadas.filter(
                        (j) => j.id === Number(filtroJefatura),
                      )
                  ).map((jef) => {
                    const empsJef =
                      userRol === "jefatura" || userRol === "ejecutiva"
                        ? empresas.filter(
                            (e) =>
                              filtroEmpresa === "Todas" ||
                              e.nombre === filtroEmpresa,
                          )
                        : empresas.filter(
                            (e) =>
                              e.jefatura_id === jef.id &&
                              (filtroEmpresa === "Todas" ||
                                e.nombre === filtroEmpresa),
                          );
                    const pendientes = empsJef.filter(
                      (e) => getEstadoTemporal(e.id) === "pendiente",
                    ).length;
                    const solicitadas = empsJef.filter(
                      (e) => getEstadoTemporal(e.id) === "solicitada",
                    ).length;
                    const agendadas = empsJef.filter(
                      (e) => getEstadoTemporal(e.id) === "agendada",
                    ).length;
                    const gestionadas = empsJef.filter(
                      (e) => getEstadoTemporal(e.id) === "gestionada",
                    ).length;
                    const total = empsJef.length;

                    return (
                      <tr
                        key={jef.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8fafc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          style={{
                            padding: "8px 12px",
                            fontWeight: "bold",
                            color: "var(--text-main)",
                          }}
                        >
                          {jef.nombre.toUpperCase()}
                        </td>
                        <td
                          style={{ padding: "8px 12px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "inline-block",
                              minWidth: "24px",
                            }}
                          >
                            {pendientes}
                          </span>
                        </td>
                        <td
                          style={{ padding: "8px 12px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              background: "#ffedd5",
                              color: "#c2410c",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "inline-block",
                              minWidth: "24px",
                            }}
                          >
                            {solicitadas}
                          </span>
                        </td>
                        <td
                          style={{ padding: "8px 12px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              background: "#fef08a",
                              color: "#854d0e",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "inline-block",
                              minWidth: "24px",
                            }}
                          >
                            {agendadas}
                          </span>
                        </td>
                        <td
                          style={{ padding: "8px 12px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              background: "#d1fae5",
                              color: "#065f46",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "inline-block",
                              minWidth: "24px",
                            }}
                          >
                            {gestionadas}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            fontWeight: "bold",
                            color: "var(--text-main)",
                          }}
                        >
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                  {(filtroJefatura === ""
                    ? jefaturas.filter((jef) =>
                        empresas.some((e) => e.jefatura_id === jef.id),
                      )
                    : jefaturas.filter((j) => j.id === Number(filtroJefatura))
                  ).length > 1 && (
                    <tr
                      style={{
                        background: "#f8fafc",
                        borderTop: "2px solid #e2e8f0",
                        fontWeight: "bold",
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 12px",
                          color: "var(--text-main)",
                        }}
                      >
                        TOTAL GENERAL
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            background: "#dc2626",
                            color: "white",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            display: "inline-block",
                            minWidth: "24px",
                          }}
                        >
                          {jefaturas
                            .filter((jef) =>
                              empresas.some((e) => e.jefatura_id === jef.id),
                            )
                            .reduce(
                              (acc, jef) =>
                                acc +
                                empresas.filter(
                                  (e) =>
                                    e.jefatura_id === jef.id &&
                                    (filtroEmpresa === "Todas" ||
                                      e.nombre === filtroEmpresa) &&
                                    getEstadoTemporal(e.id) === "pendiente",
                                ).length,
                              0,
                            )}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            background: "#f97316",
                            color: "white",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            display: "inline-block",
                            minWidth: "24px",
                          }}
                        >
                          {jefaturas
                            .filter((jef) =>
                              empresas.some((e) => e.jefatura_id === jef.id),
                            )
                            .reduce(
                              (acc, jef) =>
                                acc +
                                empresas.filter(
                                  (e) =>
                                    e.jefatura_id === jef.id &&
                                    (filtroEmpresa === "Todas" ||
                                      e.nombre === filtroEmpresa) &&
                                    getEstadoTemporal(e.id) === "solicitada",
                                ).length,
                              0,
                            )}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            background: "#ca8a04",
                            color: "white",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            display: "inline-block",
                            minWidth: "24px",
                          }}
                        >
                          {jefaturas
                            .filter((jef) =>
                              empresas.some((e) => e.jefatura_id === jef.id),
                            )
                            .reduce(
                              (acc, jef) =>
                                acc +
                                empresas.filter(
                                  (e) =>
                                    e.jefatura_id === jef.id &&
                                    (filtroEmpresa === "Todas" ||
                                      e.nombre === filtroEmpresa) &&
                                    getEstadoTemporal(e.id) === "agendada",
                                ).length,
                              0,
                            )}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            background: "#10b981",
                            color: "white",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            display: "inline-block",
                            minWidth: "24px",
                          }}
                        >
                          {jefaturas
                            .filter((jef) =>
                              empresas.some((e) => e.jefatura_id === jef.id),
                            )
                            .reduce(
                              (acc, jef) =>
                                acc +
                                empresas.filter(
                                  (e) =>
                                    e.jefatura_id === jef.id &&
                                    (filtroEmpresa === "Todas" ||
                                      e.nombre === filtroEmpresa) &&
                                    getEstadoTemporal(e.id) === "gestionada",
                                ).length,
                              0,
                            )}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontSize: "14px",
                          color: "var(--text-main)",
                        }}
                      >
                        {jefaturas
                          .filter((jef) =>
                            empresas.some((e) => e.jefatura_id === jef.id),
                          )
                          .reduce(
                            (acc, jef) =>
                              acc +
                              empresas.filter(
                                (e) =>
                                  e.jefatura_id === jef.id &&
                                  (filtroEmpresa === "Todas" ||
                                    e.nombre === filtroEmpresa),
                              ).length,
                            0,
                          )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {empresasFiltradas.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "100px",
              color: "var(--text-light)",
            }}
          >
            No hay empresas asignadas a esta jefatura.
          </div>
        )}
      </div>
    </div>
  );
}
