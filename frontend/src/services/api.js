import axios from 'axios';

const api = axios.create({
  // En dev pega al backend local (npm run dev); en Vercel /api es el mismo
  // dominio (frontend/api/index.js), así que no hace falta URL absoluta
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

// Si el backend rechaza el token (expirado a los 2 días o inválido), se limpia
// la sesión y se vuelve al login. Antes la cajera veía "Request failed with
// status code 401" y no podía cargar pedidos hasta borrar el navegador.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const teniaToken = !!error.config?.headers?.Authorization;
    const esLogin = error.config?.url?.includes('/auth/login');

    if (status === 401 && teniaToken && !esLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Mensaje legible para mostrar al usuario. El backend responde
 * { error, mensaje }; antes se mostraba error.message de axios
 * ("Request failed with status code 400") y se perdía el motivo real
 * (p. ej. "Stock insuficiente para ...").
 */
export const mensajeError = (error, porDefecto = 'Ocurrió un error') =>
  error?.response?.data?.mensaje ||
  error?.response?.data?.error ||
  (error?.response ? porDefecto : 'Error de conexión con el servidor');

export default api;
