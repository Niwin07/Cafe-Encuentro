import { cn } from '../../lib/cn';

export default function Skeleton({ className }) {
  return <div className={cn('skeleton animate-shimmer rounded-lg', className)} aria-hidden="true" />;
}

/** Grilla de skeletons con forma de card, para listados en carga. */
export function SkeletonGrid({ count = 6, className }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-cream-300 bg-white p-3">
          <Skeleton className="mb-3 h-28 w-full rounded-xl" />
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
