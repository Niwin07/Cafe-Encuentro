import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { fieldControlClasses } from './Input';

const Select = forwardRef(function Select(
  { label, hint, error, id, required, className, wrapperClassName, icon: Icon, children, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;

  const control = (
    <div className={cn('relative', !label && wrapperClassName)}>
      {Icon && (
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-coffee-400"
          aria-hidden="true"
        />
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={cn(fieldControlClasses, 'appearance-none pr-10', Icon && 'pl-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400"
        aria-hidden="true"
      />
    </div>
  );

  if (!label) return control;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-semibold text-coffee-700">
        {label}
        {required && <span className="ml-0.5 text-danger-500">*</span>}
      </label>
      {control}
      {error ? (
        <p id={`${selectId}-error`} className="mt-1.5 text-xs font-medium text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="mt-1.5 text-xs text-coffee-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Select;
