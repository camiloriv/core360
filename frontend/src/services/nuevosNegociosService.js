import api from "./api";

const BASE = "/nuevos-negocios";

export const listarNuevosNegocios = (params = {}) =>
  api.get(BASE, { params }).then((r) => r.data);

export const obtenerStats = () =>
  api.get(`${BASE}/stats`).then((r) => r.data);

export const obtenerOpciones = () =>
  api.get(`${BASE}/opciones`).then((r) => r.data);

export const obtenerDetalle = (id) =>
  api.get(`${BASE}/${id}`).then((r) => r.data);

export const obtenerHistorial = (id) =>
  api.get(`${BASE}/${id}/historial`).then((r) => r.data);

export const crearNuevoNegocio = (data) =>
  api.post(BASE, data).then((r) => r.data);

export const actualizarNuevoNegocio = (id, data) =>
  api.put(`${BASE}/${id}`, data).then((r) => r.data);

export const cambiarEstadoNegocio = (id, data) =>
  api.patch(`${BASE}/${id}/estado`, data).then((r) => r.data);

export const eliminarNuevoNegocio = (id) =>
  api.delete(`${BASE}/${id}`).then((r) => r.data);

export const exportarExcel = (params = {}) =>
  api.get(`${BASE}/export/excel`, { params, responseType: "blob" }).then((r) => {
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Seguimiento_Nuevos_Negocios_2026.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  });

export const importarNuevosNegocios = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`${BASE}/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then((r) => r.data);
};
