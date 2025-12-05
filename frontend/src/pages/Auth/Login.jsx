import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', formData);
      if (res.data.token) login(res.data.cajera, res.data.token);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #faf8f5 0%, #e8d4b8 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Patrón decorativo de fondo */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.03,
        pointerEvents: 'none',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'var(--cafe-oscuro)',
          borderRadius: '50%',
          filter: 'blur(100px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'var(--cafe-claro)',
          borderRadius: '50%',
          filter: 'blur(120px)'
        }}></div>
      </div>

      {/* Container principal */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: '420px',
        zIndex: 1
      }} className="animate-fade-in">
        
        {/* Icono de taza decorativo */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '2rem'
        }} className="animate-bounce">
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, var(--cafe-medio), var(--cafe-claro))',
            padding: '1.5rem',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-lg)',
            transform: 'rotate(-5deg)',
            transition: 'transform 0.3s ease'
          }}>
            <span style={{ fontSize: '3.5rem' }}>☕</span>
          </div>
        </div>

        {/* Card principal - usando clase global */}
        <div className="card-elevated" style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ 
              fontSize: 'clamp(2rem, 5vw, 2.5rem)',
              background: 'linear-gradient(135deg, var(--cafe-oscuro), var(--cafe-claro))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem'
            }}>
              Café Encuentro
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
              Sistema de Gestión
            </p>
            <div style={{
              height: '3px',
              width: '60px',
              background: 'linear-gradient(90deg, var(--cafe-claro), var(--dorado))',
              margin: '0 auto',
              borderRadius: 'var(--radius-full)'
            }}></div>
          </div>

          {/* Alerta de error */}
          {error && (
            <div style={{ 
              background: 'var(--error-light)',
              border: '2px solid var(--error)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }} className="animate-fade-in">
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <span style={{ color: 'var(--error)', fontWeight: '500', fontSize: '0.875rem' }}>
                {error}
              </span>
            </div>
          )}
          
          {/* Formulario */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Campo Usuario */}
            <div>
              <label>Usuario</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.25rem',
                  pointerEvents: 'none',
                  color: 'var(--cafe-claro)'
                }}>
                  👤
                </div>
                <input 
                  type="text" 
                  required
                  value={formData.usuario}
                  onChange={(e) => setFormData({...formData, usuario: e.target.value})}
                  placeholder="Ingresa tu usuario"
                  style={{ paddingLeft: '3rem' }}
                  autoFocus
                />
              </div>
            </div>
            
            {/* Campo Contraseña */}
            <div>
              <label>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.25rem',
                  pointerEvents: 'none',
                  color: 'var(--cafe-claro)'
                }}>
                  🔒
                </div>
                <input 
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    color: 'var(--text-muted)',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--cafe-claro)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                >
                  {mostrarPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Botón Submit */}
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ 
                marginTop: '0.5rem',
                width: '100%'
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              ¿Problemas para acceder? Contacta al administrador
            </p>
          </div>
        </div>

        {/* Info de seguridad */}
        <div style={{ 
          marginTop: '1.5rem', 
          textAlign: 'center', 
          fontSize: '0.75rem', 
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span>🔒</span>
          <span>Conexión segura</span>
          <span>•</span>
          <span>Café Encuentro © 2025-2026</span>
        </div>
      </div>
    </div>
  );
};

export default Login;