import { useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import Card from "@/components/common/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";
export default function AdminGuard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === UserRole.ADMIN && user?.isActive;

  useEffect(() => {
    if (!user) {
      const redirect = encodeURIComponent(location.pathname);
      navigate(`/login?redirect=${redirect}`, { replace: true });
      return;
    }
    if (!isAdmin) {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, navigate, location.pathname]);

  if (!user) {
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

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4">
        <Card variant="bordered" className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <div>
              <p className="text-lg font-semibold text-neutral-900">Không đủ quyền truy cập</p>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Tài khoản của bạn không có quyền truy cập khu vực quản trị.
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

  return (
    <ErrorBoundary region="admin">
      <Outlet />
    </ErrorBoundary>
  );
}