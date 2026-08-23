import { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Coffee, Home } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { FullPageSpinner } from './components/ui/Spinner';
import Button from './components/ui/Button';
import Login from './pages/Auth/Login';
import MenuCajera from './pages/Menu/MenuCajera';
import VistaCocina from './pages/Destinos/VistaCocina';
import VistaCafeteria from './pages/Destinos/VistaCafeteria';
import VistaMozos from './pages/Mozos/VistaMozos';
import AdminPanel from './pages/Admin/AdminPanel';
import Registros from './pages/Admin/Registros';

// Requieren una cajera autenticada: sus datos y acciones dependen de
// endpoints protegidos por token en el backend (crear pedidos, CRUD de
// catálogo, historial de ventas).
// eslint-disable-next-line no-unused-vars -- Component solo se referencia dentro de JSX (<Component />)
function RutaProtegida({ component: Component }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation('/login');
  }, [loading, isAuthenticated, setLocation]);

  if (loading) return <FullPageSpinner label="Verificando sesión…" />;
  if (!isAuthenticated) return null;
  return <Component />;
}

function NoEncontrado() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-100 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-coffee-700 text-cream-50">
        <Coffee className="h-8 w-8" aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Página no encontrada</h1>
        <p className="mt-1 text-sm text-coffee-500">La página que buscás no existe o fue movida.</p>
      </div>
      <Button icon={Home} onClick={() => setLocation('/')}>
        Volver al inicio
      </Button>
    </div>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={VistaMozos} />
      <Route path="/login" component={Login} />

      {/* Pantallas de trabajo (sin login: pensadas para tablets fijas de cocina/cafetería) */}
      <Route path="/cocina" component={VistaCocina} />
      <Route path="/cafeteria" component={VistaCafeteria} />

      {/* Requieren cajera autenticada */}
      <Route path="/pedidos">
        <RutaProtegida component={MenuCajera} />
      </Route>
      <Route path="/admin">
        <RutaProtegida component={AdminPanel} />
      </Route>
      <Route path="/registros">
        <RutaProtegida component={Registros} />
      </Route>

      <Route component={NoEncontrado} />
    </Switch>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}
