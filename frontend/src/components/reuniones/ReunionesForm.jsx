import { useEffect } from "react";
import Swal from "sweetalert2";

import useReunionesForm from "../../hooks/reuniones/useReunionesForm";
import useReunionesData from "../../hooks/reuniones/useReunionesData";
import useSubmitReunion from "../../hooks/reuniones/useSubmitReunion";

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

  const {
    form,
    setField,
    setFiles,
    resetForm
  } = useReunionesForm();

  const {
    empresas,
    setEmpresas,
    templates,
    destinatarios
  } = useReunionesData(user, form.empresa_id);

  // Initialize jefatura_id, ejecutiva_id and enviado_por from user
  useEffect(() => {
    if (!form.jefatura_id && !form.ejecutiva_id) {
      setField("jefatura_id", user.jefatura_id || user.id);
      setField("ejecutiva_id", user.id);
      setField("enviado_por", user.nombre);
    }
  }, [user, form.jefatura_id, form.ejecutiva_id, setField]);

  const {
    submit,
    loading
  } = useSubmitReunion({
    form,
    resetForm,
    onSuccess,
    setEmpresas
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔹 VALIDACIÓN DETALLADA
    const missingFields = [];
    if (!form.empresa_id) missingFields.push("Empresa");
    if (!form.tipo_reu) missingFields.push("Tipo de Reunión");
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
        confirmButtonColor: "#3085d6"
      });
    }

    try {
      const res = await submit();
      Swal.fire({
        icon: "success",
        title: "¡Éxito!",
        text: `Reunión creada: ${res.data.id_reunion}`,
        confirmButtonColor: "#3085d6"
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Hubo un problema al crear la reunión. Por favor verifica los datos.",
        confirmButtonColor: "#d33"
      });
    }
  };

  return (
    <div className="container" style={{ position: 'relative' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "25px" }}>
          <div className="title">Nueva Reunión</div>
          <div className="subtitle">Completa los datos para agendar la reunión</div>
        </div>

        <div className="grid">
          <SelectEmpresa value={form.empresa_id} empresas={empresas} onChange={(e) => setField("empresa_id", e.target.value)} required />
          <SelectTipoReunion value={form.tipo_reu} onChange={(e) => setField("tipo_reu", e.target.value)} detalle={form.tipo_reu_detalle} onDetalleChange={(e) => setField("tipo_reu_detalle", e.target.value)} required />
          
          <FormSection label={<>MOTIVO <span style={{ color: 'red' }}>*</span></>}>
            <input value={form.motivo_reu || ""} onChange={(e) => setField("motivo_reu", e.target.value)} />
          </FormSection>
          <FormSection label={<>ENVIAR A <span style={{ color: 'red' }}>*</span></>} full>
            <AutocompleteInput 
              value={form.enviado_a || ""} 
              suggestions={destinatarios} 
              onChange={(e) => setField("enviado_a", e.target.value)} 
              placeholder="Nombre del destinatario..."
            />
          </FormSection>

          <FormSection label={<>PARTICIPANTES <span style={{ color: 'red' }}>*</span></>} full>
            <input value={form.participantes || ""} onChange={(e) => setField("participantes", e.target.value)} />
          </FormSection>
          <FormSection label={<>FECHA <span style={{ color: 'red' }}>*</span></>}>
            <input type="date" value={form.fecha_reu || ""} onChange={(e) => setField("fecha_reu", e.target.value)} />
          </FormSection>
          <FormSection label={<>HORA <span style={{ color: 'red' }}>*</span></>}>
            <input type="time" value={form.hora || ""} onChange={(e) => setField("hora", e.target.value)} />
          </FormSection>
          
          <SelectLugar label={<>LUGAR <span style={{ color: 'red' }}>*</span></>} name="lugar" opciones={["Microsoft Teams", "Google Meet", "Zoom", "Presencial"]} form={form} setField={setField} />
          <MinutaEditor form={form} setForm={setField} />
          <FileUpload archivos={form.archivos} setFiles={setFiles} />
          
          <FormSection label="DOCUMENTOS ADJUNTOS" full>
            <input value={form.documentos_adjuntos || ""} onChange={(e) => setField("documentos_adjuntos", e.target.value)} />
          </FormSection>

          <div className="field full" style={{ marginTop: '10px', padding: '15px', background: 'var(--bg-muted)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: form.programar_encuesta ? '15px' : '0' }}>
              <input type="checkbox" checked={form.programar_encuesta} onChange={(e) => setField("programar_encuesta", e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--info-color)' }}>PROGRAMAR ENVÍO DE ENCUESTA</span>
            </label>
            {form.programar_encuesta && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--info-color)', fontWeight: 'bold' }}>TIPO DE ENCUESTA:</span>
                  <select value={form.encuesta_tipo} onChange={(e) => setField("encuesta_tipo", e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} >
                    <option value="">Seleccionar tipo</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.nombre}>{t.nombre.charAt(0).toUpperCase() + t.nombre.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--info-color)', fontWeight: 'bold' }}>FECHA Y HORA DE ENVÍO:</span>
                  <input type="datetime-local" value={form.encuesta_programada_para} onChange={(e) => setField("encuesta_programada_para", e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.encuesta_relacionada} onChange={(e) => setField("encuesta_relacionada", e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--info-color)' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-color)' }}>Encuesta relacionada con esta minuta/reunión</span>
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
