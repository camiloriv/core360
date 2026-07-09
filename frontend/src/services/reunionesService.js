import api from "./api";


export const crearReunion = (data) =>  api.post("/reuniones", data);
export const getDestinatarios = (empresaId) => api.get(`/reuniones/destinatarios?empresa_id=${empresaId}`);
export const getTiposReunion = () => api.get("/reuniones/tipos");
export const getDefaultCc = (empresaId, ejecutivaId, enviadoPor, enviadoPorId) => api.get(`/reuniones/default-cc`, { params: { empresa_id: empresaId, ejecutiva_id: ejecutivaId, enviado_por_correo: enviadoPor, enviado_por_id: enviadoPorId } });
export const marcarNoAplica = (id, isHuerfana, noAplica) => api.put(`/reuniones/${id}/no-aplica`, { isHuerfana, noAplica });
export const getReunionPorId = (idReunion) => api.get(`/reuniones/detail/${idReunion}`);
