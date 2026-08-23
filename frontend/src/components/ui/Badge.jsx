import { cn } from '../../lib/cn';

const VARIANTS = {
  neutral: 'bg-cream-200 text-coffee-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-info-100 text-info-700',
  gold: 'bg-gold-100 text-gold-700',
  solid: 'bg-coffee-700 text-cream-50',
};

const SIZES = {
  sm: 'h-5 px-2 text-[0.6875rem] gap-1',
  md: 'h-6 px-2.5 text-xs gap-1.5',
};

export default function Badge({ variant = 'neutral', size = 'md', icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold uppercase tracking-wide',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}
