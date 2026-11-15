import { useContext } from 'react';
import { Redirect } from 'wouter';
import { AuthContext } from '../context/AuthContext';

/**
 * Renderiza el componente solo si hay sesión; si no, redirige a /login.
 * Antes /pedidos, /admin y /registros se mostraban sin sesión y cada acción
 * fallaba con un 401 sin explicación.
 */
const RutaProtegida = ({ component }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const Componente = component;
  return isAuthenticated ? <Componente /> : <Redirect to="/login" />;
};

export default RutaProtegida;
