import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

// Cache global en memoria para evitar llamadas redundantes
let globalCache = null;
let fetchPromise = null;

export const clearDashboardCache = () => {
  globalCache = null;
  fetchPromise = null;
};

export const useDashboardData = (forceRefresh = false) => {
  const [data, setData] = useState(globalCache || { jefaturas: [], empresas: [], reuniones: [] });
  const [loading, setLoading] = useState(!globalCache || forceRefresh);
  const [error, setError] = useState(null);

  const userString = localStorage.getItem("usuario") || "null";
  const user = useMemo(() => JSON.parse(userString), [userString]);

  const fetchData = useCallback(async (ignoreCache = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Si ya tenemos cache y no forzamos refresco, usamos el cache.
    if (globalCache && !ignoreCache && !forceRefresh) {
      setData(globalCache);
      setLoading(false);
      return;
    }

    // Si ya hay una petición en curso, esperamos a que termine
    if (fetchPromise && !ignoreCache) {
      try {
        const result = await fetchPromise;
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    const fetchInternal = async () => {
      try {
        const rol = user?.permisos;
        const id = user?.id;
        const jefaturaId = user?.jefatura_id;

        let jefaturasUrl = "/jefaturas";
        let empresasUrl = "/empresas";
        let reunionesUrl = "/reuniones";

        if (rol === "gerencia" && id) {
          jefaturasUrl = `/jefaturas?gerencia_id=${id}`;
          empresasUrl = `/empresas?gerencia_id=${id}`;
          reunionesUrl = `/reuniones?usuario_id=${id}&rol=gerencia`;
        } else if (rol === "gerencia_general" && id) {
          reunionesUrl = `/reuniones`;
        } else if (rol === "jefatura" && id) {
          jefaturasUrl = `/jefaturas?jefatura_id=${id}`;
          empresasUrl = `/empresas?jefatura_id=${id}`;
          reunionesUrl = `/reuniones?usuario_id=${id}&rol=jefatura`;
        } else if (rol === "ejecutiva" && id) {
          const targetJefId = jefaturaId || id;
          jefaturasUrl = `/jefaturas?jefatura_id=${targetJefId}`;
          empresasUrl = `/empresas?jefatura_id=${targetJefId}`;
          reunionesUrl = `/reuniones?usuario_id=${id}&rol=ejecutiva`;
        }

        const [resJ, resE, resR] = await Promise.all([
          api.get(jefaturasUrl),
          api.get(empresasUrl),
          api.get(reunionesUrl),
        ]);

        const isUserDemo =
          (user?.nombre?.toLowerCase().includes("prueba") ||
          user?.nombre?.toLowerCase().includes("demo") ||
          user?.correo?.toLowerCase().includes("prueba") ||
          user?.correo?.toLowerCase().includes("demo") ||
          user?.cargos?.toLowerCase().includes("prueba") ||
          user?.cargos?.toLowerCase().includes("demo")) &&
          !user?.correo?.toLowerCase().includes("prueba_");

        let filteredJefaturas = (resJ.data || []).filter((j) => {
          const jDemo =
            j.nombre?.toLowerCase().includes("prueba") ||
            j.nombre?.toLowerCase().includes("demo") ||
            j.correo?.toLowerCase().includes("prueba") ||
            j.correo?.toLowerCase().includes("demo");
          return isUserDemo ? jDemo : !jDemo;
        });

        let filteredEmpresas = (resE.data || []).filter((emp) => {
          const empDemo =
            emp.nombre?.toLowerCase().includes("demo") ||
            emp.nombre?.toLowerCase().includes("prueba") ||
            emp.jefatura_id === Number(import.meta.env.VITE_EXCLUDED_JEFATURA_ID || 28); // Hardcodeado en el código original para excluir id 28
          return isUserDemo ? empDemo : !empDemo;
        });

        if (rol === "jefatura" && id) {
          filteredJefaturas = filteredJefaturas.filter((j) => j.id === id);
        } else if (rol === "ejecutiva" && (jefaturaId || id)) {
          const targetJefId = jefaturaId || id;
          filteredJefaturas = filteredJefaturas.filter((j) => j.id === targetJefId);
        }

        // Filtro base de reuniones (asegurarse de que existan las empresas a nivel global)
        let filteredReunionesList = (resR.data || []).filter((r) => {
          const isDemoEmp = r.empresa_nombre?.toLowerCase().includes("demo") || 
                            r.empresa_nombre?.toLowerCase().includes("prueba") ||
                            r.ejecutiva_nombre?.toLowerCase().includes("prueba") ||
                            r.ejecutiva_nombre?.toLowerCase().includes("demo") ||
                            r.jefatura_nombre?.toLowerCase().includes("prueba") ||
                            r.jefatura_nombre?.toLowerCase().includes("demo");
          return isUserDemo ? isDemoEmp : !isDemoEmp;
        });

        const newData = {
          jefaturas: filteredJefaturas,
          empresas: filteredEmpresas,
          reuniones: filteredReunionesList
        };

        globalCache = newData;
        return newData;
      } catch (err) {
        console.error("Error en useDashboardData:", err);
        throw err;
      }
    };

    fetchPromise = fetchInternal();
    try {
      const result = await fetchPromise;
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      fetchPromise = null;
    }
  }, [user, forceRefresh]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => {
    setLoading(true);
    fetchData(true);
  };

  return { ...data, loading, error, refetch, user };
};
