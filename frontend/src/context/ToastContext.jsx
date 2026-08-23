import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ToastViewport from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolveRef = useRef(null);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'info', options = {}) => {
      const id = ++idCounter;
      const duration = options.duration ?? (variant === 'error' ? 6000 : 4000);
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({
        message,
        title: options.title || 'Confirmar acción',
        confirmLabel: options.confirmLabel || 'Confirmar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        danger: options.danger ?? false,
      });
    });
  }, []);

  const closeConfirm = useCallback((result) => {
    setConfirmState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  // Memoizado para que `useToast()` devuelva una referencia estable: así se
  // puede usar con seguridad dentro de arrays de dependencias sin disparar
  // renders/efectos de más.
  const api = useMemo(
    () => ({
      success: (msg, opts) => push(msg, 'success', opts),
      error: (msg, opts) => push(msg, 'error', opts),
      info: (msg, opts) => push(msg, 'info', opts),
      warning: (msg, opts) => push(msg, 'warning', opts),
      confirm,
    }),
    [push, confirm]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      {confirmState && (
        <ConfirmDialog {...confirmState} onConfirm={() => closeConfirm(true)} onCancel={() => closeConfirm(false)} />
      )}
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
};
