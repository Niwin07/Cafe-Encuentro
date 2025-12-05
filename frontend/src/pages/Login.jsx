import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Petición al backend
      const res = await api.post('/auth/login', formData);
      
      // Si es exitoso, usamos la función login del contexto
      if (res.data.token) {
        login(res.data.cajera, res.data.token);
      }
    } catch (err) {
      // Manejo de errores (credenciales inválidas, servidor caído, etc.)
      const msg = err.response?.data?.mensaje || 'Error al conectar con el servidor';
      setError(msg);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Iniciar Sesión</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Usuario:</label>
          <input 
            type="text" 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            value={formData.usuario}
            onChange={(e) => setFormData({...formData, usuario: e.target.value})}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>Contraseña:</label>
          <input 
            type="password" 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px' }}>
          Ingresar
        </button>
      </form>
    </div>
  );
};

export default Login;