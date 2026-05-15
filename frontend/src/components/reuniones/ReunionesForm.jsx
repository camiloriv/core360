
import Swal from "sweetalert2";


import useReunionesForm from "../../hooks/reuniones/useReunionesForm";
import useReunionesData from "../../hooks/reuniones/useReunionesData";
import useSubmitReunion from "../../hooks/reuniones/useSubmitReunion";

import FormSection from "../form/core/FormSection";
import FormActions from "../form/core/FormActions";

// fields
import SelectJefatura from "../form/fields/SelectJefatura";
import SelectEjecutiva from "../form/fields/SelectEjecutiva";
import SelectEmpresa from "../form/fields/SelectEmpresa";
import SelectTipoReunion from "../form/fields/SelectTipoReunion";
import FileUpload from "../form/fields/FileUpload";
import MinutaEditor from "../form/fields/MinutaEditor";
import SelectLugar from "../form/fields/SelectLugar";
import AutocompleteInput from "../form/fields/AutocompleteInput";


function ReunionesForm({ onSuccess }) {
  const {
    form,
    setField,
    setFiles,
    resetForm
  } = useReunionesForm();

  const {
    jefaturas,
    ejecutivas,
    empresas,
    setEmpresas,
    templates,
    destinatarios
  } = useReunionesData(form.jefatura_id, form.empresa_id);


  const {
    submit,
    loading
  } = useSubmitReunion({
    form,
    resetForm,
    onSuccess,
    setEmpresas
  });

  const handleJefaturaChange = (e) => {
    const val = e.target.value;
    setField("jefatura_id", val);
    setField("ejecutiva_id", "");
    setField("enviado_por", "");
    setField("empresa_id", "");
  };

  const handleEjecutivaChange = (e) => {
    const val = e.target.value;
    setField("ejecutiva_id", val);
    const ej = ejecutivas.find(x => x.id === parseInt(val));
    setField("enviado_por", ej ? ej.nombre : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔹 VALIDACIÓN DETALLADA
    const missingFields = [];
    if (!form.jefatura_id) missingFields.push("Jefatura");
    if (!form.ejecutiva_id) missingFields.push("Ejecutiva");
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

  const filteredEjecutivas = ejecutivas.filter(e => 
    !form.jefatura_id || e.jefatura_id === parseInt(form.jefatura_id)
  );

  return (
    <div className="container" style={{ position: 'relative' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "25px" }}>
          <div className="title">Nueva Reunión</div>
          <div className="subtitle">Completa los datos para agendar la reunión</div>
        </div>

        <div className="grid">
          <SelectJefatura value={form.jefatura_id} jefaturas={jefaturas} onChange={handleJefaturaChange} required />
          <SelectEjecutiva value={form.ejecutiva_id} ejecutivas={filteredEjecutivas} onChange={handleEjecutivaChange} required />
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


          <div className="field full" style={{ marginTop: '10px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: form.programar_encuesta ? '15px' : '0' }}>
              <input type="checkbox" checked={form.programar_encuesta} onChange={(e) => setField("programar_encuesta", e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }}>PROGRAMAR ENVÍO DE ENCUESTA</span>
            </label>
            {form.programar_encuesta && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#075985', fontWeight: 'bold' }}>TIPO DE ENCUESTA:</span>
                  <select value={form.encuesta_tipo} onChange={(e) => setField("encuesta_tipo", e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #7dd3fc' }} >
                    <option value="">Seleccionar tipo</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.nombre}>{t.nombre.charAt(0).toUpperCase() + t.nombre.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#075985', fontWeight: 'bold' }}>FECHA Y HORA DE ENVÍO:</span>
                  <input type="datetime-local" value={form.encuesta_programada_para} onChange={(e) => setField("encuesta_programada_para", e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #7dd3fc' }} />
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
