import axios from 'axios';

const api = axios.create({
  // En dev pega al backend local (npm run dev); en Vercel /api es el mismo
  // dominio (frontend/api/index.cjs), así que no hace falta URL absoluta
  // ni CORS.
  baseURL: import.meta.env.DEV ? 'http://localhost:5000/api' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
