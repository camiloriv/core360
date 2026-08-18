const dashboardRepository = require("../../database/repositories/encuestas.dashboard.repository");

const obtenerTodasLasRespuestas = async () => {
  return await dashboardRepository.obtenerTodasLasRespuestas();
};

const obtenerPromediosPorDimension = async (usuario_id, rol) => {
  return await dashboardRepository.obtenerPromediosPorDimension(usuario_id, rol);
};

const obtenerRankingEjecutivas = async (usuario_id, rol) => {
  return await dashboardRepository.obtenerRankingEjecutivas(usuario_id, rol);
};

const obtenerDetalleRespuestas = async (usuario_id, rol) => {
  return await dashboardRepository.obtenerDetalleRespuestas(usuario_id, rol);
};

module.exports = {
  obtenerTodasLasRespuestas,
  obtenerPromediosPorDimension,
  obtenerRankingEjecutivas,
  obtenerDetalleRespuestas
};
