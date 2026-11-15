import { cn } from '../../lib/cn';

/**
 * Encabezado de página consistente: ícono + título + subtítulo a la
 * izquierda, acciones a la derecha. Se envuelve en flex-wrap para mobile.
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coffee-700 text-cream-50">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-coffee-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-coffee-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
