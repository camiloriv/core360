import api from "./api";

export const obtenerEventosCalendario = async (startDateTime, endDateTime) => {
  return api.get(`/agendamiento/calendario?start=${startDateTime}&end=${endDateTime}`);
};

export const crearReunionTeams = async (data) => {
  return api.post(`/agendamiento`, data);
};

export const anularReunionTeams = (payload) => {
  return api.post('/agendamiento/anular', payload);
};

export const syncEventosPasados = async () => {
  return api.post('/agendamiento/sync-past');
};

export const obtenerHuerfanas = async () => {
  return api.get('/agendamiento/huerfanas');
};

export const vincularHuerfana = async (id, empresa_id, dominios) => {
  return api.post('/agendamiento/huerfanas/vincular', { id, empresa_id, dominios });
};

export const descartarHuerfana = async (id) => {
  return api.post('/agendamiento/huerfanas/descartar', { id });
};

export const desvincularBorrador = async (id_reunion, dominios) => {
  return api.post('/agendamiento/huerfanas/desvincular', { id_reunion, dominios });
};

