import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { syncEventosPasados, desvincularBorrador, vincularHuerfana, marcarExcluida, marcarProforma } from "../services/agendamientoService";
import { marcarNoAplica } from "../services/reunionesService";
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
import api from "../services/api";
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
  const opts = [{ value: `anio-${y}`, label: `Año ${y}` }];
  for (let i = 0; i < 12; i++) {
    const m = String(i + 1).padStart(2, "0");
    opts.push({ value: `${y}-${m}`, label: MESES[i] });
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
  const { user, reuniones, jefaturas, empresas, usuarios, loading, refetch } = useDashboardData();
  const userRol = user?.permisos;

  const [activeMobileChart, setActiveMobileChart] = useState("pie"); // 'pie', 'bar', 'line'

  // DEBUG TEMPORAL: log datos recibidos para diagnosticar problemas en entorno de desarrollo
  useEffect(() => {
    if (!loading) {
      console.group('[DEBUG DashboardReuniones]');
      console.log('user:', user);
      console.log('userRol:', userRol);
      console.log('reuniones total:', reuniones.length, reuniones);
      console.log('empresas total:', empresas.length, empresas);
      console.log('jefaturas total:', jefaturas.length, jefaturas);
      const muestra = reuniones.slice(0, 3);
      muestra.forEach(r => console.log(`  reunion ejecutiva_id=${r.ejecutiva_id} (${typeof r.ejecutiva_id}), user.id=${user?.id} (${typeof user?.id}), empresa_id=${r.empresa_id}, is_huerfana=${r.is_huerfana}`));
      console.groupEnd();
    }
  }, [loading, reuniones.length]);
  const navigate = useNavigate();

  const [loadingSync, setLoadingSync] = useState(true);

  useEffect(() => {
    setLoadingSync(false);
  }, []);

  const handleDesvincular = async (reunion) => {
    let dominios = [];
    try {
      const invitadosStr = reunion.enviado_a || '[]';
      const invitados = JSON.parse(invitadosStr);
      if (Array.isArray(invitados)) {
        dominios = [...new Set(invitados.filter(e => typeof e === 'string' && e.includes('@') && !e.toLowerCase().endsWith('@proforma.cl')).map(e => '@' + e.split('@')[1]))];
      }
    } catch(e) {}

    let desvincularDominios = [];

    if (dominios.length > 0) {
      const htmlContent = `
        <div style="text-align: left; margin-top: 15px;">
          <div style="font-size: 14px; color: #475569; margin-bottom: 16px; line-height: 1.5;">
            Se desvinculará este borrador de minuta y la reunión volverá a la bandeja de reuniones sin clasificar.
          </div>
          <div style="font-weight: 700; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
            Además, puedes eliminar el dominio asociado para evitar vinculaciones futuras erróneas:
          </div>
          <div class="swal2-checkboxes-container" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            ${dominios.map(d => `
              <label class="swal2-checkbox-label">
                <input type="checkbox" class="swal2-desvincular-checkbox" value="${d}" />
                <span>Eliminar dominio ${d} (evita que futuras reuniones de este dominio se autovinculen a esta empresa)</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;

      const result = await Swal.fire({
        title: '¿Desvincular Reunión?',
        html: htmlContent,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Desvincular',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#be123c',
        cancelButtonColor: '#64748b',
        preConfirm: () => {
          const checked = document.querySelectorAll('.swal2-desvincular-checkbox:checked');
          return Array.from(checked).map(cb => cb.value);
        }
      });

      if (!result.isConfirmed) return; // Cancelado
      desvincularDominios = result.value || [];
    } else {
      const result = await Swal.fire({
        title: "¿Desvincular reunión?",
        text: "Se eliminará el borrador de la minuta y la reunión volverá a la bandeja de 'Reuniones Pasadas sin Clasificar' para que puedas volver a enlazarla.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#be123c",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Sí, desvincular",
        cancelButtonText: "Cancelar"
      });

      if (!result.isConfirmed) return;
    }

    try {
      const result = await desvincularBorrador(reunion.id_reunion, desvincularDominios);
      const msj = result.data?.message || "La reunión ha sido desvinculada correctamente.";
      Swal.fire("Desvinculada", msj, "success");
      refetch();
    } catch (e) {
      Swal.fire("Error", "No se pudo desvincular la reunión", "error");
    }
  };

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrphanId, setSelectedOrphanId] = useState(null);
  const [selectedOrphan, setSelectedOrphan] = useState(null);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [searchEmpresa, setSearchEmpresa] = useState("");
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const [noAplicaEmpresa, setNoAplicaEmpresa] = useState(false);
  const [clasificacion, setClasificacion] = useState('empresa'); // 'empresa' | 'proforma' | 'excluida'
  const [globalEmpresas, setGlobalEmpresas] = useState([]);

  useEffect(() => {
    // Para el modal de vinculación, cargar TODAS las empresas (no solo de la cartera actual),
    // ya que reuniones antiguas pueden pertenecer a empresas que cambiaron de ejecutiva.
    api.get("/empresas")
      .then(res => setGlobalEmpresas(res.data))
      .catch(err => console.error("Error cargando empresas globales:", err));
  }, []);

  const externalAttendees = useMemo(() => {
    if (!selectedOrphan) return [];
    
    const participantsData = selectedOrphan.participantes || selectedOrphan.asistentes;
    if (!participantsData) return [];

    try {
      const parsed = typeof participantsData === "string" ? JSON.parse(participantsData) : participantsData;
      if (Array.isArray(parsed)) {
        return parsed.filter(p => p && (p.email || p.name));
      }
    } catch (e) {
      return String(participantsData)
        .split(",")
        .map(name => ({ name: name.trim(), email: "" }))
        .filter(p => p.name);
    }
    return [];
  }, [selectedOrphan]);

  const detectedDomains = useMemo(() => {
    const dominiosGenericos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'proforma.cl', 'live.com', 'icloud.com'];
    const list = externalAttendees
      .map(p => {
        const email = p.email || (p.name && p.name.includes('@') ? p.name : '');
        if (email && email.includes('@')) {
          return '@' + email.split('@')[1].trim().toLowerCase();
        }
        return null;
      })
      .filter(d => d && !dominiosGenericos.includes(d.substring(1)));
    return [...new Set(list)];
  }, [externalAttendees]);

  const [selectedDomains, setSelectedDomains] = useState([]);

  useEffect(() => {
    setSelectedDomains(detectedDomains);
  }, [detectedDomains]);

  const handleMarcarNoAplica = async (id, isHuerfana, isCurrentlyNoAplica) => {
    try {
      await marcarNoAplica(id, isHuerfana, !isCurrentlyNoAplica);
      refetch();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo actualizar el estado", "error");
    }
  };

  const handleVerMinuta = (reunion) => {
    if (!reunion.minuta) {
      Swal.fire("Sin minuta", "Esta reunión no tiene minuta disponible.", "info");
      return;
    }
    Swal.fire({
      title: reunion.asunto_teams || reunion.motivo_reu || 'Minuta de Reunión',
      html: `
        <div style="text-align: left; max-height: 65vh; overflow-y: auto; padding: 8px 4px; font-size: 13px; line-height: 1.6; color: #1e293b;">
          ${reunion.minuta}
        </div>
      `,
      width: '860px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
    });
  };

  const handleVerDetalleProforma = (reunion) => {
    // Parsear asistentes
    let asistentesList = [];
    try {
      const parsed = typeof reunion.asistentes === 'string' ? JSON.parse(reunion.asistentes) : reunion.asistentes;
      if (Array.isArray(parsed)) {
        asistentesList = parsed;
      }
    } catch (e) {}

    // Parsear organizador
    let orgName = reunion.organizador_nombre || '';
    let orgEmail = '';
    if (reunion.organizador) {
      try {
        const parsedOrg = typeof reunion.organizador === 'string' ? JSON.parse(reunion.organizador) : reunion.organizador;
        orgName = parsedOrg?.name || orgName;
        orgEmail = parsedOrg?.email || '';
      } catch (e) {}
    }

    const rowOwner = (usuarios || []).find(u => Number(u.id) === Number(reunion.ejecutiva_id));

    const asistentesHtml = asistentesList.length > 0 
      ? `<ul style="margin: 4px 0 0 0; padding-left: 20px; text-align: left; font-size: 13px;">
          ${asistentesList.map(a => `
            <li style="margin-bottom: 4px;">
              <strong>${a.name || a.email}</strong> ${a.email && a.name ? `(${a.email})` : ''} 
              <span style="font-size: 11px; padding: 2px 6px; border-radius: 10px; margin-left: 6px; background: ${
                a.response === 'accepted' ? '#dcfce7; color: #166534;' :
                a.response === 'declined' ? '#fee2e2; color: #991b1b;' :
                '#f1f5f9; color: #475569;'
              }">
                ${a.response === 'accepted' ? 'Aceptado' : a.response === 'declined' ? 'Rechazado' : 'Sin respuesta'}
              </span>
            </li>
          `).join('')}
         </ul>`
      : '<span style="color: #94a3b8; font-style: italic;">Sin asistentes detectados</span>';

    Swal.fire({
      title: reunion.asunto_teams || reunion.motivo_reu || 'Detalle de Reunión Interna',
      html: `
        <div style="text-align: left; max-height: 65vh; overflow-y: auto; padding: 12px; font-size: 13px; line-height: 1.6; color: #1e293b; font-family: sans-serif;">
          <div style="margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
            <div style="margin-bottom: 6px;"><strong>Fecha:</strong> ${new Date(reunion.fecha_reu).toLocaleDateString("es-CL", { timeZone: "UTC" })}</div>
            <div style="margin-bottom: 6px;"><strong>Hora:</strong> ${reunion.hora ? reunion.hora.substring(0, 5) : 'No especificada'}</div>
            <div style="margin-bottom: 6px;"><strong>Ejecutivo Responsable:</strong> ${rowOwner?.nombre || 'No asignado'}</div>
            <div style="margin-bottom: 6px;"><strong>Organizador Teams:</strong> ${orgName || 'Desconocido'} ${orgEmail ? `(${orgEmail})` : ''}</div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 6px; font-size: 14px; color: #334155;">Asistentes de la reunión:</strong>
            ${asistentesHtml}
          </div>

          ${reunion.body_preview ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
              <strong style="display: block; margin-bottom: 6px; color: #334155;">Descripción/Preview:</strong>
              <div style="white-space: pre-wrap; font-size: 12.5px; color: #475569;">${reunion.body_preview}</div>
            </div>
          ` : ''}
        </div>
      `,
      width: '650px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#1e293b',
    });
  };

  const handleAsignarEmpresa = async () => {
    if (clasificacion === 'empresa' && !selectedEmpresaId) {
      Swal.fire("Atención", "Debes seleccionar una empresa o elegir otra clasificación.", "warning");
      return;
    }
    try {
      Swal.fire({
        title: 'Procesando...',
        text: 'Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const realId = selectedOrphan.teams_evento_id ||
        (typeof selectedOrphanId === 'string' && selectedOrphanId.startsWith('huerfana-')
          ? selectedOrphanId.replace('huerfana-', '')
          : selectedOrphanId);

      let result;
      if (clasificacion === 'excluida') {
        result = await marcarExcluida(realId);
      } else if (clasificacion === 'proforma') {
        result = await marcarProforma(realId);
      } else {
        result = await vincularHuerfana(realId, selectedEmpresaId, selectedDomains);
      }

      Swal.fire("Éxito", result?.data?.message || "Clasificación aplicada correctamente.", "success");
      setIsAssignModalOpen(false);
      setSelectedOrphanId(null);
      setSelectedOrphan(null);
      setSelectedEmpresaId("");
      setSearchEmpresa("");
      setNoAplicaEmpresa(false);
      setClasificacion('empresa');
      refetch();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo aplicar la clasificación", "error");
    }
  };

  const [filtroMacroZona, setFiltroMacroZona] = useState(() => sessionStorage.getItem('reuniones_macro') || "Todas");
  const [filtroJefatura, setFiltroJefatura] = useState(() => sessionStorage.getItem('reuniones_jefatura') || "");
  const [filtroEmpresa, setFiltroEmpresa] = useState(() => sessionStorage.getItem('reuniones_empresa') || "Todas");
  const [filtroTipo, setFiltroTipo] = useState(() => sessionStorage.getItem('reuniones_tipo') || "Todas");
  const [filtroEstado, setFiltroEstado] = useState(() => sessionStorage.getItem('reuniones_estado') || "Todos");
  const [activeTab, setActiveTab] = useState("clientes");
  const [filtroPeriodo, setFiltroPeriodo] = useState(() => sessionStorage.getItem('reuniones_periodo') || `anio-${new Date().getFullYear()}`);

  // Dominios internos Proforma
  const PROFORMA_DOMAINS = ['@proforma.cl', '@oticproforma.cl'];

  useEffect(() => {
    sessionStorage.setItem('reuniones_macro', filtroMacroZona);
    sessionStorage.setItem('reuniones_jefatura', filtroJefatura);
    sessionStorage.setItem('reuniones_empresa', filtroEmpresa);
    sessionStorage.setItem('reuniones_tipo', filtroTipo);
    sessionStorage.setItem('reuniones_estado', filtroEstado);
    sessionStorage.setItem('reuniones_periodo', filtroPeriodo);
  }, [filtroMacroZona, filtroJefatura, filtroEmpresa, filtroTipo, filtroEstado, filtroPeriodo]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const periodoOptions = useMemo(() => buildPeriodoOptions(), []);

  // Paginación
  const [currentPage, setCurrentPage] = useState(() => Number(sessionStorage.getItem('reuniones_page')) || 1);

  useEffect(() => {
    sessionStorage.setItem('reuniones_page', currentPage);
  }, [currentPage]);
  const itemsPerPage = 6;

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

  const baseFilteredReuniones = useMemo(() => {
    const result = reuniones.filter((r) => {
      const isHuerfana = Boolean(r.is_huerfana);
      // Para roles ejecutiva/jefatura el backend ya filtra por usuario_id, así que las reuniones
      // propias siempre deben mostrarse aunque la empresa no esté en empresasPorJefatura
      // (puede ocurrir cuando hay datos de empresa incompletos en el entorno).
      const esRolRestringido = userRol === 'ejecutiva' || userRol === 'jefatura';
      // Usar Number() para evitar type mismatch: la BD devuelve número pero localStorage puede devolver string
      const esReunionPropia = esRolRestringido && Number(r.ejecutiva_id) === Number(user?.id);
      
      // Helper function to extract emails from string or JSON
      const extractEmails = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val.map(e => {
            if (typeof e === 'string') return e.trim();
            if (e && typeof e === 'object') return (e.email || '').trim();
            return '';
          }).filter(e => e.includes("@"));
        }
        if (typeof val === 'object') {
          return val.email ? [val.email.trim()] : [];
        }
        if (typeof val !== "string") return [];
        const trimmed = val.trim();
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed.map(e => {
                if (typeof e === 'string') return e.trim();
                if (e && typeof e === 'object') return (e.email || '').trim();
                return '';
              }).filter(e => e.includes("@"));
            } else if (parsed && typeof parsed === 'object') {
              return parsed.email ? [parsed.email.trim()] : [];
            }
          } catch (e) {}
        }
        const matches = val.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g);
        return matches ? matches.map(e => e.trim()) : [];
      };

      const emailsEnviadoA = extractEmails(r.enviado_a);
      const emailsCc = extractEmails(r.correos_cc);
      const emailsAsistentes = extractEmails(r.asistentes);
      const allEmails = [...emailsEnviadoA, ...emailsCc, ...emailsAsistentes];

      // --- CLASIFICACIÓN PRINCIPAL ---
      const PROFORMA_DOMAINS = ['@proforma.cl', '@oticproforma.cl'];

      // Excluida: estado raw del evento
      const isExcluida = r.estado_teams === 'excluida';

      // Proforma: TODOS los emails son de dominio Proforma
      const isProforma = (
        r.empresa_nombre === "PROFORMA INTERNA"
        || r.tipo_reu === "Reunión Interna Proforma"
        || (allEmails.length > 0 && allEmails.every(email =>
            PROFORMA_DOMAINS.some(d => email.toLowerCase().endsWith(d))
          ))
      );

      r._isProforma = isProforma;
      r._isExcluida = isExcluida;

      if (isProforma) {
        r.is_huerfana = false;
        if (r.estado_envio === "huerfana") {
          r.estado_envio = "borrador";
        }
      }

      
      // Helper to get local date to avoid timezone shift
      const getLocalDate = (val) => {
        if (!val) return new Date();
        let dateObj;
        if (val instanceof Date) {
          dateObj = val;
        } else if (typeof val === 'string') {
          const cleanStr = val.substring(0, 10);
          const parts = cleanStr.split('-');
          if (parts.length === 3) {
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          }
          dateObj = new Date(val);
        } else {
          dateObj = new Date(val);
        }
        if (isNaN(dateObj.getTime())) return new Date();
        return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const meetingDate = getLocalDate(r.fecha_reu);
      meetingDate.setHours(0, 0, 0, 0);

      const isFuture = meetingDate >= today;

      // Tab filters logic
      if (activeTab === "internas" || activeTab === "proforma") {
        if (!isProforma) return false;
        if (isExcluida) return false;
      }
      if (activeTab === "clientes") {
        if (isProforma || isExcluida) return false;
        const isUpcoming = isFuture && r.estado_envio !== "enviado";
        if (isUpcoming || r.estado_envio === "cancelada") return false;
      }
      if (activeTab === "proximas") {
        if (isProforma || isExcluida) return false;
        const isUpcoming = (isFuture && r.estado_envio !== "enviado") || r.estado_envio === "agendada";
        if (!isUpcoming) return false;
      }
      if (activeTab === "excluidas") {
        if (!isExcluida) return false;
      }
      if (activeTab === "todas") {
        // Todas las reuniones pasadas: clientes + proforma + excluidas, sin próximas ni canceladas
        if (r.estado_envio === "cancelada") return false;
        const isUpcoming = isFuture && r.estado_envio !== "enviado" && r.estado_envio !== "agendada";
        if (isUpcoming) return false;
      }

      const owner = (usuarios || []).find(u => Number(u.id) === Number(r.ejecutiva_id));
      const ownerJefaturaId = owner?.jefatura_id || owner?.id; 

      let pasaMacroYJef = false;
      if (isProforma || esReunionPropia) {
        pasaMacroYJef = true;
      } else if (isHuerfana) {
        if (filtroJefatura !== "") {
          pasaMacroYJef = Number(ownerJefaturaId) === Number(filtroJefatura);
        } else {
          pasaMacroYJef = true;
        }
      } else {
        pasaMacroYJef = empresasPorJefatura.some(emp => emp.id === r.empresa_id);
      }
      const pasaEmpresa = filtroEmpresa === "Todas" || r.empresa_nombre === filtroEmpresa || (isHuerfana && filtroEmpresa === "Todas");
      const pasaTipo = filtroTipo === "Todas" || r.tipo_reu === filtroTipo || (isHuerfana && filtroTipo === "Todas");

      let pasaPeriodo = true;
      if (r.fecha_reu) {
        const d = new Date(r.fecha_reu);
        const rYear = d.getUTCFullYear();
        const rMonth = String(d.getUTCMonth() + 1).padStart(2, "0");
        
        if (filtroPeriodo.startsWith("anio-")) {
          const anioSeleccionado = Number(filtroPeriodo.replace("anio-", ""));
          pasaPeriodo = rYear === anioSeleccionado;
        } else {
          // Formato YYYY-MM
          const [fYear, fMonth] = filtroPeriodo.split("-");
          pasaPeriodo = rYear === Number(fYear) && rMonth === fMonth;
        }
      }

      let pasaEstado = true;
      if (filtroEstado === "Pendientes de Vincular") {
        pasaEstado = isHuerfana;
      } else if (filtroEstado === "Vinculadas") {
        pasaEstado = !isHuerfana;
      }

      return pasaMacroYJef && pasaEmpresa && pasaTipo && pasaPeriodo && pasaEstado;
    });

    // Deduplicate meetings that represent the same event (same date, same company, same subject)
    // Combine executive names if they attended the same meeting
    const uniqueMeetingsMap = new Map();
    
    for (const r of result) {
      const d = r.fecha_reu ? r.fecha_reu.substring(0, 10) : "";
      const asunto = r.asunto_teams || r.tipo_reu || "";
      const empresa = r.empresa_id || r.empresa_nombre || "";
      
      const key = `${d}_${asunto}_${empresa}`;
      
      if (uniqueMeetingsMap.has(key)) {
        const existing = uniqueMeetingsMap.get(key);
        // Combine executive names if different
        if (r.ejecutiva_nombre && existing.ejecutiva_nombre && !existing.ejecutiva_nombre.includes(r.ejecutiva_nombre)) {
          existing.ejecutiva_nombre = `${existing.ejecutiva_nombre}, ${r.ejecutiva_nombre}`;
        }
      } else {
        // Clone to avoid mutating original state if needed, though we only mutate ejecutiva_nombre
        uniqueMeetingsMap.set(key, { ...r });
      }
    }

    return Array.from(uniqueMeetingsMap.values()).sort((a, b) => {
      const getParsedDate = (item) => {
        if (!item.fecha_reu) return new Date(0);
        const datePart = typeof item.fecha_reu === "string" ? item.fecha_reu.substring(0, 10) : new Date(item.fecha_reu).toISOString().substring(0, 10);
        const timePart = item.hora || "00:00:00";
        return new Date(`${datePart}T${timePart}`);
      };

      const dateTimeA = getParsedDate(a);
      const dateTimeB = getParsedDate(b);

      if (activeTab === "proximas") {
        return dateTimeA - dateTimeB; // Ascending: closest first
      }
      return dateTimeB - dateTimeA; // Descending: newest/most recent first
    });
  }, [
    reuniones,
    filtroMacroZona,
    filtroJefatura,
    filtroEmpresa,
    filtroTipo,
    filtroPeriodo,
    filtroEstado,
    activeTab,
    userRol,
    user,
    usuarios,
    empresasPorJefatura
  ]);

  const [filtroKpi, setFiltroKpi] = useState(null); // null | 'presenciales' | 'online' | 'este_mes' | 'historico'

  const filteredReuniones = useMemo(() => {
    if (!filtroKpi) return baseFilteredReuniones;
    return baseFilteredReuniones.filter(r => {
      if (filtroKpi === 'presenciales') {
        return r.lugar === "Presencial" || Number(r.es_online) === 0;
      }
      if (filtroKpi === 'online') {
        return r.lugar !== "Presencial" && Number(r.es_online) !== 0;
      }
      if (filtroKpi === 'este_mes') {
        const d = new Date(r.fecha_reu);
        const now = new Date();
        return (
          d.getUTCMonth() === now.getMonth() &&
          d.getUTCFullYear() === now.getFullYear() &&
          r.estado_envio !== 'agendada' && 
          r.estado_envio !== 'no_aplica' && 
          r.estado_envio !== 'cancelada' &&
          !r.is_huerfana
        );
      }
      if (filtroKpi === 'historico') {
        return r.estado_envio !== 'agendada' && 
               r.estado_envio !== 'no_aplica' && 
               r.estado_envio !== 'cancelada' &&
               !r.is_huerfana;
      }
      return true;
    });
  }, [baseFilteredReuniones, filtroKpi]);

  const huerfanasCount = useMemo(() => {
    return reuniones.filter(r => {
      const isOwn = userRol !== 'ejecutiva' || r.ejecutiva_id === user?.id;
      return r.is_huerfana && r.estado_envio !== "no_aplica" && r.estado_envio !== "cancelada" && isOwn;
    }).length;
  }, [reuniones, userRol, user]);

  // Reiniciar página a 1 cuando cambien los filtros
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
    setFiltroKpi(null); // Reset KPI card filter when general filters change
  }, [filtroMacroZona, filtroJefatura, filtroEmpresa, filtroTipo, filtroPeriodo, filtroEstado, activeTab]);

  // 🔹 CÁLCULO DE DATOS DE REUNIONES ÚNICAS
  const realizedReuniones = useMemo(() => {
    return baseFilteredReuniones.filter(r => 
      r.estado_envio !== 'agendada' && 
      r.estado_envio !== 'no_aplica' && 
      r.estado_envio !== 'cancelada' &&
      !r.is_huerfana
    );
  }, [baseFilteredReuniones]);

  const excluidasOSinEmpresaCount = useMemo(() => {
    return baseFilteredReuniones.filter(r => r.estado_envio === 'no_aplica' || r.is_huerfana).length;
  }, [baseFilteredReuniones]);

  const minutasEnviadasCount = useMemo(() => {
    return realizedReuniones.filter(r => r.estado_envio === 'enviado').length;
  }, [realizedReuniones]);

  const reunionesEsteMes = useMemo(() => {
    return realizedReuniones.filter((r) => {
      const d = new Date(r.fecha_reu);
      const now = new Date();
      return (
        d.getUTCMonth() === now.getMonth() &&
        d.getUTCFullYear() === now.getFullYear()
      );
    });
  }, [realizedReuniones]);

  const empresasUnicasEsteMes = useMemo(() => new Set(reunionesEsteMes.map((r) => r.empresa_id)).size, [reunionesEsteMes]);
  const empresasUnicasTotal = useMemo(() => new Set(realizedReuniones.map((r) => r.empresa_id)).size, [realizedReuniones]);

  // 🔹 CÁLCULO DE DATOS PARA GRÁFICOS DINÁMICOS

  // 1. Gráfico de Barras: Cantidad por Tipo
  const barData = useMemo(() => {
    return Object.entries(
      realizedReuniones.reduce((acc, r) => {
        acc[r.tipo_reu] = (acc[r.tipo_reu] || 0) + 1;
        return acc;
      }, {}),
    ).map(([name, total]) => ({ name, total }));
  }, [realizedReuniones]);

  // 2. Gráfico de Líneas: Evolución por Fecha y Tipo
  const timelineMap = useMemo(() => {
    return realizedReuniones.reduce((acc, r) => {
      const date = new Date(r.fecha_reu).toISOString().split("T")[0];
      if (!acc[date]) acc[date] = {};
      acc[date][r.tipo_reu] = (acc[date][r.tipo_reu] || 0) + 1;
      return acc;
    }, {});
  }, [realizedReuniones]);

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
    const counts = realizedReuniones.reduce((acc, r) => {
      const nombre = r.empresa_nombre || "Desconocida";
      acc[nombre] = (acc[nombre] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [realizedReuniones]);

  const handleExport = () => {
    const dataToExport = filteredReuniones.map((r) => ({
      ID: r.id_reunion,
      Fecha: new Date(r.fecha_reu).toLocaleDateString("es-CL", { timeZone: "UTC" }),
      Hora: r.hora,
      Tipo: r.tipo_reu,
      Motivo: r.motivo_reu,
      Empresa: r.empresa_nombre,
      "Usuario Creador": r.ejecutiva_nombre,
      "Jefatura Responsable": r.jefatura_nombre,
      Modalidad: r.lugar === "Presencial" || Number(r.es_online) === 0 ? "Presencial" : (r.lugar || "Online"),
      Participantes: r.participantes,
      "Estado Minuta": r.estado_envio,
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
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading && reuniones.length === 0)
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

        {huerfanasCount > 0 && (
          <div style={{
            background: "#fef2f2",
            borderLeft: "4px solid #ef4444",
            padding: "16px",
            marginBottom: "30px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, color: "#991b1b", fontSize: "16px", fontWeight: "bold" }}>
                  Reuniones sin clasificar detectadas
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "#b91c1c", fontSize: "14px" }}>
                  Tienes <strong>{huerfanasCount}</strong> {huerfanasCount === 1 ? "reunión" : "reuniones"} pendiente{huerfanasCount === 1 ? "" : "s"} de asignar a una empresa. Búscalas en la tabla inferior y presiona "Sin empresa asignada" para vincularlas.
                </p>
              </div>
            </div>
          </div>
        )}

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Filtros
            </h3>
            {/* Botón Limpiar Filtros */}
            <button 
              onClick={() => {
                setFiltroMacroZona("Todas");
                setFiltroJefatura("");
                setFiltroEmpresa("Todas");
                setFiltroTipo("Todas");
                setFiltroEstado("Todos");
                setFiltroPeriodo(`anio-${new Date().getFullYear()}`);
                setCurrentPage(1);
                sessionStorage.removeItem('reuniones_macro');
                sessionStorage.removeItem('reuniones_jefatura');
                sessionStorage.removeItem('reuniones_empresa');
                sessionStorage.removeItem('reuniones_tipo');
                sessionStorage.removeItem('reuniones_estado');
                sessionStorage.removeItem('reuniones_periodo');
                sessionStorage.removeItem('reuniones_page');
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "6px",
                transition: "all 0.2s",
                fontWeight: "500"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#f1f5f9";
                e.currentTarget.style.color = "#334155";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#64748b";
              }}
              title="Limpiar todos los filtros"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Limpiar filtros
            </button>
          </div>
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
                  isHighlighted={filtroMacroZona !== "Todas"}
                />
              </div>
            )}

            {/* Seleccionar Jefatura */}
            {mostrarFiltroJefatura && (
              <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
                <SearchableFilter 
                  label="Agenda / Cartera (Jefatura)"
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
                  isHighlighted={filtroJefatura !== ""}
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
                isHighlighted={filtroTipo !== "Todas"}
              />
            </div>

            {/* Seleccionar Período */}
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <label style={{ 
                display: "block", 
                fontSize: "11px", 
                fontWeight: "bold", 
                color: "var(--text-muted)", 
                textTransform: "uppercase",
                marginBottom: "6px"
              }}>
                Seleccionar Período
              </label>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                style={{
                  width: "100%",
                  height: "41.5px",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  color: filtroPeriodo !== `anio-${new Date().getFullYear()}` ? "var(--primary-color)" : "#334155",
                  fontWeight: filtroPeriodo !== `anio-${new Date().getFullYear()}` ? "bold" : "normal",
                  background: filtroPeriodo !== `anio-${new Date().getFullYear()}` ? "#eff6ff" : "var(--bg-container)",
                  border: filtroPeriodo !== `anio-${new Date().getFullYear()}` ? "1.5px solid #60a5fa" : "1.5px solid #e2e8f0",
                  transition: "border-color 0.2s, background 0.2s"
                }}
              >
                {periodoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <SearchableFilter 
                label="Estado"
                value={filtroEstado}
                options={["Todos", "Pendientes de Vincular", "Vinculadas"]}
                onChange={(val) => setFiltroEstado(val || "Todos")}
                placeholder="Seleccionar..."
                isHighlighted={filtroEstado !== "Todos"}
              />
            </div>

            {/* Buscar Empresa */}
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <SearchableFilter 
                label="Buscar Empresa"
                value={filtroEmpresa}
                options={optionsEmpresas}
                onChange={(val) => setFiltroEmpresa(val)}
                placeholder="Escribe para buscar..."
                isHighlighted={filtroEmpresa !== "Todas"}
              />
            </div>
          </div>
        </div>

        {/* --- KPI CARDS --- */}
        <div className="responsive-grid-4" style={{ marginBottom: "30px" }}>
          <KpiCard
            title="Total Histórico"
            value={realizedReuniones.length}
            sub="Reuniones filtradas"
            color="#4338ca" // Deep Indigo
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>}
            onClick={() => { setCurrentPage(1); setFiltroKpi(prev => prev === 'historico' ? null : 'historico'); }}
            isSelected={filtroKpi === 'historico'}
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
              realizedReuniones.filter((r) => r.lugar === "Presencial" || Number(r.es_online) === 0).length
            }
            sub="Modalidad física"
            color="#0891b2" // Teal/Cyan
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>}
            onClick={() => { setCurrentPage(1); setFiltroKpi(prev => prev === 'presenciales' ? null : 'presenciales'); }}
            isSelected={filtroKpi === 'presenciales'}
          />
          <KpiCard
            title="Reuniones Online"
            value={
              realizedReuniones.filter((r) => r.lugar !== "Presencial" && Number(r.es_online) !== 0).length
            }
            sub="Modalidad remota"
            color="#9333ea" // Purple
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><circle cx="12" cy="12" r="10"/></svg>}
            onClick={() => { setCurrentPage(1); setFiltroKpi(prev => prev === 'online' ? null : 'online'); }}
            isSelected={filtroKpi === 'online'}
          />
          <KpiCard
            title="Este Mes (Total)"
            value={reunionesEsteMes.length}
            sub="Actividad mensual"
            color="#e11d48" // Rose/Pink
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            onClick={() => { setCurrentPage(1); setFiltroKpi(prev => prev === 'este_mes' ? null : 'este_mes'); }}
            isSelected={filtroKpi === 'este_mes'}
          />
          <KpiCard
            title="Este Mes (Únicas)"
            value={empresasUnicasEsteMes}
            sub="Empresas reunidas"
            color="#10b981" // Emerald Green
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          />
          <KpiCard
            title="Excluidas / Sin Empresa"
            value={excluidasOSinEmpresaCount}
            sub="No contabilizadas"
            color="#ef4444" // Red
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          />
          <KpiCard
            title="Minutas Enviadas"
            value={minutasEnviadasCount}
            sub="Reuniones con minuta"
            color="#14b8a6" // Teal
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
          />
        </div>

        {/* TABS PARA GRAFICOS EN MOBILE */}
        <div className="charts-mobile-tabs" style={{ display: 'none' }}>
          <div 
            className={`chart-mobile-tab ${activeMobileChart === 'pie' ? 'active-tab' : ''}`}
            onClick={() => setActiveMobileChart('pie')}
          >
            Tipos
          </div>
          <div 
            className={`chart-mobile-tab ${activeMobileChart === 'bar' ? 'active-tab' : ''}`}
            onClick={() => setActiveMobileChart('bar')}
          >
            Empresas
          </div>
          <div 
            className={`chart-mobile-tab ${activeMobileChart === 'line' ? 'active-tab' : ''}`}
            onClick={() => setActiveMobileChart('line')}
          >
            Evolución
          </div>
        </div>

        {/* --- CHARTS (SIDE BY SIDE SEGÚN MOCKUP) --- */}
        <div className={`dashboard-charts-container mobile-active-${activeMobileChart}`}>
          <div className="responsive-grid-2 chart-grid-top" style={{ marginBottom: "30px" }}>
            <div className="chart-wrapper chart-pie"
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

          <div className="chart-wrapper chart-bar" style={{ ...styles.chartBox, padding: 0, overflow: "hidden" }}>
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
        <div className="chart-wrapper chart-line" style={{ ...styles.chartBox, padding: 0, overflow: "hidden", marginBottom: "30px", border: "1px solid #e2e8f0" }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                Historial de Reuniones
              </h3>
              
              {/* Opciones de filtro de pestaña integradas al lado del título */}
              <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>

                <button
                  onClick={() => { setActiveTab('clientes'); setCurrentPage(1); }}
                  style={{
                    padding: '4px 10px',
                    background: activeTab === 'clientes' ? 'var(--secondary-color)' : 'transparent',
                    color: activeTab === 'clientes' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: activeTab === 'clientes' ? 'bold' : '600',
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'clientes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🏢 Clientes
                </button>
                <button
                  onClick={() => { setActiveTab('proforma'); setCurrentPage(1); }}
                  style={{
                    padding: '4px 10px',
                    background: (activeTab === 'proforma' || activeTab === 'internas') ? '#1e293b' : 'transparent',
                    color: (activeTab === 'proforma' || activeTab === 'internas') ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: (activeTab === 'proforma' || activeTab === 'internas') ? 'bold' : '600',
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: (activeTab === 'proforma' || activeTab === 'internas') ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  👥 Proforma
                </button>
                <button
                  onClick={() => { setActiveTab('excluidas'); setCurrentPage(1); }}
                  style={{
                    padding: '4px 10px',
                    background: activeTab === 'excluidas' ? '#7c3aed' : 'transparent',
                    color: activeTab === 'excluidas' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: activeTab === 'excluidas' ? 'bold' : '600',
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'excluidas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🚫 Excluidas
                </button>
                <button
                  onClick={() => { setActiveTab('proximas'); setCurrentPage(1); }}
                  style={{
                    padding: '4px 10px',
                    background: activeTab === 'proximas' ? '#0284c7' : 'transparent',
                    color: activeTab === 'proximas' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: activeTab === 'proximas' ? 'bold' : '600',
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'proximas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  📅 Próximas
                </button>
                <button
                  onClick={() => { setActiveTab('todas'); setCurrentPage(1); }}
                  style={{
                    padding: '4px 10px',
                    background: activeTab === 'todas' ? '#475569' : 'transparent',
                    color: activeTab === 'todas' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: activeTab === 'todas' ? 'bold' : '600',
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'todas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  📋 Todas
                </button>

              </div>
            </div>
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
            <table style={{ ...styles.table, tableLayout: "fixed", minWidth: "1100px" }}>
              <thead>
                <tr style={styles.th}>
                  <th style={{...styles.thCell, width: "13%"}}>AGENDA</th>
                  <th style={{...styles.thCell, width: "9%"}}>FECHA / ID</th>
                  <th style={{...styles.thCell, width: "20%"}}>EMPRESA</th>
                  <th style={{...styles.thCell, width: "24%"}}>TIPO / MOTIVO</th>
                  <th style={{...styles.thCell, width: "17%", textAlign: "center"}}>MINUTA</th>
                  <th style={{...styles.thCell, width: "9%"}}>FECHA DE ENVÍO</th>
                  <th style={{...styles.thCell, width: "8%"}}>ADJUNTOS</th>
                </tr>
              </thead>
              <tbody>
                {currentReuniones.map((r, index) => {
                  const isLastRows = index >= currentReuniones.length - 1 || (index >= currentReuniones.length - 2 && index > 0);
                  const adjuntos = r.archivos_nombres
                    ? JSON.parse(r.archivos_nombres)
                    : [];
                  
                  const rowOwner = (usuarios || []).find(u => Number(u.id) === Number(r.ejecutiva_id));
                  const rowJefaturaName = rowOwner?.jefatura_nombre || (rowOwner?.permisos === 'jefatura' || rowOwner?.permisos === 'gerencia' ? rowOwner?.nombre : "Sin equipo");

                  return (
                    <tr key={r.id_reunion} style={styles.tr}>
                      <td style={styles.tdCell}>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }} title={`Equipo: ${rowJefaturaName}`}>
                          👥 {rowJefaturaName}
                        </div>
                        {rowOwner?.nombre && (
                          <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }} title={`Ejecutivo: ${rowOwner.nombre}`}>
                            👤 {rowOwner.nombre}
                          </div>
                        )}
                      </td>
                      <td style={styles.tdCell}>
                        <div style={{ ...styles.companyName, whiteSpace: "nowrap" }}>
                          {new Date(r.fecha_reu).toLocaleDateString("es-CL", { timeZone: "UTC" })}
                        </div>
                        <div style={{ ...styles.meetingIdText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }} title={r.id_reunion}>
                          {r.id_reunion.length > 25 ? "En Teams" : r.id_reunion}
                        </div>
                      </td>
                      <td style={styles.tdCell}>
                        {r.is_huerfana ? (
                          <div 
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              padding: "4px 8px", background: "#dbeafe", color: "#1e40af",
                              borderRadius: "4px", fontSize: "11px", fontWeight: "bold",
                              cursor: "pointer", border: "1px solid #bfdbfe", transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#bfdbfe"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#dbeafe"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrphan(r);
                              setSelectedOrphanId(r.id_reunion);
                              setSearchEmpresa("");
                              setSelectedEmpresaId("");
                              setShowEmpresaDropdown(false);
                              setIsAssignModalOpen(true);
                            }}
                          >
                            🔗 Vincular Empresa
                          </div>
                        ) : (
                          <div 
                            style={{...styles.companyName, cursor: "pointer", textDecoration: "underline"}}
                            title="Modificar/Desvincular Empresa"
                            onClick={() => {
                              setSelectedOrphanId(r.id_reunion);
                              setSelectedOrphan(r);
                              setSearchEmpresa("");
                              setSelectedEmpresaId(r.empresa_id ? String(r.empresa_id) : "");
                              setShowEmpresaDropdown(false);
                              setNoAplicaEmpresa(false);
                              setIsAssignModalOpen(true);
                            }}
                          >
                            {r.empresa_nombre}
                          </div>
                        )}
                      </td>
                      <td style={styles.tdCell}>
                        <div 
                          style={{ fontWeight: "bold", color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" }}
                          title={r.asunto_teams || r.motivo_reu || 'Sin asunto'}
                        >
                          {r.asunto_teams || r.motivo_reu || 'Sin asunto'}
                        </div>
                        {(r.estado_envio === 'enviado' || r.estado_envio === 'programado') && (r.asunto_teams && r.asunto_teams !== r.motivo_reu) && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "250px",
                            }}
                            title={`${r.tipo_reu || ''} - ${r.motivo_reu || ''}`}
                          >
                            {r.tipo_reu ? `${r.tipo_reu} - ${r.motivo_reu}` : r.motivo_reu}
                          </div>
                        )}
                        {(r.estado_envio === 'enviado' || r.estado_envio === 'programado') && (!r.asunto_teams || r.asunto_teams === r.motivo_reu) && r.tipo_reu && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "250px",
                            }}
                            title={r.tipo_reu}
                          >
                            {r.tipo_reu}
                          </div>
                        )}
                      </td>
                      <td style={{...styles.tdCell, textAlign: "center"}}>
                        <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }} onMouseLeave={() => setOpenDropdownId(null)}>
                          {r.estado_envio === "huerfana" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                              <span style={{ color: "var(--text-muted)" }}>-</span>
                            </div>
                          ) : r._isProforma ? (
                            <div style={{ display: "flex", flexDirection: "row", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                              <div
                                onClick={() => handleVerDetalleProforma(r)}
                                style={{
                                  color: "#1e293b", fontWeight: "bold", cursor: "pointer", fontSize: "12px",
                                  background: "#e2e8f0", padding: "4px 8px", borderRadius: "4px",
                                  display: "inline-block", whiteSpace: "nowrap", transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#cbd5e1")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                                title="Ver Detalle de Reunión Interna"
                              >
                                🔍 Ver Detalle
                              </div>
                            </div>
                          ) : (r._isExcluida || r.estado_envio === "no_aplica") ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                              <span
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const isTeOnly = !r.minuta_row_id;
                                  handleMarcarNoAplica(r.id_reunion, isTeOnly, true); 
                                }}
                                style={{
                                  fontSize: "12px", color: "#3b82f6", cursor: "pointer", textDecoration: "underline",
                                  fontWeight: "600", padding: "4px 8px", borderRadius: "4px", background: "#eff6ff"
                                }}
                              >
                                Revertir
                              </span>
                            </div>

                          ) : r.estado_envio === "borrador" ? (
                            <div style={{ display: "flex", flexDirection: "row", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                              <div
                                onClick={() => navigate("/home", { state: { draft: r } })}
                                style={{
                                  color: "#854d0e", fontWeight: "bold", cursor: "pointer", fontSize: "12px",
                                  background: "#fef08a", padding: "4px 8px", borderRadius: "4px",
                                  display: "inline-block", whiteSpace: "nowrap", transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fde047")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#fef08a")}
                                title="Redactar Minuta"
                              >
                                ✍️ Pendiente de Minuta
                              </div>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const isTeOnly = !r.minuta_row_id;
                                  handleMarcarNoAplica(r.id_reunion, isTeOnly, false); 
                                }}
                                style={{
                                  background: "#fee2e2",
                                  color: "#ef4444",
                                  border: "none",
                                  borderRadius: "4px",
                                  width: "24px",
                                  height: "24px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  padding: 0,
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#fca5a5";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#fee2e2";
                                }}
                                title="No aplica enviar minuta"
                              >
                                ❌
                              </button>
                            </div>
                          ) : r.estado_envio === "agendada" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                              <div
                                onClick={() => navigate("/home", { state: { draft: r } })}
                                style={{
                                  color: "#1e40af", fontWeight: "bold", cursor: "pointer", fontSize: "12px",
                                  background: "#dbeafe", padding: "4px 8px", borderRadius: "4px",
                                  display: "inline-block", whiteSpace: "nowrap", transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#bfdbfe")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#dbeafe")}
                              >
                                🗓️ Agendada
                              </div>
                              <span
                                onClick={(e) => { e.stopPropagation(); handleMarcarNoAplica(r.id_reunion, false, false); }}
                                style={{
                                  fontSize: "10px", color: "#475569", cursor: "pointer", textDecoration: "underline",
                                  fontWeight: "600", padding: "2px 4px", borderRadius: "3px", background: "#f1f5f9"
                                }}
                              >🚫 No aplica</span>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                              <div
                                onClick={() => handleVerMinuta(r)}
                                style={{
                                  color: "#166534", fontWeight: "bold", cursor: "pointer",
                                  fontSize: "12px", background: "#dcfce7", padding: "4px 8px", borderRadius: "4px",
                                  display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", transition: "background 0.2s"
                                }}
                                title="Ver minuta"
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#bbf7d0")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#dcfce7")}
                              >
                                ✅ Minuta Enviada 📄
                              </div>
                              <span
                                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === r.id_reunion ? null : r.id_reunion); }}
                                style={{
                                  fontSize: "10px", color: "#475569", cursor: "pointer", textDecoration: "underline",
                                  fontWeight: "600", padding: "2px 4px", borderRadius: "3px", background: "#f1f5f9"
                                }}
                              >📧 Ver destinatarios</span>
                            </div>
                          )}

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

      {/* MODAL PARA ASIGNAR EMPRESA A REUNION HUERFANA */}
      {isAssignModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 1200,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "white", padding: "24px", borderRadius: "8px",
            width: "600px", maxWidth: "95%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxHeight: "90vh", display: "flex", flexDirection: "column"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px", color: "var(--primary-color)", flexShrink: 0 }}>Asignar Empresa</h3>
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
              {selectedOrphan && (
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "12px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#334155"
              }}>
                <div style={{ marginBottom: "6px" }}>
                  <strong>Reunión:</strong> {selectedOrphan.asunto_teams || selectedOrphan.motivo_reu || 'Sin asunto'}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <strong>Fecha:</strong> {new Date(selectedOrphan.fecha_reu).toLocaleDateString("es-CL", { timeZone: "UTC" })} {selectedOrphan.hora ? selectedOrphan.hora.substring(0, 5) : ''}
                </div>
                {externalAttendees.length > 0 ? (
                  <div>
                    <strong>Participantes:</strong>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px", maxHeight: "100px", overflowY: "auto", listStyleType: "disc" }}>
                      {externalAttendees.map((p, idx) => (
                        <li key={idx} style={{ fontSize: "12px", marginBottom: "2px" }}>
                          {p.name} {p.email ? `(${p.email})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div>
                    <strong>Participantes:</strong> Ninguno detectado
                  </div>
                )}
              </div>
            )}

            {/* --- Clasificación principal --- */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>
                Clasificar reunión como:
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                {/* Botón Proforma */}
                <button
                  onClick={() => { setClasificacion('proforma'); setSelectedEmpresaId(''); setSearchEmpresa(''); }}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    background: clasificacion === 'proforma' ? '#1e293b' : '#f8fafc',
                    color: clasificacion === 'proforma' ? 'white' : '#334155',
                    border: clasificacion === 'proforma' ? '2px solid #1e293b' : '2px solid #e2e8f0',
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "center"
                  }}
                >
                  👥 Reunión Proforma
                  <div style={{ fontSize: "10px", fontWeight: "400", marginTop: "2px", opacity: 0.8 }}>
                    Solo participantes internos
                  </div>
                </button>
                {/* Botón No Aplica / Excluida */}
                <button
                  onClick={() => { setClasificacion('excluida'); setSelectedEmpresaId(''); setSearchEmpresa(''); }}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    background: clasificacion === 'excluida' ? '#7c3aed' : '#f8fafc',
                    color: clasificacion === 'excluida' ? 'white' : '#334155',
                    border: clasificacion === 'excluida' ? '2px solid #7c3aed' : '2px solid #e2e8f0',
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "center"
                  }}
                >
                  🚫 No Aplica Empresa
                  <div style={{ fontSize: "10px", fontWeight: "400", marginTop: "2px", opacity: 0.8 }}>
                    Webinar, multi-empresa, etc.
                  </div>
                </button>
              </div>
            </div>

            {/* --- Separador "O asignar a empresa" --- */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
              <span
                style={{
                  fontSize: "11px", color: "#94a3b8", fontWeight: "600",
                  cursor: "pointer", padding: "4px 8px",
                  background: clasificacion === 'empresa' ? '#eff6ff' : 'transparent',
                  border: clasificacion === 'empresa' ? '1px solid #bfdbfe' : '1px solid transparent',
                  borderRadius: "4px", whiteSpace: "nowrap"
                }}
                onClick={() => setClasificacion('empresa')}
              >
                🏢 O asignar a una empresa
              </span>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            </div>

            {/* Dominios detectados (solo para empresa) */}
            {detectedDomains.length > 0 && clasificacion === 'empresa' && (
              <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
                  Asociar Dominios para Auto-vincular:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {detectedDomains.map((dom) => (
                    <label key={dom} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#334155", margin: 0, textTransform: "none" }}>
                      <input
                        type="checkbox"
                        checked={selectedDomains.includes(dom)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDomains(prev => [...prev, dom]);
                          } else {
                            setSelectedDomains(prev => prev.filter(x => x !== dom));
                          }
                        }}
                        style={{ width: "16px", height: "16px", accentColor: "var(--primary-color)", cursor: "pointer" }}
                      />
                      <span>{dom}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Buscador de empresa (solo activo si clasificacion === 'empresa') */}
            <div style={{ marginBottom: "20px", position: "relative", opacity: clasificacion !== 'empresa' ? 0.4 : 1, pointerEvents: clasificacion !== 'empresa' ? 'none' : 'auto' }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold", color: "#334155" }}>
                Empresa
              </label>
              <input
                type="text"
                placeholder={clasificacion !== 'empresa' ? "Selecciona la clasificación de arriba" : "Escribe para buscar empresa..."}
                value={searchEmpresa}
                disabled={clasificacion !== 'empresa'}
                onChange={(e) => {
                  setSearchEmpresa(e.target.value);
                  setSelectedEmpresaId("");
                  setShowEmpresaDropdown(true);
                }}
                onFocus={() => setShowEmpresaDropdown(true)}
                onBlur={() => setTimeout(() => setShowEmpresaDropdown(false), 200)}
                className="core360-input"
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-input)" }}
              />
              {showEmpresaDropdown && clasificacion === 'empresa' && (
                <div style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: "180px",
                  overflowY: "auto",
                  background: "#fff",
                  border: "2px solid #2563eb",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  zIndex: 10,
                  boxShadow: "0 -10px 25px rgba(37, 99, 235, 0.15), 0 -5px 12px rgba(0, 0, 0, 0.08)"
                }}>
                  {globalEmpresas.filter(emp => emp.nombre.toLowerCase().includes(searchEmpresa.toLowerCase())).length > 0 ? (
                    globalEmpresas.filter(emp => emp.nombre.toLowerCase().includes(searchEmpresa.toLowerCase())).map(emp => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmpresaId(emp.id);
                          setSearchEmpresa(emp.nombre);
                          setShowEmpresaDropdown(false);
                        }}
                        style={{
                          padding: "6px 10px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "12.5px",
                          lineHeight: "1.3",
                          backgroundColor: selectedEmpresaId === emp.id ? "#f1f5f9" : "transparent"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f8fafc"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = selectedEmpresaId === emp.id ? "#f1f5f9" : "transparent"}
                      >
                        {emp.nombre}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "8px 10px", color: "#64748b", fontSize: "12.5px" }}>
                      No se encontraron empresas.
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexShrink: 0, marginTop: "16px" }}>
              {selectedOrphan?.empresa_id && (
                <button
                  className="core360-btn"
                  style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", marginRight: "auto" }}
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    handleDesvincular(selectedOrphan);
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fecaca")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fee2e2")}
                >
                  Desvincular
                </button>
              )}
              <button
                className="core360-btn secondary"
                onClick={() => { setIsAssignModalOpen(false); setSelectedOrphanId(null); setSelectedOrphan(null); setSelectedEmpresaId(""); setSearchEmpresa(""); setShowEmpresaDropdown(false); setNoAplicaEmpresa(false); setClasificacion('empresa'); }}
              >
                Cancelar
              </button>
              <button
                className="core360-btn primary"
                onClick={handleAsignarEmpresa}
                disabled={clasificacion === 'empresa' && !selectedEmpresaId}
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
