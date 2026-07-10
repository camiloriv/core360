import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import useReunionesForm from "../../hooks/reuniones/useReunionesForm";
import useReunionesData from "../../hooks/reuniones/useReunionesData";
import useSubmitReunion from "../../hooks/reuniones/useSubmitReunion";
import { getDefaultCc, getReunionPorId } from "../../services/reunionesService";

import FormSection from "../form/core/FormSection";
import FormActions from "../form/core/FormActions";

// fields
import SelectEmpresa from "../form/fields/SelectEmpresa";
import SelectTipoReunion from "../form/fields/SelectTipoReunion";
import FileUpload from "../form/fields/FileUpload";
import MinutaEditor from "../form/fields/MinutaEditor";
import SelectLugar from "../form/fields/SelectLugar";
import AutocompleteInput from "../form/fields/AutocompleteInput";

function ReunionesForm({ onSuccess }) {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  const location = useLocation();
  const navigate = useNavigate();

  const { form, setField, setFiles, resetForm } = useReunionesForm();
  const [isCcEditable, setIsCcEditable] = useState(false);
  const [forceShowForm, setForceShowForm] = useState(false);

  const { empresas, setEmpresas, fetchEmpresas, templates, destinatarios, ejecutivas, tiposReunion } =
    useReunionesData(user, form.empresa_id);

  // Para no-admin: inicializar ejecutiva_id y enviado_por desde el usuario logueado
  // Excepción: "gerencia" debe seleccionar ejecutiva, así que no autocompletamos su ejecutiva_id ni jefatura_id
  useEffect(() => {
    if (!form.enviado_por_correo) {
      setField("enviado_por_correo", user.correo);
    }
    if (!form.enviado_por_id) {
      setField("enviado_por_id", user.id);
    }
    
    if ((user.permisos && user.permisos !== "admin" && user.permisos !== "gerencia") && !user.nombre?.toLowerCase().includes("lilian")) {
      if (!form.jefatura_id) {
        setField("jefatura_id", user.jefatura_id || user.id);
      }
      if (!form.ejecutiva_id) {
        setField("ejecutiva_id", user.id);
      }
      if (!form.enviado_por) {
        setField("enviado_por", user.nombre);
      }
    } else if ((user.permisos === "admin" || user.permisos === "gerencia") && !form.enviado_por) {
      setField("enviado_por", user.nombre);
    }
  }, [user.permisos, user.id, user.jefatura_id, user.nombre, user.correo, form.ejecutiva_id, form.jefatura_id, form.enviado_por, form.enviado_por_correo]);

  // Resetear ejecutiva y CC cuando cambia de empresa
  useEffect(() => {
    setIsCcEditable(false);
    setField("correos_cc", "");
    if (user.permisos === "admin" || user.permisos === "gerencia") {
      setField("ejecutiva_id", "");
      setField("jefatura_id", "");
    }
  }, [form.empresa_id]);

  // Si cambia de ejecutiva, también resetear el estado editable para recargar el CC correspondiente
  useEffect(() => {
    setIsCcEditable(false);
  }, [form.ejecutiva_id]);

  // Obtener CC por defecto desde el backend
  useEffect(() => {
    if (form.empresa_id && form.ejecutiva_id && !isCcEditable) {
      getDefaultCc(form.empresa_id, form.ejecutiva_id, user.correo, user.id)
        .then((res) => {
          setField("correos_cc", res.data.cc);
        })
        .catch((err) => console.error("Error al obtener correos en copia:", err));
    }
  }, [form.empresa_id, form.ejecutiva_id, user.correo, user.id, isCcEditable]);

  const { id_reunion } = useParams();

  const populateFromDraft = (draft) => {
    setField("id_reunion", draft.id_reunion);
    setField("teams_evento_id", draft.teams_evento_id || "");
    setField("event_id", draft.event_id || "");
    setField("empresa_id", draft.empresa_id || "");
    if (!draft.empresa_id) {
      setField("asunto_correo", draft.asunto_teams || draft.motivo_reu || "");
    }
    setField("fecha_reu", new Date(draft.fecha_reu).toISOString().split('T')[0]);
    setField("hora", draft.hora);
    setField("tipo_reu", ""); // Dejar vacío para que el usuario seleccione
    setField("participantes", draft.participantes || "");
    
    let filteredEnviadoA = "";
    let ccEmails = [];
    try {
      let correos = [];
      const sourceData = draft.enviado_a || draft.asistentes;
      if (sourceData) {
        try {
          const parsed = typeof sourceData === 'string' ? JSON.parse(sourceData) : sourceData;
          if (Array.isArray(parsed)) {
            if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].email) {
              correos = parsed.map(p => p.email);
            } else {
              correos = parsed;
            }
          } else {
            correos = String(sourceData).split(/[\s,;]+/);
          }
        } catch (e) {
          correos = String(sourceData).split(/[\s,;]+/);
        }
      }
      
      const validCorreos = correos.map(e => typeof e === 'string' ? e.trim() : "").filter(Boolean);
      
      filteredEnviadoA = validCorreos
        .filter(email => !email.toLowerCase().endsWith("@proforma.cl"))
        .join(", ");
        
      ccEmails = validCorreos
        .filter(email => email.toLowerCase().endsWith("@proforma.cl") && email.toLowerCase() !== user.correo?.toLowerCase());
        
    } catch (e) {
      console.error("Error procesando correos del draft", e);
    }

    setField("enviado_a", filteredEnviadoA);
    if (ccEmails.length > 0) {
      setField("correos_cc", ccEmails.join(", "));
      setIsCcEditable(true);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setField("lugar", draft.lugar || "");
  };

  // Si abrimos la pantalla con un borrador o un ID en la URL, precargarlo
  useEffect(() => {
    if (location.state && location.state.draft) {
      populateFromDraft(location.state.draft);
      window.history.replaceState({}, document.title);
    } else if (id_reunion) {
      getReunionPorId(id_reunion)
        .then((res) => {
          if (res.data) {
            populateFromDraft(res.data);
          }
        })
        .catch((err) => {
          console.error("Error al obtener la reunión:", err);
          Swal.fire("Error", "No se pudo cargar la información de la reunión.", "error");
        });
    }
  }, [id_reunion]);

  const { submit, loading } = useSubmitReunion({
    form,
    resetForm,
    onSuccess: () => {
      fetchEmpresas();
      onSuccess?.();
    },
  });

  const isSinEmpresa = !!(form.id_reunion && !form.empresa_id);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔹 VALIDACIÓN DETALLADA
    const missingFields = [];
    if (!isSinEmpresa && !form.empresa_id) missingFields.push("Empresa");
    if (!isSinEmpresa && !form.ejecutiva_id) missingFields.push("Ejecutiva");
    if (isSinEmpresa && !form.asunto_correo) missingFields.push("Asunto del correo");
    if (!form.tipo_reu) missingFields.push("Tipo de Reunión");
    if (form.tipo_reu === "Otros" && (!form.tipo_reu_detalle || !form.tipo_reu_detalle.trim())) {
      missingFields.push("Especificar Tipo de Reunión");
    }
    if (!form.motivo_reu) missingFields.push("Motivo");
    if (!form.enviado_a) missingFields.push("Enviar a");
    if (!form.participantes) missingFields.push("Participantes");
    if (!form.fecha_reu) missingFields.push("Fecha");
    if (!form.hora) missingFields.push("Hora");
    if (!form.lugar) missingFields.push("Lugar");

    if (missingFields.length > 0) {
      return Swal.fire({
        icon: "warning",
        title: "Campos Incompletos",
        html: `<div style="text-align: left;">Por favor completa los siguientes campos obligatorios:<br><br><b>${missingFields.join(", ")}</b></div>`,
        confirmButtonColor: "#3085d6",
      });
    }

    console.log("Submitting meeting form payload:", form);

    try {
      const res = await submit();
      Swal.fire({
        icon: "success",
        title: "¡Éxito!",
        text: `Reunión creada: ${res.data.id_reunion}`,
        confirmButtonColor: "#3085d6",
      });
    } catch (error) {
      console.error("Error creating meeting:", error);
      const serverError = error.response?.data?.error || "Hubo un problema al crear la reunión. Por favor verifica los datos.";
      Swal.fire({
        icon: "error",
        title: "Error al crear la reunión",
        text: serverError,
        confirmButtonColor: "#d33",
      });
    }
  };

  const isDirectRegistrarRoute = location.pathname === "/registrar-reunion";

  if (!isDirectRegistrarRoute && !forceShowForm && (!location.state || !location.state.draft)) {
    return (
      <div 
        className="container" 
        style={{ 
          position: "relative", 
          maxWidth: "600px", 
          margin: "20px auto", 
          padding: "24px 24px", 
          borderRadius: "16px", 
          background: "white", 
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)", 
          textAlign: "center",
          border: "1px solid #f1f5f9"
        }}
      >
        <div>
          <div 
            style={{ 
              display: "inline-flex", 
              justifyContent: "center", 
              alignItems: "center", 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: "rgba(99, 102, 241, 0.08)", 
              color: "rgb(99, 102, 241)", 
              marginBottom: "16px" 
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "8px", fontFamily: "Outfit, sans-serif" }}>
            Registro de Minutas Exclusivo para Teams
          </h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.5", marginBottom: "20px", fontFamily: "Inter, sans-serif" }}>
            Para garantizar la limpieza e integridad del proyecto, todas las minutas registradas deben estar vinculadas a una reunión comercial agendada a través de <b>Microsoft Teams</b>.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button 
              onClick={() => navigate("/vincular-reuniones")}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: "var(--secondary-color)",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(0.95)"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
            >
              Ir a Vincular Reuniones Comerciales
            </button>
            <button 
              onClick={() => navigate("/agendar")}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#475569",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#94a3b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
            >
              Agendar Nueva Reunión en Teams
            </button>
            <button 
              onClick={() => navigate("/registrar-reunion")}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#475569",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#94a3b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
            >
              Crear Minuta Desde Cero
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ position: "relative" }}>
      <form onSubmit={handleSubmit}>
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
            Registrar Reunión
          </h1>
          <p className="page-subtitle">COMPLETA LOS DATOS PARA REGISTRAR LA REUNIÓN</p>
        </div>

        <div className="grid">
          {!isSinEmpresa ? (
            <SelectEmpresa
              value={form.empresa_id}
              empresas={empresas}
              onChange={(e) => setField("empresa_id", e.target.value)}
              required
            />
          ) : (
            <FormSection
              label={
                <>
                  ASUNTO DEL CORREO <span style={{ color: "red" }}>*</span>
                </>
              }
              full
            >
              <input
                value={form.asunto_correo || ""}
                onChange={(e) => setField("asunto_correo", e.target.value)}
                placeholder="Ej: Minuta de Reunión Proforma..."
              />
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                Esta reunión no tiene una empresa asignada. Este asunto se utilizará para el correo a los participantes.
              </p>
            </FormSection>
          )}

          {/* Selector de usuario asignado: visible para admin y gerencia */}
          {!isSinEmpresa && (user.permisos === "admin" || user.permisos === "gerencia") && (
            <FormSection
              label={
                <>
                  ASIGNAR A (EJECUTIVA / JEFATURA / GERENCIA) <span style={{ color: "red" }}>*</span>
                </>
              }
              full
            >
              <select
                value={form.ejecutiva_id || ""}
                onChange={(e) => {
                  const ej = ejecutivas.find(
                    (x) => x.id === Number(e.target.value),
                  );
                  setField("ejecutiva_id", e.target.value);
                  if (ej) setField("jefatura_id", ej.jefatura_id || ej.id); // Si es jefatura, su id es su jefatura_id
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  fontSize: "14px",
                  background: "white",
                }}
                disabled={!form.empresa_id}
              >
                <option value="">
                  {!form.empresa_id ? "-- Seleccione una empresa primero --" : "-- Seleccione un usuario --"}
                </option>
                {ejecutivas.map((ej) => (
                  <option key={ej.id} value={ej.id}>
                    {ej.nombre}
                  </option>
                ))}
              </select>
            </FormSection>
          )}

          <SelectTipoReunion
            value={form.tipo_reu}
            onChange={(e) => setField("tipo_reu", e.target.value)}
            detalle={form.tipo_reu_detalle}
            onDetalleChange={(e) =>
              setField("tipo_reu_detalle", e.target.value)
            }
            tipos={tiposReunion}
            required
          />

          <FormSection
            label={
              <>
                MOTIVO <span style={{ color: "red" }}>*</span>
              </>
            }
          >
            <input
              value={form.motivo_reu || ""}
              onChange={(e) => setField("motivo_reu", e.target.value)}
            />
          </FormSection>

          <FormSection
            label={
              <>
                ENVIAR A <span style={{ color: "red" }}>*</span>
              </>
            }
            full
          >
            <AutocompleteInput
              value={form.enviado_a || ""}
              suggestions={destinatarios}
              onChange={(e) => setField("enviado_a", e.target.value)}
              placeholder="Nombre del destinatario..."
            />
          </FormSection>

          <FormSection
            label={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span>EN COPIA (CC)</span>
                {!isCcEditable && (
                  <button
                    type="button"
                    onClick={() => setIsCcEditable(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary-color)",
                      cursor: "pointer",
                      fontSize: "12px",
                      textDecoration: "underline",
                      padding: 0
                    }}
                  >
                    Editar
                  </button>
                )}
              </div>
            }
            full
          >
            <input
              value={form.correos_cc || ""}
              onChange={(e) => setField("correos_cc", e.target.value)}
              readOnly={!isCcEditable}
              style={{
                backgroundColor: isCcEditable ? "white" : "#f0f0f0",
                color: isCcEditable ? "black" : "#555",
              }}
              placeholder="Ej: correo1@ejemplo.com, correo2@ejemplo.com"
            />
          </FormSection>

          <FormSection
            label={
              <>
                PARTICIPANTES <span style={{ color: "red" }}>*</span>
              </>
            }
            full
          >
            <input
              value={form.participantes || ""}
              onChange={(e) => setField("participantes", e.target.value)}
            />
          </FormSection>
          <FormSection
            label={
              <>
                FECHA <span style={{ color: "red" }}>*</span>
              </>
            }
          >
            <input
              type="date"
              value={form.fecha_reu || ""}
              onChange={(e) => setField("fecha_reu", e.target.value)}
            />
          </FormSection>
          <FormSection
            label={
              <>
                HORA <span style={{ color: "red" }}>*</span>
              </>
            }
          >
            <input
              type="time"
              value={form.hora || ""}
              onChange={(e) => setField("hora", e.target.value)}
            />
          </FormSection>

          <SelectLugar
            label={
              <>
                LUGAR <span style={{ color: "red" }}>*</span>
              </>
            }
            name="lugar"
            opciones={["Microsoft Teams", "Google Meet", "Zoom", "Presencial"]}
            form={form}
            setField={setField}
          />
          <MinutaEditor form={form} setForm={setField} />
          <FileUpload archivos={form.archivos} setFiles={setFiles} />

          <FormSection label="DOCUMENTOS ADJUNTOS" full>
            <input
              value={form.documentos_adjuntos || ""}
              onChange={(e) => setField("documentos_adjuntos", e.target.value)}
            />
          </FormSection>

          <div
            className="field full"
            style={{
              marginTop: "10px",
              padding: "15px",
              background: "var(--bg-muted)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                marginBottom: form.programar_encuesta ? "15px" : "0",
              }}
            >
              <input
                type="checkbox"
                checked={form.programar_encuesta}
                onChange={(e) =>
                  setField("programar_encuesta", e.target.checked)
                }
                style={{ width: "18px", height: "18px" }}
              />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "var(--info-color)",
                }}
              >
                PROGRAMAR ENVÍO DE ENCUESTA
              </span>
            </label>
            {form.programar_encuesta && (
              <div
                className="responsive-grid-2"
                style={{
                  gap: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--info-color)",
                      fontWeight: "bold",
                    }}
                  >
                    TIPO DE ENCUESTA:
                  </span>
                  <select
                    value={form.encuesta_tipo}
                    onChange={(e) => setField("encuesta_tipo", e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <option value="">Seleccionar tipo</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.nombre}>
                        {t.nombre.charAt(0).toUpperCase() + t.nombre.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--info-color)",
                      fontWeight: "bold",
                    }}
                  >
                    FECHA Y HORA DE ENVÍO:
                  </span>
                  <input
                    type="datetime-local"
                    value={form.encuesta_programada_para}
                    onChange={(e) =>
                      setField("encuesta_programada_para", e.target.value)
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                    }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1", marginTop: "5px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--info-color)",
                      fontWeight: "bold",
                      display: "block",
                      marginBottom: "5px"
                    }}
                  >
                    CORREO DESTINATARIO ENCUESTA:
                  </span>
                  <input
                    type="email"
                    placeholder="ejemplo@empresa.com"
                    value={form.encuesta_destinatario}
                    onChange={(e) =>
                      setField("encuesta_destinatario", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                    }}
                  />
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Si se deja en blanco, la encuesta se enviará al mismo correo especificado en "Enviar a (Correo Electrónico)".
                  </p>
                </div>
                <div style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.encuesta_relacionada}
                      onChange={(e) =>
                        setField("encuesta_relacionada", e.target.checked)
                      }
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "var(--info-color)",
                      }}
                    />
                    <span
                      style={{ fontSize: "13px", color: "var(--text-color)" }}
                    >
                      Encuesta relacionada con esta minuta/reunión
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
        <FormActions loading={loading} />
      </form>
    </div>
  );
}

export default ReunionesForm;
