import { useEffect, useState } from "react";
import { getEjecutivas, getEmpresas, getJefaturas } from "../../services/reunionesService";
import { obtenerTemplates } from "../../services/encuestaService";

export default function useReunionesData(jefatura_id) {
  const [jefaturas, setJefaturas] = useState([]);
  const [ejecutivas, setEjecutivas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    getJefaturas().then(res => setJefaturas(res.data));
    getEjecutivas().then(res => setEjecutivas(res.data));
    obtenerTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    if (!jefatura_id) {
      setEmpresas([]);
      return;
    }

    // Usar la jefatura_id para obtener empresas
    getEmpresas(jefatura_id).then(res => setEmpresas(res.data));
  }, [jefatura_id]);

  return {
    jefaturas,
    ejecutivas,
    empresas,
    setEmpresas,
    templates
  };
}
