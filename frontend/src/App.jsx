import { Route, Switch } from 'wouter';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Auth/Login';
import MenuCajera from './pages/Menu/MenuCajera';
import VistaCocina from './pages/Destinos/VistaCocina';
import VistaCafeteria from './pages/Destinos/VistaCafeteria';
import VistaMozos from './pages/Mozos/VistaMozos'; // <--- IMPORTAR
import AdminPanel from './pages/Admin/AdminPanel';
import Registros from './pages/Admin/Registros';
import RutaProtegida from './components/RutaProtegida';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Switch>
          <Route path="/" component={VistaMozos} />
          
          {/* Vistas Públicas de Trabajo */}
          <Route path="/cocina" component={VistaCocina} />
          <Route path="/cafeteria" component={VistaCafeteria} />
          <Route path="/login" component={Login} />

          {/* Vistas privadas (el backend exige token en todas sus llamadas) */}
          <Route path="/pedidos"><RutaProtegida component={MenuCajera} /></Route>
          <Route path="/registros"><RutaProtegida component={Registros} /></Route>
          <Route path="/admin"><RutaProtegida component={AdminPanel} /></Route>
          
          <Route>
            <center><h3>Página no encontrada</h3></center>
          </Route>
        </Switch>
      </div>
    </AuthProvider>
  );
}

export default App;