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

export const getSyncStatus = async () => {
  return api.get('/agendamiento/sync-status');
};

export const obtenerHuerfanas = async () => {
  return api.get('/agendamiento/teams-eventos');
};

export const vincularHuerfana = async (id, empresa_id, dominios) => {
  return api.post(`/agendamiento/teams-eventos/${id}/vincular`, { empresa_id, dominios });
};

// No longer used, marked as ignorada in /reuniones/:id/no-aplica
export const descartarHuerfana = async (id) => {
  return api.put(`/reuniones/${id}/no-aplica`, { noAplica: true });
};

export const desvincularBorrador = async (id_reunion, dominios) => {
  return api.post(`/agendamiento/teams-eventos/${id_reunion}/desvincular`, { dominios });
};

