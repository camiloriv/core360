import React, { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import {
  listarNuevosNegocios,
  obtenerStats,
  obtenerOpciones,
  crearNuevoNegocio,
  actualizarNuevoNegocio,
  cambiarEstadoNegocio,
  eliminarNuevoNegocio,
  exportarExcel,
  obtenerHistorial,
} from "../services/nuevosNegociosService";

/* ───── Constantes de referencia ───── */
const ESTADOS_CONTACTO = ["AFILIADA", "EN GESTIÓN", "PROSPECTO"];
const ESTADOS_DETALLE = [
  "Adherida al OTIC",
  "Proceso de afiliación",
  "Propuesta Enviada",
  "Contacto Inicial - Sin Propuesta",
  "Sin Respuesta",
  "Rechaza propuesta",
  "Prospecto",
];
const INDICADORES = [
  "Página web",
  "Recuperada – Área Comercial",
  "Recuperada – Nuevos Negocios",
  "Referido OTEC / Proveedor",
  "Referido Cliente",
  "Relación profesional previa",
  "Licitación",
  "Propuesta enviada año anterior",
  "Empresa Perdida 2025 o anterior",
  "Prospecto",
];
const ZONAS = ["Norte 1", "Norte 2", "RM", "Sur 1", "Sur 2"];
const OTICS = [
  "OTIC SOFOFA",
  "OTIC COMERCIO",
  "OTIC CCHC",
  "OTIC ASIMET",
  "OTIC ALIANZA",
  "OTIC CAMACOES",
  "OTRA",
  "NO INDICA",
  "SIN OTIC",
];
const JEFAS = [
  "No Asignado",
  "Elizabeth Cardenas",
  "Valentina Alarcón",
  "Beatriz Silva",
  "Luisa Bravo",
  "Carolina Osorio",
  "Paola Muñoz",
  "María Teresa Morales",
  "Carla Parada",
  "Arturo Alvarez",
];

/* ───── Helpers ───── */
const fmtCLP = (val) => {
  const n = parseFloat(val) || 0;
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 });
};
const fmtPct = (val) => {
  const n = parseFloat(val) || 0;
  return `${(n * 100).toFixed(1)}%`;
};
const fmtDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("es-CL");
};

const estadoContactoColor = (estado) => {
  switch ((estado || "").toUpperCase()) {
    case "AFILIADA": return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
    case "EN GESTIÓN": return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
    case "PROSPECTO": return { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" };
    default: return { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
  }
};

const estadoDetalleColor = (estado) => {
  const e = (estado || "").toLowerCase();
  if (e.includes("adherida")) return { bg: "#dcfce7", color: "#166534" };
  if (e.includes("proceso")) return { bg: "#e0f2fe", color: "#0369a1" };
  if (e.includes("propuesta enviada")) return { bg: "#fef3c7", color: "#92400e" };
  if (e.includes("contacto inicial")) return { bg: "#f3e8ff", color: "#6b21a8" };
  if (e.includes("sin respuesta")) return { bg: "#fecaca", color: "#991b1b" };
  if (e.includes("rechaza")) return { bg: "#fee2e2", color: "#b91c1c" };
  if (e.includes("prospecto")) return { bg: "#e0e7ff", color: "#3730a3" };
  return { bg: "#f3f4f6", color: "#374151" };
};

// Abreviar Estado Contacto
const shortEstadoContacto = (val) => {
  const v = (val || "").toUpperCase();
  if (v === "AFILIADA" || v === "AFILIADO") return "AF";
  if (v === "EN GESTIÓN" || v === "EN GESTION") return "EG";
  if (v === "PROSPECTO") return "PR";
  return v;
};

// Abreviar nombre Jefa Cartera (Nombre + Inicial Apellido o Inicial Nombre + Apellido)
const shortJefaCartera = (val) => {
  if (!val || val === "No Asignado") return "N.A.";
  const parts = val.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Inicial del primer nombre + Primer Apellido
    const nameLetter = parts[0].charAt(0).toUpperCase();
    const lastName = parts[1];
    return `${nameLetter}. ${lastName}`;
  }
  return val;
};

/* ───── Formulario vacío ───── */
const emptyForm = {
  holding: "", estado_contacto: "PROSPECTO", rut: "", razon_social: "",
  evento: "", indicador: "", asistio_evento: "No", zona: "",
  monto_1_porciento: 0, tasa_administracion: 0, monto_administracion: 0,
  otic_actual: "", mes_envio_propuesta: "", jefa_cartera: "No Asignado",
  estado: "Prospecto", aporte_ingresado: 0, fecha_autoriza_propuesta: "",
  contacto: "", contacto_2: "", correo: "", cargo: "", celular_telefono: "",
  comentarios: "", fecha_reunion: "",
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
const SeguimientoNegocios = () => {
  const [negocios, setNegocios] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filtros
  const [filtroEstadoContacto, setFiltroEstadoContacto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroZona, setFiltroZona] = useState("");
  const [filtroJefa, setFiltroJefa] = useState("");
  const [filtroIndicador, setFiltroIndicador] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const debounceRef = useRef(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Historial
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialData, setHistorialData] = useState([]);
  const [historialNombre, setHistorialNombre] = useState("");

  // Estado inline dropdown
  const [inlineEstado, setInlineEstado] = useState(null);

  // Exporting
  const [exporting, setExporting] = useState(false);

  /* ── Cargar datos ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroEstadoContacto) params.estado_contacto = filtroEstadoContacto;
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroZona) params.zona = filtroZona;
      if (filtroJefa) params.jefa_cartera = filtroJefa;
      if (filtroIndicador) params.indicador = filtroIndicador;
      if (filtroBusqueda) params.busqueda = filtroBusqueda;

      const [result, statsResult] = await Promise.all([
        listarNuevosNegocios(params),
        obtenerStats(),
      ]);

      setNegocios(result.data || []);
      setTotal(result.total || 0);
      setStats(statsResult);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  }, [filtroEstadoContacto, filtroEstado, filtroZona, filtroJefa, filtroIndicador, filtroBusqueda]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Debounce búsqueda ── */
  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFiltroBusqueda(value);
    }, 400);
  };

  /* ── Modal crear/editar ── */
  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEditModal = (neg) => {
    setEditingId(neg.id);
    setForm({
      ...neg,
      monto_1_porciento: parseFloat(neg.monto_1_porciento) || 0,
      tasa_administracion: (parseFloat(neg.tasa_administracion) || 0) * 100, // Mostrar como entero (ej: 5 en vez de 0.05)
      monto_administracion: parseFloat(neg.monto_administracion) || 0,
      aporte_ingresado: parseFloat(neg.aporte_ingresado) || 0,
      fecha_reunion: neg.fecha_reunion ? neg.fecha_reunion.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-calcular monto administración
      if (field === "monto_1_porciento" || field === "tasa_administracion") {
        const monto = field === "monto_1_porciento" ? parseFloat(value) || 0 : parseFloat(updated.monto_1_porciento) || 0;
        // La tasa ingresada viene como entero (ej: 5), para el cálculo de administración usamos valor / 100 (ej: 0.05)
        const tasa = field === "tasa_administracion" ? (parseFloat(value) || 0) / 100 : (parseFloat(updated.tasa_administracion) || 0) / 100;
        updated.monto_administracion = monto * tasa;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Antes de enviar al backend, convertimos la tasa de nuevo a decimal (ej: 5 -> 0.05)
      const payload = {
        ...form,
        tasa_administracion: (parseFloat(form.tasa_administracion) || 0) / 100
      };

      if (editingId) {
        await actualizarNuevoNegocio(editingId, payload);
        Swal.fire({ icon: "success", title: "Actualizado", text: "Registro actualizado correctamente", timer: 1500, showConfirmButton: false });
      } else {
        await crearNuevoNegocio(payload);
        Swal.fire({ icon: "success", title: "Creado", text: "Nuevo registro creado correctamente", timer: 1500, showConfirmButton: false });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.error || "Error al guardar" });
    }
  };

  /* ── Eliminar ── */
  const handleDelete = async (neg) => {
    const result = await Swal.fire({
      title: "¿Eliminar registro?",
      html: `<b>${neg.holding || neg.razon_social || "Sin nombre"}</b><br>Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, eliminar",
    });
    if (result.isConfirmed) {
      try {
        await eliminarNuevoNegocio(neg.id);
        Swal.fire({ icon: "success", title: "Eliminado", timer: 1200, showConfirmButton: false });
        fetchData();
      } catch (err) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo eliminar" });
      }
    }
  };

  /* ── Cambiar estado inline ── */
  const handleInlineEstadoChange = async (negId, campo, valor) => {
    try {
      await cambiarEstadoNegocio(negId, { [campo]: valor });
      setInlineEstado(null);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo cambiar el estado" });
    }
  };

  /* ── Historial ── */
  const openHistorial = async (neg) => {
    try {
      const data = await obtenerHistorial(neg.id);
      setHistorialData(data);
      setHistorialNombre(neg.holding || neg.razon_social || "Sin nombre");
      setShowHistorial(true);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo cargar historial" });
    }
  };

  /* ── Exportar Excel ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filtroEstadoContacto) params.estado_contacto = filtroEstadoContacto;
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroZona) params.zona = filtroZona;
      if (filtroJefa) params.jefa_cartera = filtroJefa;
      if (filtroIndicador) params.indicador = filtroIndicador;
      if (filtroBusqueda) params.busqueda = filtroBusqueda;
      await exportarExcel(params);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo exportar" });
    } finally {
      setExporting(false);
    }
  };

  /* ── KPI Cards ── */
  const getKPI = (estado) => {
    if (!stats) return { count: 0, monto: 0, aporte: 0 };
    const found = stats.por_estado_contacto.find((e) => e.estado_contacto === estado);
    return found || { count: 0, monto_proyectado: 0, aporte_ingresado: 0 };
  };

  const limpiarFiltros = () => {
    setFiltroEstadoContacto("");
    setFiltroEstado("");
    setFiltroZona("");
    setFiltroJefa("");
    setFiltroIndicador("");
    setFiltroBusqueda("");
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={S.page}>
      {/* ──── HEADER ──── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Seguimiento Nuevos Negocios
          </h1>
          <p style={S.subtitle}>Pipeline comercial — Gestión de empresas adheridas, en proceso y prospectos</p>
        </div>
        <div style={S.headerActions}>
          <button style={S.btnExport} onClick={handleExport} disabled={exporting}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {exporting ? "Exportando..." : "Descargar Excel"}
          </button>
          <button style={S.btnPrimary} onClick={openCreateModal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo Registro
          </button>
        </div>
      </div>

      {/* ──── KPI CARDS ──── */}
      <div style={S.kpiRow}>
        {ESTADOS_CONTACTO.map((ec) => {
          const kpi = getKPI(ec);
          const colors = estadoContactoColor(ec);
          return (
            <div
              key={ec}
              style={{ ...S.kpiCard, borderTop: `4px solid ${colors.border}`, cursor: "pointer", backgroundColor: filtroEstadoContacto === ec ? colors.bg : "#fff" }}
              onClick={() => setFiltroEstadoContacto(filtroEstadoContacto === ec ? "" : ec)}
            >
              <div style={{ ...S.kpiBadge, backgroundColor: colors.bg, color: colors.color }}>{ec}</div>
              <div style={S.kpiNumber}>{kpi.count || 0}</div>
              <div style={S.kpiLabel}>empresas</div>
              <div style={{ ...S.kpiMonto, color: colors.color }}>{fmtCLP(kpi.monto_proyectado)}</div>
              <div style={S.kpiSubLabel}>Monto proyectado</div>
            </div>
          );
        })}
        <div style={{ ...S.kpiCard, borderTop: "4px solid var(--accent-color)" }}>
          <div style={{ ...S.kpiBadge, backgroundColor: "#eff6ff", color: "var(--accent-color)" }}>TOTAL</div>
          <div style={S.kpiNumber}>{stats?.totales?.total || 0}</div>
          <div style={S.kpiLabel}>empresas totales</div>
          <div style={{ ...S.kpiMonto, color: "var(--accent-color)" }}>{fmtCLP(stats?.totales?.aporte_ingresado_total)}</div>
          <div style={S.kpiSubLabel}>Aporte ingresado total</div>
        </div>
      </div>

      {/* ──── FILTROS ──── */}
      <div style={S.filtersCard}>
        <div style={S.filtersGrid}>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Estado</label>
            <select style={S.filterSelect} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS_DETALLE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Zona</label>
            <select style={S.filterSelect} value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}>
              <option value="">Todas</option>
              {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Jefa de Cartera</label>
            <select style={S.filterSelect} value={filtroJefa} onChange={(e) => setFiltroJefa(e.target.value)}>
              <option value="">Todas</option>
              {JEFAS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div style={S.filterGroup}>
            <label style={S.filterLabel}>Indicador</label>
            <select style={S.filterSelect} value={filtroIndicador} onChange={(e) => setFiltroIndicador(e.target.value)}>
              <option value="">Todos</option>
              {INDICADORES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div style={{ ...S.filterGroup, flex: "1.5" }}>
            <label style={S.filterLabel}>Buscar</label>
            <input style={S.filterInput} type="text" placeholder="Holding, RUT, contacto, correo..." onChange={handleSearchChange} />
          </div>
          <div style={{ ...S.filterGroup, alignSelf: "flex-end" }}>
            <button style={S.btnClearFilters} onClick={limpiarFiltros}>Limpiar</button>
          </div>
        </div>
      </div>

      {/* ──── TABLA ──── */}
      <div style={S.tableCard}>
        <div style={S.tableHeader}>
          <span style={S.tableCount}>{total} registros encontrados</span>
        </div>

        <div style={{ ...S.tableWrapper, position: "relative" }}>
          {/* Overlay loader when fetching data (background loading) */}
          {loading && negocios.length > 0 && (
            <div style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(1px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              transition: "all 0.2s"
            }}>
              <div style={S.spinner}></div>
            </div>
          )}

          {loading && negocios.length === 0 ? (
            <div style={S.loadingContainer}>
              <div style={S.spinner}></div>
              <p style={{ color: "var(--text-muted)", marginTop: 10 }}>Cargando datos...</p>
            </div>
          ) : negocios.length === 0 ? (
            <div style={S.emptyState}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p>No se encontraron registros</p>
            </div>
          ) : (
            <table style={{ ...S.table, opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  <th style={S.th}>Holding</th>
                  <th style={S.th}>Est.</th>
                  <th style={S.th}>RUT</th>
                  <th style={S.th}>Razón Social</th>
                  <th style={S.th}>Indicador</th>
                  <th style={S.th}>Zona</th>
                  <th style={S.th}>Monto 1%</th>
                  <th style={S.th}>Tasa Adm.</th>
                  <th style={S.th}>OTIC Actual</th>
                  <th style={S.th}>Jefa</th>
                  <th style={S.th}>Estado</th>
                  <th style={S.th}>Aporte Ingresado</th>
                  <th style={S.th}>Diferencia</th>
                  <th style={S.th}>Contacto / Correo</th>
                  <th style={S.th}>Comentarios</th>
                  <th style={{ ...S.th, position: "sticky", right: 0, background: "var(--primary-color)", zIndex: 2 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {negocios.map((neg, idx) => {
                  const diferencia = parseFloat(neg.aporte_ingresado || 0) - parseFloat(neg.monto_1_porciento || 0);
                  const ecColors = estadoContactoColor(neg.estado_contacto);
                  const edColors = estadoDetalleColor(neg.estado);
                  return (
                    <tr key={neg.id} style={S.tr}>
                      <td style={S.td}>{idx + 1}</td>
                      <td 
                        style={{ 
                          ...S.td, 
                          fontWeight: 600, 
                          maxWidth: 150, 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap" 
                        }} 
                        title={neg.holding || ""}
                      >
                        {neg.holding || "—"}
                      </td>
                      <td style={S.td}>
                        <span
                          style={{ ...S.badge, backgroundColor: ecColors.bg, color: ecColors.color, border: `1px solid ${ecColors.border}`, cursor: "pointer" }}
                          onClick={() => setInlineEstado(inlineEstado === `ec-${neg.id}` ? null : `ec-${neg.id}`)}
                          title={neg.estado_contacto}
                        >
                          {shortEstadoContacto(neg.estado_contacto)}
                        </span>
                        {inlineEstado === `ec-${neg.id}` && (
                          <div style={S.inlineDropdown}>
                            {ESTADOS_CONTACTO.map((e) => (
                              <div key={e} style={S.inlineOption} onClick={() => handleInlineEstadoChange(neg.id, "estado_contacto", e)}>
                                <span style={{ ...S.badge, ...estadoContactoColor(e), border: `1px solid ${estadoContactoColor(e).border}` }}>
                                  {shortEstadoContacto(e)} ({e})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ ...S.td, fontFamily: "var(--font-mono)", fontSize: "11px" }}>{neg.rut || "—"}</td>
                      <td 
                        style={{ 
                          ...S.td, 
                          maxWidth: 160, 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap" 
                        }} 
                        title={neg.razon_social || ""}
                      >
                        {neg.razon_social || "—"}
                      </td>
                      <td style={{ ...S.td, fontSize: "11px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }} title={neg.indicador}>{neg.indicador || "—"}</td>
                      <td style={S.td}>{neg.zona || "—"}</td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtCLP(neg.monto_1_porciento)}</td>
                      <td style={{ ...S.td, textAlign: "center" }}>{fmtPct(neg.tasa_administracion)}</td>
                      <td style={{ ...S.td, fontSize: "11px" }}>{neg.otic_actual || "—"}</td>
                      <td style={{ ...S.td, fontSize: "11px" }} title={neg.jefa_cartera}>{shortJefaCartera(neg.jefa_cartera)}</td>
                      <td style={S.td}>
                        <span
                          style={{ ...S.badge, backgroundColor: edColors.bg, color: edColors.color, cursor: "pointer" }}
                          onClick={() => setInlineEstado(inlineEstado === `ed-${neg.id}` ? null : `ed-${neg.id}`)}
                        >
                          {neg.estado || "—"}
                        </span>
                        {inlineEstado === `ed-${neg.id}` && (
                          <div style={S.inlineDropdown}>
                            {ESTADOS_DETALLE.map((e) => (
                              <div key={e} style={S.inlineOption} onClick={() => handleInlineEstadoChange(neg.id, "estado", e)}>
                                <span style={{ ...S.badge, ...estadoDetalleColor(e) }}>{e}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtCLP(neg.aporte_ingresado)}</td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "var(--font-mono)", color: diferencia >= 0 ? "#166534" : "#b91c1c" }}>
                        {fmtCLP(diferencia)}
                      </td>
                      <td 
                        style={{ 
                          ...S.td, 
                          maxWidth: 160, 
                          overflow: "hidden"
                        }}
                        title={`${neg.contacto || "Sin Contacto"}\n${neg.correo || "Sin Correo"}`}
                      >
                        <div 
                          style={{ 
                            fontWeight: 600, 
                            textOverflow: "ellipsis", 
                            overflow: "hidden", 
                            whiteSpace: "nowrap" 
                          }}
                        >
                          {neg.contacto || "—"}
                        </div>
                        {neg.correo && (
                          <div 
                            style={{ 
                              fontSize: "10px", 
                              color: "var(--text-muted)", 
                              marginTop: 2,
                              textOverflow: "ellipsis", 
                              overflow: "hidden", 
                              whiteSpace: "nowrap"
                            }}
                          >
                            {neg.correo}
                          </div>
                        )}
                      </td>
                      <td style={{ ...S.td, fontSize: "11px", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={neg.comentarios}>{neg.comentarios || "—"}</td>
                      <td style={{ ...S.td, position: "sticky", right: 0, background: "#fff", zIndex: 1, boxShadow: "-2px 0 5px rgba(0,0,0,0.05)" }}>
                        <div style={S.actionBtns}>
                          <button style={S.actionBtn} title="Editar" onClick={() => openEditModal(neg)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button style={S.actionBtn} title="Historial" onClick={() => openHistorial(neg)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </button>
                          <button style={S.actionBtn} title="Eliminar" onClick={() => handleDelete(neg)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ──── MODAL CREAR/EDITAR ──── */}
      {showModal && (
        <div style={S.overlay} onClick={() => setShowModal(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>{editingId ? "Editar Registro" : "Nuevo Registro"}</h2>
              <button style={S.modalClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={S.modalBody}>
              {/* Sección: Empresa */}
              <div style={S.sectionTitle}>Datos de la Empresa</div>
              <div style={S.formGrid}>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Holding / Grupo</label>
                  <input style={S.formInput} value={form.holding} onChange={(e) => handleFormChange("holding", e.target.value)} placeholder="Nombre del holding" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Estado Contacto</label>
                  <select style={S.formSelect} value={form.estado_contacto} onChange={(e) => handleFormChange("estado_contacto", e.target.value)}>
                    {ESTADOS_CONTACTO.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>RUT</label>
                  <input style={S.formInput} value={form.rut} onChange={(e) => handleFormChange("rut", e.target.value)} placeholder="XX.XXX.XXX-X" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Razón Social</label>
                  <input style={S.formInput} value={form.razon_social} onChange={(e) => handleFormChange("razon_social", e.target.value)} />
                </div>
              </div>

              {/* Sección: Comercial */}
              <div style={S.sectionTitle}>Datos Comerciales</div>
              <div style={S.formGrid}>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Indicador (origen)</label>
                  <select style={S.formSelect} value={form.indicador} onChange={(e) => handleFormChange("indicador", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {INDICADORES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Evento</label>
                  <input style={S.formInput} value={form.evento} onChange={(e) => handleFormChange("evento", e.target.value)} placeholder="Nombre del evento" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>¿Asistió a evento?</label>
                  <select style={S.formSelect} value={form.asistio_evento} onChange={(e) => handleFormChange("asistio_evento", e.target.value)}>
                    <option value="No">No</option>
                    <option value="Si">Si</option>
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Zona</label>
                  <select style={S.formSelect} value={form.zona} onChange={(e) => handleFormChange("zona", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Monto 1% o Aporte</label>
                  <input 
                    style={S.formInput} 
                    type="text" 
                    value={form.monto_1_porciento === "" || form.monto_1_porciento === 0 ? "" : fmtCLP(form.monto_1_porciento)} 
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/\D/g, "");
                      handleFormChange("monto_1_porciento", cleanVal ? parseInt(cleanVal) : 0);
                    }} 
                    placeholder="$0"
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Tasa Administración (%)</label>
                  <input 
                    style={S.formInput} 
                    type="number" 
                    step="0.01" 
                    value={form.tasa_administracion} 
                    onChange={(e) => handleFormChange("tasa_administracion", e.target.value)} 
                    placeholder="Ej: 5"
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Monto Administración</label>
                  <input 
                    style={{ ...S.formInput, backgroundColor: "#f3f4f6" }} 
                    type="text" 
                    value={fmtCLP(form.monto_administracion)} 
                    readOnly 
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>OTIC Actual</label>
                  <select style={S.formSelect} value={form.otic_actual} onChange={(e) => handleFormChange("otic_actual", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {OTICS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Mes Envío Propuesta</label>
                  <input style={S.formInput} value={form.mes_envio_propuesta} onChange={(e) => handleFormChange("mes_envio_propuesta", e.target.value)} placeholder="Ej: Enero, Febrero..." />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Jefa de Cartera</label>
                  <select style={S.formSelect} value={form.jefa_cartera} onChange={(e) => handleFormChange("jefa_cartera", e.target.value)}>
                    {JEFAS.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Estado</label>
                  <select style={S.formSelect} value={form.estado} onChange={(e) => handleFormChange("estado", e.target.value)}>
                    {ESTADOS_DETALLE.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Aporte Ingresado</label>
                  <input 
                    style={S.formInput} 
                    type="text" 
                    value={form.aporte_ingresado === "" || form.aporte_ingresado === 0 ? "" : fmtCLP(form.aporte_ingresado)} 
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/\D/g, "");
                      handleFormChange("aporte_ingresado", cleanVal ? parseInt(cleanVal) : 0);
                    }} 
                    placeholder="$0"
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Diferencia (auto)</label>
                  <input style={{ ...S.formInput, backgroundColor: "#f3f4f6", color: (parseFloat(form.aporte_ingresado) - parseFloat(form.monto_1_porciento)) >= 0 ? "#166534" : "#b91c1c" }} type="text" value={fmtCLP(parseFloat(form.aporte_ingresado || 0) - parseFloat(form.monto_1_porciento || 0))} readOnly />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Fecha Autoriza Propuesta</label>
                  <input style={S.formInput} value={form.fecha_autoriza_propuesta} onChange={(e) => handleFormChange("fecha_autoriza_propuesta", e.target.value)} />
                </div>
              </div>

              {/* Sección: Contacto */}
              <div style={S.sectionTitle}>Datos de Contacto</div>
              <div style={S.formGrid}>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Contacto Principal</label>
                  <input style={S.formInput} value={form.contacto} onChange={(e) => handleFormChange("contacto", e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Contacto 2</label>
                  <input style={S.formInput} value={form.contacto_2} onChange={(e) => handleFormChange("contacto_2", e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Correo</label>
                  <input style={S.formInput} type="email" value={form.correo} onChange={(e) => handleFormChange("correo", e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Cargo</label>
                  <input style={S.formInput} value={form.cargo} onChange={(e) => handleFormChange("cargo", e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Celular / Teléfono</label>
                  <input style={S.formInput} value={form.celular_telefono} onChange={(e) => handleFormChange("celular_telefono", e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Fecha Reunión</label>
                  <input style={S.formInput} type="date" value={form.fecha_reunion} onChange={(e) => handleFormChange("fecha_reunion", e.target.value)} />
                </div>
                <div style={{ ...S.formGroup, gridColumn: "1 / -1" }}>
                  <label style={S.formLabel}>Comentarios (Acciones / Reuniones)</label>
                  <textarea style={{ ...S.formInput, minHeight: 80, resize: "vertical" }} value={form.comentarios} onChange={(e) => handleFormChange("comentarios", e.target.value)} />
                </div>
              </div>

              <div style={S.modalFooter}>
                <button type="button" style={S.btnCancel} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" style={S.btnPrimary}>{editingId ? "Guardar Cambios" : "Crear Registro"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── MODAL HISTORIAL ──── */}
      {showHistorial && (
        <div style={S.overlay} onClick={() => setShowHistorial(false)}>
          <div style={{ ...S.modal, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>Historial — {historialNombre}</h2>
              <button style={S.modalClose} onClick={() => setShowHistorial(false)}>×</button>
            </div>
            <div style={{ ...S.modalBody, maxHeight: 400, overflowY: "auto" }}>
              {historialData.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>Sin cambios registrados.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {historialData.map((h) => (
                    <div key={h.id} style={S.histItem}>
                      <div style={S.histHeader}>
                        <span style={S.histCampo}>{h.campo_modificado === "creacion" ? "📋 Creación" : `🔄 ${h.campo_modificado}`}</span>
                        <span style={S.histDate}>{new Date(h.created_at).toLocaleString("es-CL")}</span>
                      </div>
                      {h.campo_modificado !== "creacion" && (
                        <div style={S.histBody}>
                          <span style={S.histOld}>{h.valor_anterior || "(vacío)"}</span>
                          <span style={{ margin: "0 8px" }}>→</span>
                          <span style={S.histNew}>{h.valor_nuevo || "(vacío)"}</span>
                        </div>
                      )}
                      {h.campo_modificado === "creacion" && (
                        <div style={S.histBody}><span>{h.valor_nuevo}</span></div>
                      )}
                      <div style={S.histUser}>Por: {h.usuario}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close inline dropdowns on outside click */}
      {inlineEstado && <div style={S.invisibleOverlay} onClick={() => setInlineEstado(null)} />}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .nn-table-wrapper::-webkit-scrollbar { height: 8px; }
        .nn-table-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .nn-table-wrapper::-webkit-scrollbar-track { background: #f1f5f9; }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */
const S = {
  page: { padding: "12px 16px", maxWidth: 1800, margin: "0 auto", fontFamily: "var(--font-main)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  title: { fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 8 },
  subtitle: { fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap" },

  btnPrimary: { display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", backgroundColor: "var(--accent-color)", color: "#fff", border: "none", borderRadius: "var(--radius-btn)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--font-main)" },
  btnExport: { display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", backgroundColor: "#fff", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-btn)", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--font-main)" },
  btnCancel: { padding: "8px 16px", backgroundColor: "#fff", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-btn)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-main)" },
  btnClearFilters: { padding: "6px 12px", backgroundColor: "transparent", color: "var(--danger-color)", border: "1px solid var(--danger-color)", borderRadius: "var(--radius-btn)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-main)", whiteSpace: "nowrap" },

  // KPIs
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 },
  kpiCard: { background: "#fff", borderRadius: "var(--radius-card)", padding: "10px 14px", boxShadow: "var(--shadow-sm)", transition: "all 0.2s" },
  kpiBadge: { display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.5px", marginBottom: 4 },
  kpiNumber: { fontSize: 24, fontWeight: 700, color: "var(--text-main)", lineHeight: 1 },
  kpiLabel: { fontSize: 11, color: "var(--text-muted)", marginTop: 1 },
  kpiMonto: { fontSize: 13, fontWeight: 700, marginTop: 4 },
  kpiSubLabel: { fontSize: 10, color: "var(--text-light)" },

  // Filters
  filtersCard: { background: "#fff", borderRadius: "var(--radius-card)", padding: "10px 14px", marginBottom: 12, boxShadow: "var(--shadow-sm)" },
  filtersGrid: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" },
  filterGroup: { display: "flex", flexDirection: "column", flex: 1, minWidth: 120 },
  filterLabel: { fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" },
  filterSelect: { padding: "5px 8px", border: "1px solid var(--border-input)", borderRadius: "var(--radius-sm)", fontSize: 12, fontFamily: "var(--font-main)", backgroundColor: "#fff", color: "var(--text-main)" },
  filterInput: { padding: "5px 8px", border: "1px solid var(--border-input)", borderRadius: "var(--radius-sm)", fontSize: 12, fontFamily: "var(--font-main)", color: "var(--text-main)" },

  // Table
  tableCard: { background: "#fff", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-sm)", overflow: "hidden" },
  tableHeader: { padding: "8px 14px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  tableCount: { fontSize: 12, color: "var(--text-muted)", fontWeight: 500 },
  tableWrapper: { overflowX: "auto", maxHeight: "calc(100vh - 280px)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "6px 8px", textAlign: "left", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "#fff", backgroundColor: "var(--primary-color)", position: "sticky", top: 0, zIndex: 3, whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" },
  td: { padding: "6px 8px", color: "var(--text-main)", whiteSpace: "nowrap", position: "relative" },

  // Badges
  badge: { display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 20, whiteSpace: "nowrap" },

  // Inline dropdown
  inlineDropdown: { position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", zIndex: 100, padding: 4, minWidth: 160 },
  inlineOption: { padding: "4px 6px", cursor: "pointer", borderRadius: 4, transition: "background 0.15s" },
  invisibleOverlay: { position: "fixed", inset: 0, zIndex: 50 },

  // Actions
  actionBtns: { display: "flex", gap: 3, alignItems: "center" },
  actionBtn: { background: "transparent", border: "1px solid var(--border-color)", borderRadius: "0px", width: "24px", height: "24px", minWidth: "24px", minHeight: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", padding: 0, boxSizing: "border-box" },

  // Modal
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 20, zIndex: 2000, overflowY: "auto" },
  modal: { background: "#fff", borderRadius: "var(--radius-card)", width: "90%", maxWidth: 900, maxHeight: "95vh", overflowY: "auto", boxShadow: "var(--shadow-lg)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--border-color)" },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "var(--text-main)", margin: 0 },
  modalClose: { background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 },
  modalBody: { padding: "14px 18px" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 0 0 0", borderTop: "1px solid var(--border-color)", marginTop: 12 },

  // Form
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "var(--secondary-color)", marginTop: 10, marginBottom: 8, paddingBottom: 4, borderBottom: "2px solid var(--border-color)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" },
  formGroup: { display: "flex", flexDirection: "column" },
  formLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2 },
  formInput: { padding: "6px 10px", border: "1px solid var(--border-input)", borderRadius: "var(--radius-sm)", fontSize: 12, fontFamily: "var(--font-main)", color: "var(--text-main)", outline: "none", transition: "border-color 0.2s" },
  formSelect: { padding: "6px 10px", border: "1px solid var(--border-input)", borderRadius: "var(--radius-sm)", fontSize: 12, fontFamily: "var(--font-main)", backgroundColor: "#fff", color: "var(--text-main)" },

  // Loading
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30 },
  spinner: { width: 30, height: 30, border: "3px solid rgba(0,0,0,0.1)", borderLeftColor: "var(--accent-color)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, color: "var(--text-muted)" },

  // Historial
  histDate: { fontSize: 11, color: "var(--text-light)" },
  histBody: { display: "flex", alignItems: "center", fontSize: 13, flexWrap: "wrap" },
  histOld: { color: "#b91c1c", textDecoration: "line-through", padding: "2px 8px", backgroundColor: "#fee2e2", borderRadius: 4 },
  histNew: { color: "#166534", fontWeight: 600, padding: "2px 8px", backgroundColor: "#dcfce7", borderRadius: 4 },
  histUser: { fontSize: 11, color: "var(--text-light)", marginTop: 6 },
};

export default SeguimientoNegocios;
