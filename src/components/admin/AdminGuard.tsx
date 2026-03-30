import { useEffect, useMemo } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import Card from "@/components/common/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";
import {
  ADMIN_ROUTE_POLICY,
  evaluateGuardAccess,
  logGuardDecision,
} from "@/utils/routeAccess";
export default function AdminGuard() {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const decision = useMemo(
    () =>
      evaluateGuardAccess(user, location.pathname, ADMIN_ROUTE_POLICY, {
        isAuthLoading: isLoading,
      }),
    [isLoading, location.pathname, user]
  );
  const isAdmin = decision.status === "allow";
  const decisionStatus = decision.status;
  const decisionReason = decision.status === "redirect" ? decision.reason : null;
  const redirectTo = decision.status === "redirect" ? decision.redirectTo : null;

  useEffect(() => {
    logGuardDecision("AdminGuard", location.pathname, decision);
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [
    decision,
    decisionReason,
    decisionStatus,
    location.pathname,
    navigate,
    redirectTo,
  ]);

  if (
    decision.status === "defer" ||
    (decision.status === "redirect" && decision.reason === "unauthenticated")
  ) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4">
        <Card variant="bordered" className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">Đang chuyển đến đăng nhập…</p>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Bạn cần đăng nhập để truy cập trang quản trị.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (decision.status === "redirect" && decision.reason === "unauthorized") {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4">
        <Card variant="bordered" className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">Đang chuyển trang…</p>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Bạn không có quyền truy cập khu vực quản trị.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (decision.status === "redirect" && decision.reason === "inactive") {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4">
        <Card variant="bordered" className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">Tài khoản chưa khả dụng</p>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Tài khoản của bạn hiện chưa thể truy cập khu vực quản trị.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Quay lại
              </Button>
              <Button variant="primary" onClick={() => navigate("/", { replace: true })}>
                Về trang chủ
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <ErrorBoundary region="admin">
      <Outlet />
    </ErrorBoundary>
  );
}