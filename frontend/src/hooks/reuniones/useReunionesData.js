import { useEffect, useState } from "react";
import { getDestinatarios } from "../../services/reunionesService";
import { obtenerTemplates } from "../../services/encuestaService";
import { getEmpresas, getEmpresasByJefatura, getEmpresasByEjecutiva } from "../../services/dataService";

export default function useReunionesData(user, empresa_id) {
  const [empresas, setEmpresas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);

  useEffect(() => {
    obtenerTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    if (!user || !user.permisos) {
      setEmpresas([]);
      return;
    }

    if (user.permisos === "admin") {
      getEmpresas().then(setEmpresas);
    } else if (user.permisos === "jefatura") {
      getEmpresasByJefatura(user.id).then(setEmpresas);
    } else if (user.jefatura_id) {
      getEmpresasByJefatura(user.jefatura_id).then(setEmpresas);
    }
  }, [user]);

  useEffect(() => {
    if (!empresa_id) {
      setDestinatarios([]);
      return;
    }

    getDestinatarios(empresa_id).then(res => setDestinatarios(res.data));
  }, [empresa_id]);

  return {
    empresas,
    setEmpresas,
    templates,
    destinatarios
  };
}

