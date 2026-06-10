import { useState } from "react";
import { crearReunion } from "../../services/reunionesService";

export default function useSubmitReunion({ form, resetForm, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);

      const formData = new FormData();

      Object.keys(form).forEach(key => {
        if (key !== "archivos") {
          if (key === "tipo_reu" && form.tipo_reu === "Otros" && form.tipo_reu_detalle) {
            formData.append("tipo_reu", form.tipo_reu_detalle);
          } else if (key !== "tipo_reu_detalle") {
            formData.append(key, form[key]);
          }
        }
      });

      form.archivos?.forEach(file => {
        formData.append("archivos", file);
      });

      const res = await crearReunion(formData);

      resetForm();
      onSuccess?.();

      return res;

    } finally {
      setLoading(false);
    }
  };

  return {
    submit,
    loading
  };
}
