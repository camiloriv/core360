import { useEffect, useState } from "react";
import { getDestinatarios, getTiposReunion } from "../../services/reunionesService";
import { obtenerTemplates } from "../../services/encuestaService";
import { getEmpresas, getEmpresasByJefatura, getEjecutivas, getEmpresasByGerencia, getUsuariosPorEmpresa } from "../../services/dataService";

export default function useReunionesData(user, empresa_id) {
  const [empresas, setEmpresas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);
  const [ejecutivas, setEjecutivas] = useState([]);
  const [tiposReunion, setTiposReunion] = useState(["Inducción", "Implementación TI"]);

  useEffect(() => {
    obtenerTemplates().then(setTemplates);
    getTiposReunion()
      .then(res => {
        const defaults = ["Inducción", "Implementación TI"];
        const combined = Array.from(new Set([...defaults, ...(res.data || [])]));
        setTiposReunion(combined);
      })
      .catch(err => {
        console.error("Error al obtener tipos de reunión:", err);
      });
  }, []);

  const fetchEmpresas = () => {
    if (!user || !user.permisos) {
      setEmpresas([]);
      return;
    }

    if (user.permisos === "admin") {
      getEmpresas().then(list => setEmpresas(list || []));
    } else if (user.permisos === "gerencia") {
      getEmpresasByGerencia(user.id).then(list => setEmpresas(list || []));
    } else if (user.permisos === "jefatura") {
      getEmpresasByJefatura(user.id).then(list => setEmpresas(list || []));
    } else if (user.jefatura_id) {
      getEmpresasByJefatura(user.jefatura_id).then(list => setEmpresas(list || []));
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, [user?.id, user?.permisos, user?.jefatura_id, user?.nombre, user?.correo, user?.cargos]);

  useEffect(() => {
    if (!empresa_id) {
      setDestinatarios([]);
      if (user?.permisos === "admin" || user?.permisos === "gerencia") {
        setEjecutivas([]); // Limpiar la lista hasta que se seleccione empresa
      }
      return;
    }

    getDestinatarios(empresa_id).then(res => setDestinatarios(res.data));

    if (user?.permisos === "admin" || user?.permisos === "gerencia") {
      getUsuariosPorEmpresa(empresa_id).then(list => setEjecutivas(list));
    }
  }, [empresa_id, user?.permisos]);

  return {
    empresas,
    setEmpresas,
    fetchEmpresas,
    templates,
    destinatarios,
    ejecutivas,
    tiposReunion
  };
}
