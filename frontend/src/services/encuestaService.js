import api from "./api";

const API = "/encuestas";

export const crearEncuesta = async (data) => {
  const res = await api.post(`${API}/crear`, data);
  return res.data;
};

export const obtenerTemplates = async () => {
  const res = await api.get(`${API}/templates`);
  return res.data;
};

export const obtenerEncuesta = async (token) => {
  const res = await api.get(`${API}/${token}`);
  return res.data;
};

export const responderEncuesta = async (data) => {
  const res = await api.post(`${API}/responder`, data);
  return res.data;
};

export const enviarCorreoEncuesta = async (email, url, encuestaId, userNombre) => {
  const res = await api.post(`${API}/enviar-correo`, { 
    email, 
    url, 
    encuesta_id: encuestaId, 
    user_nombre: userNombre 
  });
  return res.data;
};
