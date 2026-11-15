/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

export const AuthContext = createContext();

// Lectura sincrónica: en el primer render ya se sabe si hay sesión.
// Antes se cargaba en un useEffect, así que el primer render siempre veía
// user = null (parpadeo y guardas de ruta imposibles de implementar bien).
const leerUsuarioGuardado = () => {
  try {
    const storedUser = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    return storedUser && token ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(leerUsuarioGuardado);
  const [, setLocation] = useLocation();

  // Al abrir la app se valida el token guardado contra el backend. Si expiró
  // o es inválido, el interceptor de api.js limpia la sesión y lleva a /login;
  // si la cajera fue desactivada (403) se cierra la sesión acá.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/verificar').catch((error) => {
      if (error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setUser(null);
      }
    });
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(userData));
    setUser(userData);
    setLocation('/pedidos');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUser(null);
    setLocation('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
