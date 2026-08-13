import { cn } from '../../lib/cn';

/**
 * Superficie base. `interactive` agrega hover/focus para cards clicables
 * (recordar agregar role="button"/tabIndex/onKeyDown en el consumidor).
 */
// eslint-disable-next-line no-unused-vars -- Tag solo se referencia dentro de JSX (<Tag>), no como identificador plano
export default function Card({ as: Tag = 'div', interactive = false, padding = 'md', className, children, ...props }) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-7',
  };

  return (
    <Tag
      className={cn(
        'rounded-2xl bg-white border border-cream-300 shadow-card',
        interactive &&
          'transition-all duration-150 cursor-pointer hover:-translate-y-0.5 hover:shadow-elevated hover:border-coffee-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
