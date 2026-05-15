import axios from "axios";

const API = "http://localhost:8080";

// Ejecutivas
export const getEjecutivas = async () => {
  const res = await axios.get(`${API}/ejecutivas`);
  return res.data;
};

// Jefaturas
export const getJefaturas = async () => {
  const res = await axios.get(`${API}/jefaturas`);
  return res.data;
};

// Empresas por ejecutiva
export const getEmpresasByEjecutiva = async (id) => {
  const res = await axios.get(`${API}/empresas/${id}`);
  return res.data;
};

// Empresas por jefatura
export const getEmpresasByJefatura = async (id) => {
  const res = await axios.get(`${API}/empresas/jefatura/${id}`);
  return res.data;
};
