import api from "./api";

export const getJefaturas = () => api.get("/jefaturas");
export const getEjecutivas = () => api.get("/ejecutivas");

export const getEmpresas = (id) =>  api.get(`/empresas/jefatura/${id}`);

export const crearReunion = (data) =>  api.post("/reuniones", data);
