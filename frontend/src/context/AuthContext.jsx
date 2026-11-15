import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Estado inicial leído de forma síncrona de localStorage (evita un
  // flash de "no autenticado" antes de que el efecto de abajo corra).
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('usuario');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));
  const [, setLocation] = useLocation();

  // Confirmamos la sesión guardada contra el backend: el token pudo vencer
  // o la cajera pudo ser desactivada desde que se guardó en localStorage.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    api
      .get('/auth/verificar')
      .then(({ data }) => {
        setUser(data.cajera);
        localStorage.setItem('usuario', JSON.stringify(data.cajera));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    (cajera, token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(cajera));
      setUser(cajera);
      setLocation('/pedidos');
    },
    [setLocation]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUser(null);
    setLocation('/login');
  }, [setLocation]);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
