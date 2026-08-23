import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function Spinner({ size = 24, className, label = 'Cargando…' }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <Loader2 className={cn('animate-spin text-coffee-500', className)} style={{ width: size, height: size }} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner({ label = 'Cargando…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-coffee-500">
      <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
