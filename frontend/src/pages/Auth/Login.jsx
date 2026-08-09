import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { Coffee, User, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';

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
            <Coffee size={56} color="white" aria-hidden="true" />
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
            }} className="animate-fade-in" role="alert">
              <AlertTriangle size={20} color="var(--error)" aria-hidden="true" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--error)', fontWeight: '500', fontSize: '0.875rem' }}>
                {error}
              </span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Campo Usuario */}
            <div>
              <label htmlFor="login-usuario">Usuario</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--cafe-claro)'
                  }}
                />
                <input
                  id="login-usuario"
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
              <label htmlFor="login-password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--cafe-claro)'
                  }}
                />
                <input
                  id="login-password"
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    color: 'var(--text-muted)',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cafe-claro)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{
                marginTop: '0.5rem',
                width: '100%'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

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
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Conexión segura</span>
          <span>•</span>
          <span>Café Encuentro © 2025-2026</span>
        </div>
      </div>
    </div>
  );
};

export default Login;