import { cn } from '../../lib/cn';

/**
 * Tabla responsive: se renderiza como <table> real en desktop y como
 * lista de tarjetas en mobile (mismo dato, sin duplicar markup por página).
 *
 * columns: [{ key, header, align?, render(row), cardLabel? (false para
 *   omitir del resumen mobile, ej. la columna "principal" que ya se ve
 *   como título de la tarjeta) }]
 */
export default function Table({ columns, data, keyField = 'id', emptyState, renderActions, onRowClick, className }) {
  if (!data || data.length === 0) {
    return emptyState || null;
  }

  return (
    <>
      {/* Desktop */}
      <div className={cn('hidden overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-card md:block', className)}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-cream-300 bg-cream-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-bold uppercase tracking-wide text-coffee-500',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  )}
                >
                  {col.header}
                </th>
              ))}
              {renderActions && <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-coffee-500">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-cream-200 last:border-0 transition-colors hover:bg-cream-50',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm text-coffee-800',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">{renderActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-3 md:hidden">
        {data.map((row) => (
          <div
            key={row[keyField]}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              'rounded-2xl border border-cream-300 bg-white p-4 shadow-card',
              onRowClick && 'cursor-pointer active:bg-cream-50'
            )}
          >
            <dl className="flex flex-col gap-2">
              {columns.map((col) => {
                if (col.cardLabel === false) {
                  return (
                    <div key={col.key} className="text-sm text-coffee-800">
                      {col.render(row)}
                    </div>
                  );
                }
                return (
                  <div key={col.key} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-xs font-bold uppercase tracking-wide text-coffee-400">{col.header}</dt>
                    <dd className="min-w-0 text-right text-sm text-coffee-800">{col.render(row)}</dd>
                  </div>
                );
              })}
            </dl>
            {renderActions && (
              <div className="mt-3 flex justify-end gap-1.5 border-t border-cream-200 pt-3" onClick={(e) => e.stopPropagation()}>
                {renderActions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
