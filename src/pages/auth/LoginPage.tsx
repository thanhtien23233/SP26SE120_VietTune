import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AuthHeader from '@/components/auth/AuthHeader';
import LoginFormContent from '@/components/auth/LoginFormContent';
import LoadingState from '@/components/common/LoadingState';
import backgroundImage from '@/components/image/background.png';
import logo from '@/components/image/viettune_logo_img';
import { sessionGetItem } from '@/services/storageService';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import { parseSafeRedirectParam, resolvePostLoginPath } from '@/utils/routeAccess';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = parseSafeRedirectParam(searchParams.get('redirect'));
  const user = useAuthStore((s) => s.user);
  const fromLogout = typeof window !== 'undefined' && sessionGetItem('fromLogout') === '1';
  const backgroundAttachment = useMemo(() => {
    if (typeof navigator === 'undefined') return 'fixed';

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);

    return isIOS ? 'scroll' : 'fixed';
  }, []);

  // Already signed in: leave /login (guard/bookmark). Skip while logging out — session clears in a microtask after navigate.
  useEffect(() => {
    if (!user || fromLogout) return;
    navigate(resolvePostLoginPath(user, redirectTo), { replace: true });
  }, [user, fromLogout, redirectTo, navigate]);

  if (user && !fromLogout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState size="lg" padded={false} />
      </div>
    );
  }

  const handleSuccess = (user: User) => {
    const nextPath = resolvePostLoginPath(user, redirectTo);
    navigate(nextPath);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FFF2D6]">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment,
        }}
      />

      <div className="relative z-10">
        <AuthHeader hideHomeLink={fromLogout} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-10 pt-5 sm:pb-12 sm:pt-8 lg:max-w-xl lg:pt-10">
        <div className="rounded-2xl border border-neutral-200/80 bg-surface-panel p-6 shadow-lg sm:p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src={logo}
              alt="VietTune Logo"
              className="mb-4 h-20 w-20 cursor-pointer rounded-2xl object-contain transition-opacity hover:opacity-80"
              onClick={() => navigate('/')}
              loading="eager"
              // @ts-expect-error -- fetchpriority is valid HTML but React types lag behind
              fetchpriority="high"
              decoding="async"
              width={80}
              height={80}
            />
            <h1 className="mb-2 text-2xl font-bold text-neutral-900">Đăng nhập vào VietTune</h1>
            <p className="font-medium text-neutral-600">
              Tiếp tục khám phá và lưu giữ âm nhạc truyền thống Việt Nam.
            </p>
          </div>
          <LoginFormContent
            onSuccess={handleSuccess}
            showGuestLink={!fromLogout}
          />
        </div>
      </div>
    </div>
  );
}
