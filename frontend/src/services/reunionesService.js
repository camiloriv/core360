import api from "./api";

export const getJefaturas = () => api.get("/jefaturas");
export const getEjecutivas = () => api.get("/ejecutivas");

export const getEmpresas = (id) =>  api.get(`/empresas/jefatura/${id}`);

export const crearReunion = (data) =>  api.post("/reuniones", data);
export const getDestinatarios = (empresaId) => api.get(`/reuniones/destinatarios?empresa_id=${empresaId}`);
export const getTiposReunion = () => api.get("/reuniones/tipos");
export const getDefaultCc = (empresaId, ejecutivaId, enviadoPor) => api.get(`/reuniones/default-cc`, { params: { empresa_id: empresaId, ejecutiva_id: ejecutivaId, enviado_por_correo: enviadoPor } });
