import React, { useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import "../styles/core360-theme.css";

// ─────────────────────────────────────────────────────────────────────
// AdminPanel — Herramientas de Sistema (solo rol: admin)
// Ruta: /admin
// ─────────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const user = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [loadingReset, setLoadingReset]         = useState(false);
  const [loadingDiag, setLoadingDiag]           = useState(false);
  const [loadingPasswords, setLoadingPasswords] = useState(false);
  const [diagnostico, setDiagnostico]           = useState(null);

  // ── RESET MEETING DATA ─────────────────────────────────────────────
  const handleResetMeetingData = async () => {
    const confirm = await Swal.fire({
      title: '⚠️ Limpieza total de reuniones',
      html: `
        <p style="margin-bottom:12px">Esta acción <strong>eliminará permanentemente</strong>:</p>
        <ul style="text-align:left;margin:0 auto;width:fit-content;line-height:1.8">
          <li>Todos los eventos en <code>teams_eventos</code></li>
          <li>Todas las minutas registradas</li>
          <li>El historial de seguimiento de empresas</li>
          <li>Las encuestas enviadas</li>
          <li>Los tokens de sincronización (se forzará sync completo)</li>
          <li>El estado de seguimiento de todas las empresas</li>
        </ul>
        <p style="margin-top:14px;color:#e74c3c;font-weight:600">¿Estás seguro? Esta acción no se puede deshacer.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, limpiar todo',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'swal2-popup-custom' }
    });

    if (!confirm.isConfirmed) return;

    // Segunda confirmación
    const confirm2 = await Swal.fire({
      title: 'Confirmación final',
      text: 'Escribe RESET para confirmar la limpieza',
      input: 'text',
      inputPlaceholder: 'RESET',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Confirmar',
      preConfirm: (value) => {
        if (value !== 'RESET') {
          Swal.showValidationMessage('Debes escribir exactamente: RESET');
        }
      }
    });

    if (!confirm2.isConfirmed) return;

    setLoadingReset(true);
    try {
      const { data } = await api.post('/admin/reset-meeting-data');
      await Swal.fire({
        title: '✅ Limpieza completada',
        html: `
          <p style="margin-bottom:12px">El sistema está en blanco y listo para sincronizar desde Teams.</p>
          <div style="text-align:left;background:#f8f9fa;padding:12px;border-radius:8px;font-size:13px">
            ${Object.entries(data.detalles || {}).map(([k, v]) =>
              `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #eee">
                <span style="color:#666">${k.replaceAll('_', ' ')}</span>
                <strong>${v}</strong>
              </div>`
            ).join('')}
          </div>
          <p style="margin-top:14px;color:#2ecc71;font-weight:600">
            Ahora ve a "Vincular Reuniones" y presiona "Sincronizar Calendario" para poblar desde Teams.
          </p>
        `,
        icon: 'success',
        confirmButtonColor: 'var(--secondary-color)',
      });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Error al ejecutar la limpieza', 'error');
    } finally {
      setLoadingReset(false);
    }
  };

  // ── DIAGNÓSTICO ────────────────────────────────────────────────────
  const handleDiagnostico = async () => {
    setLoadingDiag(true);
    setDiagnostico(null);
    try {
      const { data } = await api.get('/admin/diagnostico');
      setDiagnostico(data);
    } catch (err) {
      Swal.fire('Error', 'No se pudo obtener el diagnóstico', 'error');
    } finally {
      setLoadingDiag(false);
    }
  };

  // ── RESET PASSWORDS ────────────────────────────────────────────────
  const handleResetPasswords = async () => {
    const confirm = await Swal.fire({
      title: 'Resetear contraseñas',
      text: 'Se cambiará la contraseña de TODOS los usuarios a "123". ¿Continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e67e22',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, resetear',
    });

    if (!confirm.isConfirmed) return;

    setLoadingPasswords(true);
    try {
      const { data } = await api.post('/admin/reset-passwords');
      Swal.fire('✅ Listo', `Contraseñas reseteadas para ${data.usuariosAfectados} usuarios. La nueva contraseña es: 123`, 'success');
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Error al resetear contraseñas', 'error');
    } finally {
      setLoadingPasswords(false);
    }
  };

  // Guardar diagnóstico como JSON
  const descargarDiagnostico = () => {
    if (!diagnostico) return;
    const blob = new Blob([JSON.stringify(diagnostico, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-core360-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px', maxWidth: '960px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px', fontWeight: 700, color: 'var(--text-light)',
          margin: 0, display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ fontSize: '32px' }}>⚙️</span>
          Panel de Administración
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '14px' }}>
          Herramientas de sistema — solo visible para administradores
        </p>
      </div>

      {/* ── SECCIÓN: DATOS DE REUNIONES ───────────────────────────── */}
      <SectionCard
        icon="🔄"
        title="Datos de Reuniones"
        description="Gestión de la sincronización y datos de Microsoft Teams"
        color="#e74c3c"
      >
        <ToolRow
          icon="🗑️"
          title="Limpiar y reiniciar datos de reuniones"
          description="Elimina todos los eventos Teams, minutas, logs de seguimiento y encuestas. Resetea los tokens de sincronización para forzar una descarga completa desde Teams. Útil para empezar en blanco antes de la primera sincronización oficial."
          danger
          buttonLabel={loadingReset ? 'Limpiando...' : 'Ejecutar limpieza'}
          buttonDisabled={loadingReset}
          onAction={handleResetMeetingData}
          tag="DESTRUCTIVO"
        />
      </SectionCard>

      {/* ── SECCIÓN: USUARIOS ─────────────────────────────────────── */}
      <SectionCard
        icon="👥"
        title="Usuarios"
        description="Herramientas de gestión masiva de usuarios"
        color="#e67e22"
      >
        <ToolRow
          icon="🔑"
          title="Resetear contraseñas a '123'"
          description="Cambia la contraseña de TODOS los usuarios a '123'. Útil para pruebas o cuando un usuario olvida su clave. Cada usuario deberá cambiarla en su próximo inicio de sesión."
          buttonLabel={loadingPasswords ? 'Reseteando...' : 'Resetear contraseñas'}
          buttonDisabled={loadingPasswords}
          onAction={handleResetPasswords}
          tag="MASIVO"
        />
      </SectionCard>

      {/* ── SECCIÓN: DIAGNÓSTICO ──────────────────────────────────── */}
      <SectionCard
        icon="🩺"
        title="Diagnóstico del Sistema"
        description="Inspección del estado actual de la base de datos y sincronización"
        color="#3498db"
      >
        <ToolRow
          icon="📊"
          title="Ver estado de la BD"
          description="Muestra el conteo de eventos Teams, minutas, usuarios, sincronizaciones recientes, dominios aprendidos y estado de las empresas."
          buttonLabel={loadingDiag ? 'Cargando...' : 'Ejecutar diagnóstico'}
          buttonDisabled={loadingDiag}
          onAction={handleDiagnostico}
          tag="SEGURO"
        />

        {/* Resultado del diagnóstico */}
        {diagnostico && (
          <div style={{
            marginTop: '20px', background: 'var(--card-bg, #1a1a2e)',
            borderRadius: '10px', border: '1px solid var(--border-color, #2a2a4a)',
            overflow: 'hidden'
          }}>
            {/* Header resultado */}
            <div style={{
              padding: '12px 16px', background: 'rgba(52,152,219,0.15)',
              borderBottom: '1px solid var(--border-color, #2a2a4a)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '13px' }}>
                📋 Resultado del diagnóstico — {new Date().toLocaleString('es-CL')}
              </span>
              <button
                onClick={descargarDiagnostico}
                style={{
                  background: 'rgba(52,152,219,0.3)', border: '1px solid #3498db',
                  color: '#3498db', padding: '4px 10px', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 600
                }}
              >
                ⬇️ Descargar JSON
              </button>
            </div>

            {/* Grid de métricas */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1px', background: 'var(--border-color, #2a2a4a)'
            }}>
              {[
                { label: 'Arquitectura', value: diagnostico.arquitectura, icon: '🏗️' },
                { label: 'Teams Eventos', value: diagnostico.teams_eventos_total ?? '—', icon: '📅' },
                { label: 'Sin empresa', value: diagnostico.teams_eventos_sin_empresa ?? '—', icon: '❓' },
                { label: 'Minutas', value: diagnostico.minutas_total ?? '—', icon: '📝' },
                { label: 'Empresas', value: diagnostico.empresas_total ?? '—', icon: '🏢' },
                { label: 'Dominios aprendidos', value: diagnostico.dominios_aprendidos ?? '—', icon: '🌐' },
                { label: 'Contactos aprendidos', value: diagnostico.contactos_aprendidos ?? '—', icon: '👤' },
                { label: 'Reuniones legacy', value: diagnostico.reuniones_legacy ?? '—', icon: '📦' },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{
                  background: 'var(--card-bg, #1a1a2e)', padding: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {icon} {label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--text-light)' }}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Sync log reciente */}
            {diagnostico.sync_log_reciente && diagnostico.sync_log_reciente.length > 0 && (
              <div style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  SINCRONIZACIONES RECIENTES
                </p>
                {diagnostico.sync_log_reciente.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: i < diagnostico.sync_log_reciente.length - 1 ? '1px solid var(--border-color, #2a2a4a)' : 'none',
                    fontSize: '12px', gap: '12px'
                  }}>
                    <span style={{
                      background: s.resultado?.includes('error') ? 'rgba(231,76,60,0.2)' : 'rgba(46,204,113,0.2)',
                      color: s.resultado?.includes('error') ? '#e74c3c' : '#2ecc71',
                      padding: '2px 8px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap'
                    }}>
                      {s.tipo}
                    </span>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      {new Date(s.ejecutado_at).toLocaleString('es-CL')}
                    </span>
                    <span style={{ color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.resultado}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Status de sync por usuario */}
            {diagnostico.usuarios_sync_status && (
              <div style={{ padding: '0 16px 14px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  ESTADO SYNC POR USUARIO
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {diagnostico.usuarios_sync_status.map((u) => (
                    <div key={u.id} style={{
                      background: u.ultima_sincronizacion ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)',
                      border: `1px solid ${u.ultima_sincronizacion ? '#2ecc71' : '#e74c3c'}`,
                      borderRadius: '6px', padding: '6px 10px', fontSize: '11px'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>
                        {u.correo?.split('@')[0]}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                        {u.ultima_sincronizacion
                          ? `Sync: ${new Date(u.ultima_sincronizacion).toLocaleDateString('es-CL')}`
                          : '⚠️ Sin sincronizar'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        {u.token_status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────

function SectionCard({ icon, title, description, color, children }) {
  return (
    <div style={{
      marginBottom: '24px',
      background: 'var(--card-bg, #1a1a2e)',
      border: '1px solid var(--border-color, #2a2a4a)',
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Header de sección */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color, #2a2a4a)',
        background: `linear-gradient(135deg, ${color}18, transparent)`,
        borderLeft: `4px solid ${color}`,
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <span style={{ fontSize: '22px' }}>{icon}</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-light)' }}>
            {title}
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {description}
          </p>
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

function ToolRow({ icon, title, description, buttonLabel, buttonDisabled, onAction, danger, tag }) {
  const btnColor = danger ? '#e74c3c' : 'var(--secondary-color, #3498db)';
  const tagColor = tag === 'DESTRUCTIVO' ? '#e74c3c'
    : tag === 'MASIVO' ? '#e67e22'
    : '#2ecc71';

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: '20px', flexWrap: 'wrap',
      padding: '16px', borderRadius: '10px',
      background: danger ? 'rgba(231,76,60,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${danger ? 'rgba(231,76,60,0.2)' : 'var(--border-color, #2a2a4a)'}`,
    }}>
      {/* Info */}
      <div style={{ flex: 1, minWidth: '240px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-light)', fontSize: '15px' }}>{title}</span>
          {tag && (
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
              background: `${tagColor}22`, color: tagColor, border: `1px solid ${tagColor}44`,
              letterSpacing: '0.5px'
            }}>
              {tag}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          {description}
        </p>
      </div>

      {/* Botón */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <button
          id={`admin-btn-${title.replace(/\s/g, '-').toLowerCase()}`}
          onClick={onAction}
          disabled={buttonDisabled}
          style={{
            background: buttonDisabled ? 'rgba(255,255,255,0.1)' : `${btnColor}22`,
            color: buttonDisabled ? 'var(--text-muted)' : btnColor,
            border: `1px solid ${buttonDisabled ? 'transparent' : btnColor}`,
            padding: '10px 20px', borderRadius: '8px',
            cursor: buttonDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: '13px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => {
            if (!buttonDisabled) {
              e.target.style.background = btnColor;
              e.target.style.color = '#fff';
            }
          }}
          onMouseLeave={e => {
            if (!buttonDisabled) {
              e.target.style.background = `${btnColor}22`;
              e.target.style.color = btnColor;
            }
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
