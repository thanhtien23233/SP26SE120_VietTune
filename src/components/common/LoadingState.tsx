import { memo } from 'react';

import LoadingSpinner from './LoadingSpinner';

type LoadingStateProps = {
  size?: 'sm' | 'md' | 'lg';
  /** Shown under the spinner */
  label?: string;
  /** Vertical padding for route-level / full-width suspense (default true) */
  padded?: boolean;
  className?: string;
};

/**
 * Consistent loading block: spinner + optional label. Prefer this over ad-hoc `LoadingSpinner` wrappers for route suspense and panels.
 */
function LoadingState({
  size = 'lg',
  label,
  padded = true,
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${padded ? 'py-10' : ''} ${className}`}
      role="status"
      aria-busy="true"
      aria-label={label ?? 'Đang tải'}
    >
      <LoadingSpinner size={size} />
      {label ? (
        <p className="text-sm font-medium text-neutral-600" aria-hidden="true">
          {label}
        </p>
      ) : null}
    </div>
  );
}

export default memo(LoadingState);
