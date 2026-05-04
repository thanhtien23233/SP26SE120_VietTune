import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import Footer from './Footer';
import Header from './Header';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import NotificationFeedBootstrap from '@/components/common/NotificationFeedBootstrap';
import backgroundImage from '@/components/image/background.png';
import { setItem } from '@/services/storageService';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const backgroundAttachment = useMemo(() => {
    if (typeof navigator === 'undefined') return 'fixed';

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // iOS Safari does not reliably support fixed attachment; use scroll fallback.
    return isIOS || prefersReducedMotion ? 'scroll' : 'fixed';
  }, []);

  // Researcher: trang chủ là Cổng nghiên cứu — chuyển "/" sang "/researcher" nếu đã xác thực và kích hoạt
  useEffect(() => {
    if (location.pathname === '/' && user?.role === UserRole.RESEARCHER && user?.isActive) {
      navigate('/researcher', { replace: true });
    }
  }, [location.pathname, user?.role, user?.isActive, navigate]);

  // Expert: trang chủ là Kiểm duyệt — chuyển "/" sang "/moderation" nếu đã xác thực và kích hoạt
  useEffect(() => {
    if (location.pathname === '/' && user?.role === UserRole.EXPERT && user?.isActive) {
      navigate('/moderation', { replace: true });
    }
  }, [location.pathname, user?.role, user?.isActive, navigate]);

  useEffect(() => {
    // Ghi nhớ trang truy cập cuối cùng (trừ đăng nhập/đăng ký và "/" khi Researcher/Expert)
    const currentPath = location.pathname;
    const skipSave =
      currentPath === '/login' ||
      currentPath === '/register' ||
      (currentPath === '/' &&
        (user?.role === UserRole.RESEARCHER || user?.role === UserRole.EXPERT));
    if (!skipSave) {
      void setItem('lastVisitedPage', currentPath);
    }
  }, [location, user?.role]);

  const mainBackgroundStyle = useMemo(
    () => ({
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover' as const,
      backgroundPosition: 'top center' as const,
      backgroundRepeat: 'no-repeat' as const,
      backgroundAttachment,
    }),
    [backgroundAttachment],
  );

  return (
    <div className="flex flex-col min-h-screen min-w-0 overflow-x-hidden bg-[#FFF2D6]">
      <NotificationFeedBootstrap />
      <Header />
      {/* Đủ chừa fixed header (pt-4 + nav có thể wrap 2 dòng); lg:pt-[4.75rem] trước đây quá thấp → nội dung/Hồ sơ bị che */}
      <main className="flex-grow min-w-0 w-full pt-32 lg:pt-40" style={mainBackgroundStyle}>
        <ErrorBoundary region="main">
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
