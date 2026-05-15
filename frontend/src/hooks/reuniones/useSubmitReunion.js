import { useState } from "react";
import { crearReunion } from "../../services/reunionesService";

export default function useSubmitReunion({ form, resetForm, onSuccess, setEmpresas }) {
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);

      const formData = new FormData();

      Object.keys(form).forEach(key => {
        if (key !== "archivos") {
          formData.append(key, form[key]);
        }
      });

      form.archivos?.forEach(file => {
        formData.append("archivos", file);
      });

      const res = await crearReunion(formData);

      resetForm();
      setEmpresas([]);
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
