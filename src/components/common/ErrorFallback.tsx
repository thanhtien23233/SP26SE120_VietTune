import { AlertTriangle } from 'lucide-react';
import { memo } from 'react';
import type { ReactNode } from 'react';

export type ErrorFallbackProps = {
  error: Error | null;
  onRetry?: () => void;
  /** Full-page centered layout (error boundary); `embedded` for smaller panels */
  variant?: 'fullPage' | 'embedded';
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
  retryLabel?: string;
  /** Extra actions below buttons */
  extra?: ReactNode;
};

/** Friendly error UI with retry + home link. Used by `ErrorBoundary` and can be reused manually. */
function ErrorFallback({
  error,
  onRetry,
  variant = 'fullPage',
  title = 'Đã xảy ra lỗi',
  description = 'Ứng dụng gặp sự cố không mong muốn. Bạn có thể thử lại hoặc quay về trang chủ.',
  homeHref = '/',
  homeLabel = 'Về trang chủ',
  retryLabel = 'Thử lại',
  extra,
}: ErrorFallbackProps) {
  const shell =
    variant === 'fullPage'
      ? 'min-h-screen flex items-center justify-center px-4 bg-neutral-50'
      : 'flex items-center justify-center px-4 py-8 bg-neutral-50/80 rounded-xl border border-neutral-200/80';

  return (
    <div className={shell} role="alert" aria-live="assertive">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-6">
          <AlertTriangle className="w-8 h-8" aria-hidden />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">{title}</h1>
        <p className="text-neutral-600 mb-6">{description}</p>
        {import.meta.env.DEV && error && (
          <pre className="text-left text-xs bg-neutral-200 text-neutral-800 p-3 rounded-lg mb-6 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
            >
              {retryLabel}
            </button>
          )}
          <a
            href={homeHref}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold rounded-full transition-all duration-200 cursor-pointer focus:outline-none"
          >
            {homeLabel}
          </a>
        </div>
        {extra}
      </div>
    </div>
  );
}

export default memo(ErrorFallback);
