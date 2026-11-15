import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/cn';

export const fieldControlClasses =
  'w-full h-11 px-3.5 rounded-xl border-2 border-cream-300 bg-white text-coffee-900 placeholder:text-coffee-400 ' +
  'transition-colors duration-150 outline-none ' +
  'focus:border-coffee-500 focus:ring-4 focus:ring-coffee-500/10 ' +
  'disabled:bg-cream-100 disabled:text-coffee-400 disabled:cursor-not-allowed ' +
  'aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus:ring-danger-500/10';

/**
 * Input con label/hint/error integrados. Si no se pasa `label`, se
 * renderiza solo el control (útil para buscadores dentro de una barra).
 * `type="password"` agrega automáticamente un botón para mostrar/ocultar.
 */
const Input = forwardRef(function Input(
  { label, hint, error, id, required, className, wrapperClassName, icon: Icon, type, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  const control = (
    <div className={cn('relative', !label && wrapperClassName)}>
      {Icon && (
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-coffee-400"
          aria-hidden="true"
        />
      )}
      <input
        ref={ref}
        id={inputId}
        type={isPassword ? (visible ? 'text' : 'password') : type}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(fieldControlClasses, Icon && 'pl-10', isPassword && 'pr-11', className)}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-coffee-400 transition-colors hover:bg-cream-100 hover:text-coffee-600"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
        </button>
      )}
    </div>
  );

  if (!label) return control;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-coffee-700">
        {label}
        {required && <span className="ml-0.5 text-danger-500">*</span>}
      </label>
      {control}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-coffee-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
