import axios from "axios";

const API = "http://localhost:8080/encuestas";

export const crearEncuesta = async (data) => {
  const res = await axios.post(`${API}/crear`, data);
  return res.data;
};

export const obtenerTemplates = async () => {
  const res = await axios.get(`${API}/templates`);
  return res.data;
};

export const obtenerEncuesta = async (token) => {
  const res = await axios.get(`${API}/${token}`);
  return res.data;
};

export const responderEncuesta = async (data) => {
  const res = await axios.post(`${API}/responder`, data);
  return res.data;
};

export const enviarCorreoEncuesta = async (email, url, encuesta_id) => {
  const res = await axios.post(`${API}/enviar-correo`, { email, url, encuesta_id });
  return res.data;
};
