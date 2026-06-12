import api from "./api";

// Ejecutivas
export const getEjecutivas = async () => {
  const res = await api.get(`/ejecutivas`);
  return res.data;
};

// Jefaturas
export const getJefaturas = async () => {
  const res = await api.get(`/jefaturas`);
  return res.data;
};

// Empresas
export const getEmpresas = async () => {
  const res = await api.get(`/empresas`);
  return res.data;
};

// Empresas por ejecutiva
export const getEmpresasByEjecutiva = async (id) => {
  const res = await api.get(`/empresas/${id}`);
  return res.data;
};

// Empresas por jefatura
export const getEmpresasByJefatura = async (id) => {
  const res = await api.get(`/empresas/jefatura/${id}`);
  return res.data;
};

// Empresas por gerencia
export const getEmpresasByGerencia = async (id) => {
  const res = await api.get(`/empresas?gerencia_id=${id}`);
  return res.data;
};

// Usuarios asignados a una empresa
export const getUsuariosPorEmpresa = async (id) => {
  const res = await api.get(`/empresas/${id}/usuarios-asignados`);
  return res.data;
};
