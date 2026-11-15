import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  solid: 'bg-coffee-700 text-cream-50 hover:bg-coffee-800 active:bg-coffee-900',
  subtle: 'bg-cream-200 text-coffee-700 hover:bg-cream-300 active:bg-cream-400',
  ghost: 'bg-transparent text-coffee-600 hover:bg-coffee-100 active:bg-coffee-200',
  'on-dark': 'bg-cream-50/15 text-cream-50 border border-cream-50/25 hover:bg-cream-50/25',
  danger: 'bg-transparent text-danger-500 hover:bg-danger-50 active:bg-danger-100',
};

const SIZES = {
  sm: 'h-9 w-9 rounded-lg [&>svg]:h-4 [&>svg]:w-4',
  md: 'h-11 w-11 rounded-xl [&>svg]:h-5 [&>svg]:w-5',
  lg: 'h-12 w-12 rounded-xl [&>svg]:h-5 [&>svg]:w-5',
};

/**
 * Botón de solo ícono. `label` es obligatorio (se usa como aria-label);
 * el ícono se pasa como children (ej. <IconButton label="Cerrar"><X /></IconButton>).
 */
const IconButton = forwardRef(function IconButton(
  { variant = 'subtle', size = 'md', label, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center shrink-0 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed active:scale-95',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export default IconButton;
