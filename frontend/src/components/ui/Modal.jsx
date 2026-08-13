import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import IconButton from './IconButton';

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
};

/**
 * Diálogo base: hoja completa desde abajo en mobile, panel centrado en
 * desktop. Cierra con Escape y con click en el overlay.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', className }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Foco inicial en el panel para lectores de pantalla / navegación por teclado
    panelRef.current?.focus();
    // Evita el scroll del body detrás del modal
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-950/50 backdrop-blur-[2px] p-0 animate-fadeIn sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-floating',
          'animate-sheetUp sm:animate-scaleIn sm:rounded-2xl',
          SIZES[size],
          className
        )}
      >
        {(title || onClose) && (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-cream-200 px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="truncate text-lg font-bold text-coffee-900">
                  {title}
                </h2>
              )}
              {description && <p className="mt-0.5 text-sm text-coffee-500">{description}</p>}
            </div>
            {onClose && (
              <IconButton label="Cerrar" size="sm" variant="ghost" onClick={onClose} className="shrink-0">
                <X className="h-[18px] w-[18px]" />
              </IconButton>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="shrink-0 border-t border-cream-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
