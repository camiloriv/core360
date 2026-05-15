import axios from "axios";

// ✅ Base URL dinámica desde variables de entorno
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

export default api;

