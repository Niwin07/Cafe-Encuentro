import { forwardRef, useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Checkbox con label clicable, estilo custom sobre un <input> nativo
 * (accesible: el input real sigue ahí, solo se oculta visualmente).
 */
const Checkbox = forwardRef(function Checkbox({ label, description, id, className, wrapperClassName, ...props }, ref) {
  const autoId = useId();
  const checkboxId = id || autoId;

  return (
    <div className={cn('flex items-start gap-2.5', wrapperClassName)}>
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={cn(
            'peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-cream-400 bg-white',
            'transition-colors checked:border-coffee-700 checked:bg-coffee-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        <Check
          className="pointer-events-none absolute h-3.5 w-3.5 text-cream-50 opacity-0 peer-checked:opacity-100"
          aria-hidden="true"
        />
      </div>
      {label && (
        <label htmlFor={checkboxId} className="cursor-pointer select-none text-sm text-coffee-800">
          <span className="font-medium">{label}</span>
          {description && <span className="block text-xs text-coffee-500">{description}</span>}
        </label>
      )}
    </div>
  );
});

export default Checkbox;
