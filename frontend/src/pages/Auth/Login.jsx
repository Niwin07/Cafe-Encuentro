import { useState } from 'react';
import { AlertCircle, Coffee, Lock, LogIn, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function Login() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', formData);
      login(data.cajera, data.token);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo conectar con el servidor. Intentá nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cream-100 via-cream-200 to-coffee-200 p-4">
      <div className="w-full max-w-sm animate-fadeIn">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-4 flex h-16 w-16 rotate-[-4deg] items-center justify-center rounded-2xl bg-coffee-700 text-cream-50 shadow-elevated">
            <Coffee className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-coffee-900 sm:text-3xl">Café Encuentro</h1>
          <p className="mt-1 text-sm text-coffee-500">Sistema de gestión</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-3xl border border-cream-300 bg-white/95 p-6 shadow-floating sm:p-7"
        >
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700"
            >
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Input
              label="Usuario"
              icon={User}
              value={formData.usuario}
              onChange={handleChange('usuario')}
              placeholder="Ingresá tu usuario"
              autoFocus
              autoComplete="username"
              required
            />
            <Input
              label="Contraseña"
              icon={Lock}
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" fullWidth size="lg" loading={loading} icon={loading ? undefined : LogIn} className="mt-6">
            {loading ? 'Verificando…' : 'Ingresar al sistema'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-coffee-500">
          ¿Problemas para acceder? Contactá al administrador.
        </p>
      </div>
    </div>
  );
}
