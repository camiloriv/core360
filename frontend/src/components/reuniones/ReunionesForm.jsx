import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import useReunionesForm from "../../hooks/reuniones/useReunionesForm";
import useReunionesData from "../../hooks/reuniones/useReunionesData";
import useSubmitReunion from "../../hooks/reuniones/useSubmitReunion";
import { getDefaultCc } from "../../services/reunionesService";

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

  const { form, setField, setFiles, resetForm } = useReunionesForm();
  const [isCcEditable, setIsCcEditable] = useState(false);

  const isUserDemo = (user.nombre?.toLowerCase().includes("prueba") || user.correo?.toLowerCase().includes("prueba")) && !user.correo?.toLowerCase().includes("prueba_");

  const { empresas, setEmpresas, fetchEmpresas, templates, destinatarios, ejecutivas, tiposReunion } =
    useReunionesData(user, form.empresa_id);

  // Para no-admin o usuarios de prueba: inicializar ejecutiva_id y enviado_por desde el usuario logueado
  // Excepción: "gerencia" debe seleccionar ejecutiva, así que no autocompletamos su ejecutiva_id ni jefatura_id
  useEffect(() => {
    if (!form.enviado_por_correo) {
      setField("enviado_por_correo", user.correo);
    }
    if (!form.enviado_por_id) {
      setField("enviado_por_id", user.id);
    }
    
    if (((user.permisos && user.permisos !== "admin" && user.permisos !== "gerencia") || isUserDemo) && !user.nombre?.toLowerCase().includes("lilian")) {
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
  }, [user.permisos, user.id, user.jefatura_id, user.nombre, user.correo, form.ejecutiva_id, form.jefatura_id, form.enviado_por, form.enviado_por_correo, isUserDemo]);

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

  const { submit, loading } = useSubmitReunion({
    form,
    resetForm,
    onSuccess: () => {
      fetchEmpresas();
      onSuccess?.();
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔹 VALIDACIÓN DETALLADA
    const missingFields = [];
    if (!form.empresa_id) missingFields.push("Empresa");
    if (!form.ejecutiva_id) missingFields.push("Ejecutiva");
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
          <SelectEmpresa
            value={form.empresa_id}
            empresas={empresas}
            onChange={(e) => setField("empresa_id", e.target.value)}
            required
          />

          {/* Selector de usuario asignado: visible para admin y gerencia (que no sea de prueba) */}
          {(user.permisos === "admin" || user.permisos === "gerencia") && !isUserDemo && (
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
