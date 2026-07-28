import api from "./api";

/**
 * Obtener el log de auditoría
 * @param {Object} filters Filtros de búsqueda (page, limit, usuario_id, entidad, accion, desde, hasta, delegadas, buscar)
 * @returns {Promise<Object>} Promesa que resuelve a un objeto { data, pagination }
 */
export const getAuditLog = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/admin/audit-log?${params.toString()}`);
  return response.data;
};

/**
 * Obtener las acciones disponibles para los filtros
 * @returns {Promise<Array<string>>}
 */
export const getAccionesDisponibles = async () => {
  const response = await api.get("/admin/audit-log/acciones");
  return response.data;
};
