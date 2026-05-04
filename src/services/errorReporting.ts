import * as Sentry from '@sentry/react';
import type { ErrorInfo } from 'react';

export interface ErrorReportContext {
  /** Khu vực / route (main, auth, admin) để lọc lỗi trên dashboard */
  region?: string;
  [key: string]: unknown;
}

/** Reporter được gọi trong componentDidCatch; có thể gắn Sentry, LogRocket, v.v. */
let reporter: ((error: Error, errorInfo?: ErrorInfo, context?: ErrorReportContext) => void) | null =
  null;

/**
 * Khởi tạo error reporting: nếu có VITE_SENTRY_DSN thì bật Sentry;
 * có thể gọi thêm setErrorReporter cho LogRocket hoặc service khác.
 */
export function initErrorReporting(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn && typeof dsn === 'string' && dsn.trim() !== '') {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
    });
    setErrorReporter((error, errorInfo, context) => {
      Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo?.componentStack,
          ...context,
        },
      });
    });
  }
}

/**
 * Đăng ký reporter tùy chỉnh (LogRocket, custom backend, v.v.).
 * Gọi sau initErrorReporting nếu muốn thêm bên cạnh Sentry.
 */
export function setErrorReporter(
  fn: (error: Error, errorInfo?: ErrorInfo, context?: ErrorReportContext) => void,
): void {
  reporter = fn;
}

/**
 * Báo lỗi từ Error Boundary (hoặc bất kỳ đâu).
 * Nếu đã gọi setErrorReporter (Sentry/LogRocket), sẽ gửi lên service;
 * không thì chỉ log trong DEV.
 */
export function reportError(
  error: Error,
  errorInfo?: ErrorInfo,
  context?: ErrorReportContext,
): void {
  if (reporter) {
    try {
      reporter(error, errorInfo, context);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Error reporter threw:', e);
      }
    }
  }
  if (import.meta.env.DEV) {
    console.error('[ErrorBoundary] reportError:', error, errorInfo, context);
  }
}
