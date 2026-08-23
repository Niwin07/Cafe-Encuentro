import { cn } from '../../lib/cn';

export default function EmptyState({ icon: Icon, title, description, action, className, compact = false }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cream-200 text-coffee-400">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      {title && <h3 className="text-lg font-bold text-coffee-800">{title}</h3>}
      {description && <p className="mt-1.5 max-w-sm text-sm text-coffee-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
