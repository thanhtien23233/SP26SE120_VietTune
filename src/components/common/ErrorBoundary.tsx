import { Component, type ErrorInfo, type ReactNode } from 'react';

import ErrorFallback from '@/components/common/ErrorFallback';
import { reportError } from '@/services/errorReporting';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Khu vực (main, auth, admin) để gửi kèm khi báo lỗi lên Sentry/LogRocket */
  region?: string;
  /** Optional custom fallback; if not provided, default UI is used */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function isDynamicImportFetchError(error: Error | null): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed')
  );
}

const DYNAMIC_IMPORT_RECOVERY_KEY = '__vt_dynamic_import_recovered_once__';

/**
 * React Error Boundary: catches JavaScript errors in the child tree,
 * displays a fallback UI instead of a blank screen, and optionally logs the error.
 * Must be a class component (React does not yet support error boundaries in function components).
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (isDynamicImportFetchError(error) && typeof window !== 'undefined') {
      try {
        const recovered = window.sessionStorage.getItem(DYNAMIC_IMPORT_RECOVERY_KEY);
        if (recovered !== '1') {
          window.sessionStorage.setItem(DYNAMIC_IMPORT_RECOVERY_KEY, '1');
          window.location.reload();
          return;
        }
      } catch {
        // Ignore storage access issues and continue fallback rendering.
      }
    }
    reportError(error, errorInfo, { region: this.props.region });
  }

  handleRetry = (): void => {
    if (isDynamicImportFetchError(this.state.error) && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback error={this.state.error} onRetry={this.handleRetry} variant="fullPage" />
      );
    }
    return this.props.children;
  }
}
