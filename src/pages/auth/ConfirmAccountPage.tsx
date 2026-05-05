import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthHeader from '@/components/auth/AuthHeader';
import Input from '@/components/common/Input';
import backgroundImage from '@/components/image/background.png';
import logo from '@/components/image/viettune_logo_img';
import { authService } from '@/services/authService';
import { ConfirmAccountForm } from '@/types';
import { uiToast, notifyLine } from '@/uiToast';

export default function ConfirmAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(300);
  const [otpInlineError, setOtpInlineError] = useState('');
  const backgroundAttachment = useMemo(() => {
    if (typeof navigator === 'undefined') return 'fixed';

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);

    return isIOS ? 'scroll' : 'fixed';
  }, []);

  // Removed authentication guard to allow users to reach this page after registration
  // without needing to login first (since the backend blocks login for unconfirmed emails).

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ConfirmAccountForm>();
  const otpValue = watch('otp');
  const pendingEmail =
    location.state &&
    typeof location.state === 'object' &&
    'email' in location.state &&
    typeof (location.state as { email?: unknown }).email === 'string'
      ? (location.state as { email: string }).email
      : '';

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (!otpInlineError) return;
    setOtpInlineError('');
  }, [otpValue, otpInlineError]);

  const onSubmit = async (data: ConfirmAccountForm) => {
    setIsLoading(true);
    setOtpInlineError('');
    try {
      const result = await authService.confirmEmail(data.otp.trim());

      // Since axios only resolves on 2xx, reaching here means success at HTTP level
      const msg =
        result &&
        typeof result === 'object' &&
        'message' in result &&
        typeof (result as { message?: unknown }).message === 'string'
          ? (result as { message: string }).message
          : 'Xác thực tài khoản thành công.';
      uiToast.success(notifyLine('Thành công', msg));
      // Navigate to login after successful confirmation so they can now enter the system
      navigate('/login');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Xác thực thất bại. Vui lòng kiểm tra lại mã OTP.'
          : 'Xác thực thất bại. Vui lòng thử lại.';
      uiToast.error(notifyLine('Lỗi', errorMessage));
      setOtpInlineError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFF2D6]">
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
        <AuthHeader />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md px-4 pb-10 pt-6 sm:pb-12 sm:pt-8 lg:max-w-lg lg:pt-10">
        <div className="space-y-7 rounded-2xl border border-neutral-200/80 bg-surface-panel p-5 shadow-lg sm:space-y-8 sm:p-8">
          {/* Header Section */}
          <div className="mb-7 flex flex-col items-center text-center sm:mb-8">
            <img
              src={logo}
              alt="VietTune Logo"
              className="mb-4 h-20 w-20 cursor-pointer rounded-2xl object-contain transition-opacity hover:opacity-80"
            onClick={() => navigate('/')}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={80}
            height={80}
          />
            <h1 className="mb-2 text-2xl font-bold text-neutral-900">Xác thực tài khoản</h1>
            <p className="font-medium text-neutral-600">
              Nhập mã OTP gồm 6 chữ số đã gửi đến email của bạn để kích hoạt tài khoản.
            </p>
            {pendingEmail ? (
              <p className="mt-3 text-sm text-neutral-500">
                Mã OTP đã gửi tới: <span className="font-semibold text-neutral-700">{pendingEmail}</span>
              </p>
            ) : null}
          </div>

        {/* Form Section */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Mã OTP"
              placeholder="Nhập mã OTP (6 chữ số)"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              className="rounded-xl border-neutral-300 py-3.5 text-center text-2xl tracking-[0.45em] font-semibold focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register('otp', {
                required: 'Mã OTP là bắt buộc',
                validate: (v) =>
                  /^\d{6}$/.test(String(v ?? '').trim()) ||
                  'Mã OTP phải gồm đúng 6 chữ số',
              })}
                error={errors.otp?.message || otpInlineError}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-primary-600 py-3.5 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-700 active:scale-[0.98] disabled:bg-neutral-400"
          >
            {isLoading ? 'Đang xác thực...' : 'Kích hoạt tài khoản'}
          </button>

          <div className="text-center">
            {resendCountdown > 0 ? (
              <p className="text-sm font-medium text-neutral-500">
                Gửi lại mã sau {Math.floor(resendCountdown / 60)}:
                {String(resendCountdown % 60).padStart(2, '0')}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-sm font-semibold text-primary-600 hover:underline"
              >
                Không nhận được mã? Đăng ký lại
              </button>
            )}
          </div>

          <div className="pt-1 text-center sm:pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm font-semibold text-neutral-600 transition-colors hover:text-primary-600 hover:underline"
            >
              Trở về trang chủ
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}
