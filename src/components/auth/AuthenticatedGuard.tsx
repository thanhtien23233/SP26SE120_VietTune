import { useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import {
  AUTHENTICATED_ROUTE_POLICY,
  evaluateGuardAccess,
  logGuardDecision,
} from '@/utils/routeAccess';

export default function AuthenticatedGuard() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();
  const location = useLocation();
  const decision = useMemo(
    () =>
      evaluateGuardAccess(user, location.pathname, AUTHENTICATED_ROUTE_POLICY, {
        isAuthLoading: isLoading,
      }),
    [isLoading, location.pathname, user],
  );
  const decisionReason = decision.status === 'redirect' ? decision.reason : null;
  const redirectTo = decision.status === 'redirect' ? decision.redirectTo : null;

  useEffect(() => {
    logGuardDecision('AuthenticatedGuard', location.pathname, decision);
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [decision, decisionReason, location.pathname, navigate, redirectTo]);

  if (
    decision.status === 'defer' ||
    (decision.status === 'redirect' && decision.reason === 'unauthenticated')
  ) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4">
        <Card variant="bordered" className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">Đang chuyển đến đăng nhập…</p>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Bạn cần đăng nhập để truy cập trang này.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (decision.status === 'redirect' && decision.reason === 'unauthorized') {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4">
        <Card variant="bordered" className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">Đang chuyển trang…</p>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Tài khoản của bạn không thể truy cập nội dung này.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (decision.status === 'redirect' && decision.reason === 'inactive') {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4">
        <Card variant="bordered" className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">Tài khoản chưa khả dụng</p>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Tài khoản hiện chưa thể sử dụng tính năng này.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Quay lại
              </Button>
              <Button variant="primary" onClick={() => navigate('/', { replace: true })}>
                Về trang chủ
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary region="main">
      <Outlet />
    </ErrorBoundary>
  );
}
