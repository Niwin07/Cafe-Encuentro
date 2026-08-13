import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';
import { fieldControlClasses } from './Input';

const Textarea = forwardRef(function Textarea(
  { label, hint, error, id, required, className, wrapperClassName, rows = 3, ...props },
  ref
) {
  const autoId = useId();
  const textareaId = id || autoId;

  const control = (
    <textarea
      ref={ref}
      id={textareaId}
      rows={rows}
      aria-invalid={!!error}
      aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
      className={cn(fieldControlClasses, 'h-auto min-h-[5rem] py-2.5 resize-y', !label && wrapperClassName, className)}
      {...props}
    />
  );

  if (!label) return control;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={textareaId} className="mb-1.5 block text-sm font-semibold text-coffee-700">
        {label}
        {required && <span className="ml-0.5 text-danger-500">*</span>}
      </label>
      {control}
      {error ? (
        <p id={`${textareaId}-error`} className="mt-1.5 text-xs font-medium text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${textareaId}-hint`} className="mt-1.5 text-xs text-coffee-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Textarea;
