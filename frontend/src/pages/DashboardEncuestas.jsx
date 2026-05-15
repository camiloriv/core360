import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import styles from "../styles/DashboardStyles";
import SearchableFilter from "../components/form/fields/SearchableFilter";
import KpiCard from "../components/dashboard/KpiCard";

// =============================================================================
// 🏗️ SUBCOMPONENTES (Modularización)
// =============================================================================

const FilterSection = ({ filters, options, onChange }) => (
  <div style={styles.filterPanel}>
    {/* 🔍 EMPRESA (Buscador) */}
    <SearchableFilter 
      label="Empresa"
      value={filters.empresa}
      options={options.empresas}
      onChange={(val) => onChange('empresa', val)}
      placeholder="Filtrar por empresa..."
    />

    {/* Otros filtros (Selects normales por ahora) */}
    {['jefatura', 'tipo', 'estado'].map(key => (
      <div key={key} style={styles.filterGroup}>
        <label style={styles.label}>{key === 'tipo' ? 'Tipo de Encuesta' : 'Jefatura'}</label>
        <select 
          style={styles.select} 
          value={filters[key]} 
          onChange={(e) => onChange(key, e.target.value)}
        >
          {options[key === 'tipo' ? 'tipos' : key + 's'].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    ))}
  </div>
);

const SurveyRow = ({ r, onToggleStatus, onResend, onShowDetail }) => (
  <tr style={{ ...styles.tr, opacity: r.activo === 0 ? 0.6 : 1 }}>
    <td style={styles.tdCell}>
      <strong>#{r.id}</strong>
      <div style={styles.surveyTypeBadge}>{r.titulo}</div>
      <div style={styles.meetingIdText}>REUNIÓN: {r.reunion_id || 'S/I'}</div>
    </td>
    <td style={styles.tdCell}>
      <div style={styles.dateCol}>
        <div><span style={styles.dateLabel}>ENVÍO:</span> {new Date(r.fecha_creacion).toLocaleDateString()}</div>
        <div><span style={styles.dateLabel}>RESP:</span> {r.fecha_respuesta ? new Date(r.fecha_respuesta).toLocaleDateString() : '---'}</div>
      </div>
    </td>
    <td style={styles.tdCell}>
      <div style={styles.companyName}>{r.empresa || 'N/A'}</div>
      <div style={styles.ejecutivaName}>{r.ejecutiva || 'N/A'}</div>
    </td>
    <td style={styles.tdCell}>
      <div style={{ marginTop: '5px' }}>
        <span style={{ 
          ...styles.statusBadge,
          background: r.activo === 0 ? '#fee2e2' : (r.estado === 'completada' ? '#dcfce7' : '#fef9c3'),
          color: r.activo === 0 ? '#991b1b' : (r.estado === 'completada' ? '#166534' : '#854d0e'),
        }}>
          {r.activo === 0 ? 'INACTIVA' : r.estado.toUpperCase()}
        </span>
      </div>
    </td>
    <td style={styles.tdCell}>
      <div style={styles.actionsCol}>
        {r.detalles?.length > 0 ? (
          <button onClick={() => onShowDetail(r)} style={styles.btnSecondary}>
            👁️ Ver Respuestas ({r.detalles.length})
          </button>
        ) : (
          <div style={styles.respuestasBox}>
            <div style={{ textAlign: 'center' }}>
              <span style={styles.noRespText}>
                Sin respuestas aún - <strong>{r.enviado_a || "Sin correo registrado"}</strong>
              </span>
            </div>
          </div>
        )}
        
        {r.estado === 'pendiente' && (
          <div style={styles.pendingActions}>
            <button 
              onClick={() => onToggleStatus(r.id, r.activo)}
              style={{ ...styles.btnAction, background: r.activo === 1 ? '#fee2e2' : '#dcfce7', color: r.activo === 1 ? '#991b1b' : '#166534' }}
            >
              {r.activo === 1 ? '🚫 Anular' : '✅ Activar'}
            </button>
            <button onClick={() => onResend(r)} style={{ ...styles.btnAction, background: '#dbeafe', color: '#1e40af' }}>
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
  const [respuestas, setRespuestas] = useState([]);
  const [programadas, setProgramadas] = useState([]);
  const [totalEnvios, setTotalEnvios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dimensionData, setDimensionData] = useState([]);
  const [rankingData, setRankingData] = useState([]);
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({ 
    empresa: "Todas", jefatura: "Todas", tipo: "Todas", estado: "Todas" 
  });

  const [options, setOptions] = useState({ 
    empresas: ["Todas"], jefaturas: ["Todas"], tipos: ["Todas"],
    estados: ["Todas", "Pendientes", "Respondidas", "Activas", "Inactivas"] 
  });

  // 🔹 Fetch inicial de datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [respRes, statsRes, kpiRes, reuniRes] = await Promise.all([
          axios.get("http://localhost:8080/encuestas/respuestas/all"),
          axios.get("http://localhost:8080/encuestas/stats/summary"),
          axios.get("http://localhost:8080/encuestas/stats/kpis"),
          axios.get("http://localhost:8080/reuniones")
        ]);
        
        const masterData = respRes.data.map(r => ({
          ...r,
          detalles: kpiRes.data.detalles.filter(d => d.encuesta_id === r.id)
        }));
        
        setRespuestas(masterData);
        setTotalEnvios(statsRes.data.total_envios);

        // Filtrar reuniones que tienen encuesta programada pendiente
        const prog = reuniRes.data.filter(r => r.programar_encuesta && r.encuesta_estado_envio === 'pendiente');
        setProgramadas(prog);
        
        // --- PROCESAMIENTO RADAR (Dimensiones) ---
        const radar = (kpiRes.data.dimensiones || []).map(dimObj => {
          const dimName = dimObj.nombre;
          const found = kpiRes.data.promedios.find(p => p.dimension === dimName);
          return {
            subject: dimName,
            A: found ? parseFloat(found.promedio) : 0,
            fullMark: 10
          };
        });

        setDimensionData(radar);
        
        setRankingData(kpiRes.data.ranking.map(r => ({ name: r.jefatura, nps: Math.round(r.promedio * 20) })));

        setOptions(prev => ({
          ...prev,
          empresas: ["Todas", ...new Set(respRes.data.map(r => r.empresa).filter(Boolean))],
          jefaturas: ["Todas", ...new Set(respRes.data.map(r => r.jefatura).filter(Boolean))],
          tipos: ["Todas", ...new Set(respRes.data.map(r => r.titulo).filter(Boolean))]
        }));
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔹 MEMOIZACIÓN: Filtrado y Estadísticas
  const { filteredTableData, availableEmpresas, stats } = useMemo(() => {
    // 1. Filtro base
    const baseFiltered = respuestas.filter(r => {
      return (filters.empresa === "Todas" || r.empresa === filters.empresa) &&
             (filters.jefatura === "Todas" || r.jefatura === filters.jefatura) &&
             (filters.tipo === "Todas" || r.titulo === filters.tipo);
    });

    // 2. Stats sobre base
    const creadas = baseFiltered.length;
    const respondidas = baseFiltered.filter(r => r.estado === 'completada').length;
    const pendientes = baseFiltered.filter(r => r.estado === 'pendiente' && r.activo === 1).length;
    const activas = baseFiltered.filter(r => r.activo === 1).length;
    const inactivas = baseFiltered.filter(r => r.activo === 0).length;

    let sumaValores = 0, countValores = 0;
    baseFiltered.forEach(f => f.detalles?.forEach(d => {
      if (d.valor_numerico) { sumaValores += parseFloat(d.valor_numerico); countValores++; }
    }));

    // 3. Filtro visual para la tabla
    const visualFiltered = baseFiltered.filter(r => {
      if (filters.estado === "Todas") return true;
      if (filters.estado === "Pendientes") return r.estado === "pendiente" && r.activo === 1;
      if (filters.estado === "Respondidas") return r.estado === "completada";
      if (filters.estado === "Activas") return r.activo === 1;
      if (filters.estado === "Inactivas") return r.activo === 0;
      return true;
    });

    // 4. Filtrado dinámico de opciones de empresa según Jefatura
    const empresasDisponibles = ["Todas", ...new Set(
      respuestas
        .filter(r => filters.jefatura === "Todas" || r.jefatura === filters.jefatura)
        .map(r => r.empresa)
        .filter(Boolean)
    )];

    return {
      filteredTableData: visualFiltered,
      availableEmpresas: empresasDisponibles,
      stats: { creadas, respondidas, pendientes, activas, inactivas, promedio: countValores > 0 ? (sumaValores / countValores).toFixed(1) : 0 }
    };
  }, [filters, respuestas]);

  // 🔹 Handlers
  const toggleActivo = async (id, currentStatus) => {
    try {
      await axios.patch("http://localhost:8080/encuestas/toggle-estado", { id, activo: !currentStatus });
      setRespuestas(prev => prev.map(r => r.id === id ? { ...r, activo: !currentStatus ? 1 : 0 } : r));
    } catch (err) { console.error(err); }
  };

  const handleReenviar = async (encuesta) => {
    const url = `${window.location.origin}/encuesta/${encuesta.token}`;
    const { value: result } = await Swal.fire({
      title: 'Gestión de Envío',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <label style="${styles.swalLabel}">Link de la encuesta:</label>
          <div style="display: flex; gap: 8px; margin-bottom: 20px;">
            <input id="swal-link" class="swal2-input" style="margin: 0; flex: 1; font-size: 12px;" value="${url}" readonly>
            <button id="swal-copy-btn" class="swal2-confirm swal2-styled" style="margin: 0; padding: 8px 15px; background: #3b82f6;">Copiar</button>
          </div>
          <label style="${styles.swalLabel}">Correo del destinatario:</label>
          <input id="swal-email" class="swal2-input" style="margin: 0; width: 100%;" type="email" value="${encuesta.enviado_a || ''}" placeholder="correo@empresa.com">
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Enviar Correo', cancelButtonText: 'Cerrar',
      didOpen: () => {
        const btn = document.getElementById('swal-copy-btn');
        btn.onclick = () => {
          const input = document.getElementById('swal-link');
          input.select(); document.execCommand('copy');
          btn.innerText = '¡Copiado!'; btn.style.background = '#10b981';
          setTimeout(() => { btn.innerText = 'Copiar'; btn.style.background = '#3b82f6'; }, 2000);
        };
      },
      preConfirm: () => {
        const email = document.getElementById('swal-email').value;
        if (!email) { Swal.showValidationMessage('Email requerido'); return false; }
        return email;
      }
    });

    if (result) {
      try {
        await axios.post("http://localhost:8080/encuestas/enviar-correo", { email: result, url, encuesta_id: encuesta.id });
        Swal.fire('¡Enviado!', 'Correo enviado correctamente.', 'success');
        setRespuestas(prev => prev.map(r => r.id === encuesta.id ? { ...r, enviado_a: result } : r));
      } catch (err) { Swal.fire('Error', 'No se pudo enviar.', 'error'); }
    }
  };

  const showRespuestasModal = (encuesta) => {
    const html = encuesta.detalles.map(d => `
      <div style="text-align: left; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
        <div style="font-weight: bold; color: #475569; font-size: 11px; line-height: 1.4;">${d.pregunta}</div>
        <div style="color: #1e3a8a; font-weight: bold; font-size: 13px; margin-top: 4px;">R: ${d.valor_texto || d.valor_numerico}</div>
      </div>
    `).join('');

    Swal.fire({
      title: `<span style="font-size: 18px;">Respuestas - ${encuesta.empresa || 'S/E'}</span>`,
      html: `<div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">${html}</div>`,
      confirmButtonText: 'Cerrar', confirmButtonColor: '#3b82f6', width: '500px'
    });
  };

  return (
    <div className="encuesta-page">
      <div className="container">
        <div style={{ marginBottom: '30px' }}>
          <h2 className="title" style={{ marginBottom: '5px' }}>Análisis Estratégico 360</h2>
          <p className="subtitle" style={{ marginTop: '0' }}>Resultados Dinámicos de Calidad y Satisfacción</p>
        </div>

        <FilterSection 
          filters={filters} 
          options={{ ...options, empresas: availableEmpresas }} 
          onChange={(k, v) => setFilters(p => {
            const newFilters = { ...p, [k]: v };
            // Reset empresa if Jefatura changes and current empresa is not in new list
            if (k === 'jefatura') newFilters.empresa = "Todas";
            return newFilters;
          })} 
        />

        <div style={styles.kpiGrid}>
          <KpiCard title="Creadas" value={stats.creadas} sub="Total" color="#1e3a8a" />
          <KpiCard title="Respondidas" value={stats.respondidas} sub="Completadas" color="#10b981" />
          <KpiCard title="Pendientes" value={stats.pendientes} sub="Por responder" color="#f59e0b" />
          <KpiCard title="Activas" value={stats.activas} sub="Links hábiles" color="#3b82f6" />
          <KpiCard title="Inactivas" value={stats.inactivas} sub="Links anulados" color="#ef4444" />
        </div>

        {loading ? <p>Cargando datos...</p> : (
          <>
            <div style={styles.chartsGrid}>
              <div style={styles.chartBox}>
                <h3 style={styles.sectionTitle}>Desempeño por Dimensión (DB)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dimensionData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{fontSize: 10}} />
                    <Radar name="Promedio" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartBox}>
                <h3 style={styles.sectionTitle}>Ranking NPS por Jefatura</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={rankingData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[-100, 100]} hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#475569', fontWeight: 'bold'}} width={90} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="nps" radius={[0, 4, 4, 0]} barSize={20}>
                      {rankingData.map((e, i) => (
                        <Cell key={i} fill={e.nps > 50 ? '#10b981' : e.nps > 0 ? '#3b82f6' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.tableCard}>
              <div style={styles.tableHeader}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#1e293b', textTransform: 'uppercase' }}>Detalle de Respuestas con Preguntas Reales</h3>
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
                    {filteredTableData.map(r => (
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
            <div style={{ ...styles.tableCard, marginTop: '40px', border: '1px solid #bae6fd', background: '#f0f9ff' }}>
              <div style={{ ...styles.tableHeader, background: '#e0f2fe' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#0369a1', textTransform: 'uppercase' }}>📅 Encuestas Programadas (Pendientes de Envío)</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                {programadas.length > 0 ? (
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
                      {programadas.map(p => (
                        <tr key={p.id} style={styles.tr}>
                          <td style={styles.tdCell}>
                            <div style={{ fontWeight: 'bold' }}>{p.id_reunion}</div>
                            <div style={{ fontSize: '11px', color: '#0369a1' }}>{p.encuesta_tipo}</div>
                          </td>
                          <td style={styles.tdCell}>
                            <div style={styles.companyName}>{p.empresa_nombre}</div>
                            <div style={styles.ejecutivaName}>{p.ejecutiva_nombre}</div>
                          </td>
                          <td style={styles.tdCell}>
                            <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{new Date(p.encuesta_programada_para).toLocaleString()}</div>
                          </td>
                          <td style={styles.tdCell}>
                            <span style={{ 
                              padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold',
                              background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc'
                            }}>
                              RELOJ DE ARENA / PENDIENTE
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No hay encuestas programadas para el futuro.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
