import { clsx } from 'clsx';

interface EntityStatusBadgeProps {
  isActive: boolean;
}

export function EntityStatusBadge({ isActive }: EntityStatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide',
        isActive
          ? 'bg-green-50 text-green-700 border border-green-200/60'
          : 'bg-neutral-100 text-neutral-500 border border-neutral-200/60'
      )}
      aria-label={isActive ? 'Trạng thái: Hoạt động' : 'Trạng thái: Tạm ẩn'}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full',
          isActive ? 'bg-green-500' : 'bg-neutral-400'
        )}
      />
      {isActive ? 'Hoạt động' : 'Tạm ẩn'}
    </span>
  );
}
