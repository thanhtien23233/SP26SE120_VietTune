import { clsx } from 'clsx';

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-lg',
        'bg-gradient-to-r from-neutral-100 via-cream-100 to-neutral-100 bg-[length:200%_100%]',
        className
      )}
    />
  );
}

export function TableSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-neutral-200/60 bg-surface-panel shadow-md overflow-hidden">
      {/* Header row skeleton */}
      <div className="border-b border-neutral-100 px-6 py-3.5 flex items-center gap-8">
        <SkeletonBar className="h-3 w-24" />
        <SkeletonBar className="h-3 w-20" />
        <SkeletonBar className="h-3 w-16" />
        <div className="flex-1" />
        <SkeletonBar className="h-3 w-14" />
      </div>

      {/* Row skeletons */}
      <div className="divide-y divide-neutral-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between px-6 py-4 gap-6">
            <div className="flex-1 space-y-2">
              <SkeletonBar className="h-4 w-40" />
              <SkeletonBar className="h-3 w-28 opacity-60" />
            </div>
            <SkeletonBar className="h-6 w-20 rounded-full" />
            <div className="w-20 flex justify-end gap-2">
              <SkeletonBar className="h-8 w-8 rounded-lg" />
              <SkeletonBar className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
