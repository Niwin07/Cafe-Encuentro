import { cn } from '../../lib/cn';

/**
 * Barra de tabs simple y controlada.
 * items: [{ value, label, icon?, count? }]
 */
export default function Tabs({ items, value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto no-scrollbar rounded-xl bg-cream-200 p-1',
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
              active ? 'bg-white text-coffee-800 shadow-soft' : 'text-coffee-500 hover:text-coffee-700'
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" aria-hidden="true" />}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold',
                  active ? 'bg-coffee-100 text-coffee-700' : 'bg-cream-300 text-coffee-600'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
