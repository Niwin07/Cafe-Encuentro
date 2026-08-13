import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/cn';

const STYLES = {
  success: { icon: CheckCircle2, border: 'border-l-success-500', iconColor: 'text-success-500' },
  error: { icon: XCircle, border: 'border-l-danger-500', iconColor: 'text-danger-500' },
  warning: { icon: AlertTriangle, border: 'border-l-warning-500', iconColor: 'text-warning-500' },
  info: { icon: Info, border: 'border-l-info-500', iconColor: 'text-info-500' },
};

export default function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed inset-x-3 top-3 z-[100] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-96"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => {
        const { icon: Icon, border, iconColor } = STYLES[t.variant] || STYLES.info;
        return (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
            className={cn(
              'flex items-start gap-3 rounded-xl border-l-4 bg-white p-3.5 shadow-elevated animate-slideDown',
              border
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColor)} aria-hidden="true" />
            <p className="flex-1 whitespace-pre-line text-sm font-medium text-coffee-800">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 rounded-lg p-1 text-coffee-400 transition-colors hover:bg-cream-100 hover:text-coffee-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
