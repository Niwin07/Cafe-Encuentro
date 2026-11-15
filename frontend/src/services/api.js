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

// Si el backend rechaza el token (expirado/inválido) en cualquier llamada
// autenticada, limpiamos la sesión y volvemos al login. El intento de login
// en sí puede devolver 401 por credenciales incorrectas: eso no es una
// sesión vencida, así que se excluye explícitamente.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginRequest && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
