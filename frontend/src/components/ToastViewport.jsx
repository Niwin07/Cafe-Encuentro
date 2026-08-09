import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ToastViewport = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" role="region" aria-label="Notificaciones">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant] || Info;
        return (
          <div
            key={t.id}
            className={`toast toast-${t.variant}`}
            role={t.variant === 'error' ? 'alert' : 'status'}
            aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
          >
            <Icon className="toast-icon" size={20} aria-hidden="true" />
            <span className="toast-message">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastViewport;
