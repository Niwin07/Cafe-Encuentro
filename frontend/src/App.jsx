import { Route, Switch } from 'wouter';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import MenuCajera from './pages/MenuCajera';
import VistaCocina from './pages/VistaCocina';
import VistaCafeteria from './pages/VistaCafeteria';
import VistaMozos from './pages/VistaMozos'; // <--- IMPORTAR
import AdminPanel from './pages/AdminPanel';
import Registros from './pages/Registros';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Switch>
          <Route path="/" component={Login} />
          
          {/* Vistas Públicas de Trabajo */}
          <Route path="/cocina" component={VistaCocina} />
          <Route path="/cafeteria" component={VistaCafeteria} />
          <Route path="/registros" component={Registros} />
          <Route path="/mozos" component={VistaMozos} /> {/* <--- NUEVA RUTA */}

          {/* Vista Privada */}
          <Route path="/pedidos" component={MenuCajera} />
          {/* Panel de Administración */}
          <Route path="/admin" component={AdminPanel} />
          
          <Route>
            <center><h3>Página no encontrada</h3></center>
          </Route>
        </Switch>
      </div>
    </AuthProvider>
  );
}

export default App;