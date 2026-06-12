import api from "./api";

// export const obtenerEventosCalendario = async (startDateTime, endDateTime) => {
//   return api.get(`/agendamiento/calendario?start=${startDateTime}&end=${endDateTime}`);
// };

// export const crearReunionTeams = async (data) => {
//   return api.post(`/agendamiento`, data);
// };

export const obtenerEventosCalendario = async (startDateTime, endDateTime) => {
  return api.get(`/agendamiento/calendario?start=${startDateTime}&end=${endDateTime}`);
};

export const crearReunionTeams = async (data) => {
  return api.post(`/agendamiento`, data);
};

export const anularReunionTeams = (payload) => {
  return api.post('/agendamiento/anular', payload);
};
