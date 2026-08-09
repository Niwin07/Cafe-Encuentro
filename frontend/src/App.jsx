import { Route, Switch } from 'wouter';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Auth/Login';
import MenuCajera from './pages/Menu/MenuCajera';
import VistaCocina from './pages/Destinos/VistaCocina';
import VistaCafeteria from './pages/Destinos/VistaCafeteria';
import VistaMozos from './pages/Mozos/VistaMozos'; // <--- IMPORTAR
import AdminPanel from './pages/Admin/AdminPanel';
import Registros from './pages/Admin/Registros';
import { ToastProvider } from './context/ToastContext';

function NotFound() {
  return (
    <div className="not-found-page">
      <h1>404</h1>
      <p>No encontramos esta página.</p>
      <a href="/" className="btn btn-primary">Volver al inicio</a>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <div className="app-container">
          <Switch>
            <Route path="/" component={VistaMozos} />

            {/* Vistas Públicas de Trabajo */}
            <Route path="/cocina" component={VistaCocina} />
            <Route path="/cafeteria" component={VistaCafeteria} />
            <Route path="/registros" component={Registros} />
            <Route path="login" component={Login} />

            {/* Vista Privada */}
            <Route path="/pedidos" component={MenuCajera} />
            {/* Panel de Administración */}
            <Route path="/admin" component={AdminPanel} />

            <Route component={NotFound} />
          </Switch>
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;