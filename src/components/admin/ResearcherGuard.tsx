import { useEffect, useMemo } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LogIn, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  evaluateGuardAccess,
  RESEARCHER_ROUTE_POLICY,
  isResearcherPendingApproval,
  logGuardDecision,
} from "@/utils/routeAccess";

/** Card & button styles đồng bộ UploadPage / UploadMusic: rounded-2xl, #FFFCF5, rounded-full, shadow-lg */
const cardClass =
  "w-full max-w-md border border-neutral-200/80 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl p-4 sm:p-6 lg:p-8";
const cardStyle = { backgroundColor: "#FFFCF5" };

export default function ResearcherGuard() {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const decision = useMemo(
    () =>
      evaluateGuardAccess(
        user,
        location.pathname,
        RESEARCHER_ROUTE_POLICY,
        { isAuthLoading: isLoading }
      ),
    [isLoading, location.pathname, user]
  );
  const canAccess = decision.status === "allow";
  const decisionStatus = decision.status;
  const decisionReason = decision.status === "redirect" ? decision.reason : null;
  const redirectTo = decision.status === "redirect" ? decision.redirectTo : null;
  const isPendingApproval = isResearcherPendingApproval(user);

  useEffect(() => {
    logGuardDecision("ResearcherGuard", location.pathname, decision);
    // Keep inactive users on this page so they can see pending/inactive guidance.
    if (decisionReason === "inactive") {
      return;
    }
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
      <div className="min-h-[calc(100vh-4.5rem)] min-w-0 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className={`${cardClass} text-center`} style={cardStyle}>
          <div className="flex flex-col items-center gap-6">
            <div className="p-2 bg-primary-600/20 rounded-lg flex-shrink-0">
              <LogIn className="w-5 h-5 text-primary-600" strokeWidth={2.5} />
            </div>
            <LoadingSpinner size="lg" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">Đang chuyển đến đăng nhập…</h2>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Bạn cần đăng nhập để truy cập Cổng Nghiên Cứu.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    decision.status === "redirect" &&
    decision.reason === "inactive" &&
    isPendingApproval
  ) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] min-w-0 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className={`${cardClass} text-center`} style={cardStyle}>
          <div className="flex flex-col items-center gap-6">
            <div className="p-2 bg-primary-600/20 rounded-lg flex-shrink-0">
               <ShieldAlert className="w-5 h-5 text-primary-600" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">Đang chờ quản trị viên phê duyệt</h2>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Tài khoản của bạn cần quản trị viên phê duyệt để truy cập Cổng Nghiên Cứu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-neutral-200/80 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-br from-primary-600 to-primary-700 text-white focus:outline-none"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (decision.status === "redirect" && decision.reason === "unauthorized") {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] min-w-0 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className={`${cardClass} text-center`} style={cardStyle}>
          <div className="flex flex-col items-center gap-6">
            <div className="p-2 bg-primary-600/20 rounded-lg flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-primary-600" strokeWidth={2.5} />
            </div>
            <LoadingSpinner size="lg" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">Đang chuyển trang…</h2>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Tài khoản của bạn không có quyền truy cập Cổng Nghiên Cứu.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (decision.status === "redirect" && decision.reason === "inactive") {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] min-w-0 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className={`${cardClass} text-center`} style={cardStyle}>
          <div className="flex flex-col items-center gap-6">
            <div className="p-2 bg-primary-600/20 rounded-lg flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-primary-600" strokeWidth={2.5} />
            </div>
            <LoadingSpinner size="lg" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">Tài khoản chưa khả dụng</h2>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Tài khoản của bạn hiện chưa thể truy cập Cổng Nghiên Cứu.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-neutral-200/80 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none text-neutral-800"
                style={{ backgroundColor: "#FFFCF5" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F0E8")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFCF5")}
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => navigate("/", { replace: true })}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-neutral-200/80 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-br from-primary-600 to-primary-700 text-white focus:outline-none"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccess) return null;

  return (
    <ErrorBoundary region="researcher">
      <Outlet />
    </ErrorBoundary>
  );
}
