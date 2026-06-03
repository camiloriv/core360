import { useState } from "react";

const initialState = {
  jefatura_id: "",
  ejecutiva_id: "",
  empresa_id: "",
  enviado_a: "",
  enviado_por: "",
  enviado_por_correo: "",
  participantes: "",
  tipo_reu: "",
  fecha_reu: "",
  hora: "",
  lugar: "",
  documentos_adjuntos: "",
  motivo_reu: "",
  minuta: "",
  form_f: "",
  archivos: [],
  programar_encuesta: false,
  encuesta_tipo: "",
  encuesta_programada_para: "",
  encuesta_relacionada: false,
  encuesta_destinatario: ""
};

export default function useReunionesForm() {
  const [form, setForm] = useState(initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const setField = (name, value) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const setFiles = (files) => {
    setForm(prev => ({
      ...prev,
      archivos: files
    }));
  };

  const resetForm = () => setForm(initialState);

  return {
    form,
    handleChange,
    setField,
    setFiles,
    resetForm
  };
}
