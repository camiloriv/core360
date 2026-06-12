import axios from "axios";

// ✅ Base URL dinámica desde variables de entorno
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

// Interceptor para agregar el token JWT a todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejar errores globales de autenticación (401)
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // Si el error es de autorización (token expirado o inválido), limpiar datos y redirigir
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("storage")); // Para disparar la actualización de estado en App.jsx si es necesario
    window.location.href = "/login";
  }
  return Promise.reject(error);
});

export default api;
