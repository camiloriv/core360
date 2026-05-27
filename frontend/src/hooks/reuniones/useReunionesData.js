import { useEffect, useState } from "react";
import { getDestinatarios } from "../../services/reunionesService";
import { obtenerTemplates } from "../../services/encuestaService";
import { getEmpresas, getEmpresasByJefatura, getEjecutivas, getEmpresasByGerencia } from "../../services/dataService";

export default function useReunionesData(user, empresa_id) {
  const [empresas, setEmpresas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);
  const [ejecutivas, setEjecutivas] = useState([]);

  useEffect(() => {
    obtenerTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    if (!user || !user.permisos) {
      setEmpresas([]);
      return;
    }

    const isUserDemo = user.nombre?.toLowerCase().includes("prueba") || 
                       user.nombre?.toLowerCase().includes("demo") ||
                       user.correo?.toLowerCase().includes("prueba") ||
                       user.correo?.toLowerCase().includes("demo") ||
                       user.cargos?.toLowerCase().includes("prueba") ||
                       user.cargos?.toLowerCase().includes("demo");

    const filterEmpresas = (list) => {
      return (list || []).filter(emp => {
        const empDemo = emp.nombre?.toLowerCase().includes("demo") || 
                        emp.nombre?.toLowerCase().includes("prueba") ||
                        emp.jefatura_id === 28;
        return isUserDemo ? empDemo : !empDemo;
      });
    };

    const filterEjecutivas = (list) => {
      return (list || []).filter(ej => {
        const ejDemo = ej.nombre?.toLowerCase().includes("prueba") || 
                       ej.nombre?.toLowerCase().includes("demo") ||
                       ej.correo?.toLowerCase().includes("prueba") ||
                       ej.correo?.toLowerCase().includes("demo");
        return isUserDemo ? ejDemo : !ejDemo;
      });
    };

    if (user.permisos === "admin") {
      getEmpresas().then(list => setEmpresas(filterEmpresas(list)));
      getEjecutivas().then(list => setEjecutivas(filterEjecutivas(list)));
    } else if (user.permisos === "gerencia") {
      getEmpresasByGerencia(user.id).then(list => setEmpresas(filterEmpresas(list)));
    } else if (user.permisos === "jefatura") {
      getEmpresasByJefatura(user.id).then(list => setEmpresas(filterEmpresas(list)));
    } else if (user.jefatura_id) {
      getEmpresasByJefatura(user.jefatura_id).then(list => setEmpresas(filterEmpresas(list)));
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
    destinatarios,
    ejecutivas
  };
}
