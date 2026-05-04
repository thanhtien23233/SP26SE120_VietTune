import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import LoginFormContent from '@/components/auth/LoginFormContent';
import LoadingState from '@/components/common/LoadingState';
import { ZitherStrings } from '@/components/image/pattern/BackgroundPatterns';
import logo from '@/components/image/VietTune logo.png';
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
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Left Side: Branding (7/10) */}
      <div className="md:w-[70%] bg-[#2C1810] flex items-center justify-center p-8 lg:p-24 order-2 md:order-1 relative overflow-hidden">
        <ZitherStrings />
        <div className="max-w-[750px] w-full text-center md:text-left relative z-10">
          <div className="flex justify-center md:justify-start mb-8">
            <img
              src={logo}
              alt="VietTune Logo"
              className="w-32 h-32 object-contain rounded-[2rem] shadow-2xl ring-4 ring-white/10 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate('/')}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={128}
              height={128}
            />
          </div>
          <h1 className="text-4xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-6">
            <span className="block">VietTune giúp bạn</span>
            <span className="block">kết nối và sẻ chia</span>
            <span className="block">âm hưởng nghìn năm.</span>
          </h1>
          <div className="h-1.5 w-24 bg-primary-600 mb-8 rounded-full hidden md:block"></div>
          <p className="text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl opacity-80">
            Khám phá, lưu giữ và lan tỏa di sản dân ca cùng cộng đồng. Âm hưởng nghìn năm, kết nối
            muôn đời qua từng bản thu.
          </p>
        </div>
      </div>

      {/* Right Side: Login Section (3/10) */}
      <div className="md:w-[30%] bg-white flex flex-col items-center justify-center p-8 lg:p-12 order-1 md:order-2 border-l border-neutral-100">
        <div className="w-full max-w-[400px]">
          <LoginFormContent
            onSuccess={handleSuccess}
            showGuestLink={!fromLogout}
          />
        </div>
      </div>
    </div>
  );
}
