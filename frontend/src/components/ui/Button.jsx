import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary:
    'bg-coffee-700 text-cream-50 shadow-soft hover:bg-coffee-800 active:bg-coffee-900 disabled:bg-coffee-300',
  secondary:
    'bg-cream-200 text-coffee-800 border border-cream-400 hover:bg-cream-300 hover:border-cream-500 active:bg-cream-400 disabled:bg-cream-100 disabled:text-coffee-400',
  outline:
    'bg-transparent text-coffee-700 border-2 border-coffee-600 hover:bg-coffee-50 active:bg-coffee-100 disabled:border-coffee-300 disabled:text-coffee-300',
  ghost:
    'bg-transparent text-coffee-700 hover:bg-coffee-100 active:bg-coffee-200 disabled:text-coffee-300',
  danger:
    'bg-danger-500 text-white shadow-soft hover:bg-danger-600 active:bg-danger-700 disabled:bg-danger-100 disabled:text-danger-500/60',
  success:
    'bg-success-500 text-white shadow-soft hover:bg-success-600 active:bg-success-700 disabled:bg-success-100 disabled:text-success-500/60',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[0.9375rem] gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

/**
 * Botón base del design system. `loading` deshabilita el botón y muestra
 * un spinner en lugar del ícono izquierdo, manteniendo el texto visible.
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    fullWidth = false,
    className,
    disabled,
    children,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100',
        'disabled:cursor-not-allowed disabled:shadow-none',
        'active:scale-[0.98]',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-[1.1em] w-[1.1em] animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="h-[1.1em] w-[1.1em] shrink-0" aria-hidden="true" />
      )}
      {children}
      {!loading && IconRight && <IconRight className="h-[1.1em] w-[1.1em] shrink-0" aria-hidden="true" />}
    </button>
  );
});

export default Button;
