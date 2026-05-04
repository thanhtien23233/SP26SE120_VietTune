import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import Input from '@/components/common/Input';
import { authService } from '@/services/authService';
import { sessionRemoveItem } from '@/services/storageService';
import { useAuthStore } from '@/stores/authStore';
import { LoginForm, ConfirmAccountForm, type User } from '@/types';
import { uiToast, notifyLine } from '@/uiToast';

export type LoginFormContentProps = {
  onSuccess: (user: User) => void;
  /** Optional id for the main heading (e.g. `aria-labelledby` on a dialog). */
  titleId?: string;
  className?: string;
  /** When false, hides "Tiếp tục với tư cách khách" (e.g. after logout). */
  showGuestLink?: boolean;
  /** Override default navigation to /register (e.g. close modal first). */
  onRegisterClick?: () => void;
  /** E.g. close login modal before navigating to forgot-password. */
  onForgotPasswordClick?: () => void;
  /** Called when user presses Escape on the main form (not while OTP overlay is open). */
  onRequestClose?: () => void;
  /** Lets parent adjust layering (e.g. modal backdrop) when OTP is shown. */
  onOtpModalOpenChange?: (open: boolean) => void;
};

export default function LoginFormContent({
  onSuccess,
  titleId,
  className = '',
  showGuestLink = true,
  onRegisterClick,
  onForgotPasswordClick,
  onRequestClose,
  onOtpModalOpenChange,
}: LoginFormContentProps) {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const mainFlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mainFlowRef.current;
    if (!el) return;
    if (showOtpModal) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [showOtpModal]);

  useEffect(() => {
    onOtpModalOpenChange?.(showOtpModal);
  }, [showOtpModal, onOtpModalOpenChange]);

  useEffect(() => {
    if (!showOtpModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowOtpModal(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showOtpModal]);

  useEffect(() => {
    if (!onRequestClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showOtpModal) return;
      e.preventDefault();
      onRequestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onRequestClose, showOtpModal]);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>();

  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    reset: resetOtpForm,
  } = useForm<ConfirmAccountForm>();

  const runLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authService.login({
        ...data,
        email: data.email.trim(),
      });
      if (response.success && response.data) {
        setUser(response.data.user);
        void sessionRemoveItem('fromLogout');
        uiToast.success('auth.login.success');
        onSuccess(response.data.user);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Đăng nhập thất bại. Vui lòng thử lại.'
          : 'Đăng nhập thất bại. Vui lòng thử lại.';

      if (errorMessage.toLowerCase().includes('xác nhận email')) {
        setShowOtpModal(true);
      } else {
        uiToast.error(notifyLine('Lỗi đăng nhập', errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: ConfirmAccountForm) => {
    setIsOtpLoading(true);
    try {
      const result = await authService.confirmEmail(data.otp.trim());
      const msg =
        result &&
        typeof result === 'object' &&
        'message' in result &&
        typeof (result as { message?: unknown }).message === 'string'
          ? (result as { message: string }).message
          : 'Xác thực tài khoản thành công.';
      uiToast.success(notifyLine('Thành công', msg));
      setShowOtpModal(false);
      resetOtpForm();

      const loginData = getValues();
      if (loginData.email?.trim() && loginData.password) {
        await runLogin({ ...loginData, email: loginData.email.trim() });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Xác thực thất bại. Vui lòng kiểm tra lại mã OTP.'
          : 'Xác thực thất bại. Vui lòng thử lại.';
      uiToast.error(notifyLine('Lỗi', errorMessage));
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <div className={className}>
      <h2
        id={titleId}
        className="text-xl font-bold text-neutral-900 mb-6 text-left"
      >
        Đăng nhập vào VietTune
      </h2>

      <div ref={mainFlowRef}>
        <form onSubmit={handleSubmit(runLogin)} className="space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="Email hoặc số điện thoại"
              type="text"
              autoComplete="username"
              className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register('email', {
                required: 'Email hoặc số điện thoại là bắt buộc',
                validate: (v) => {
                  const s = String(v ?? '').trim();
                  const emailOk = /^\S+@\S+\.\S+$/.test(s);
                  const phoneOk = /^[0-9]{10,11}$/.test(s);
                  return (
                    emailOk ||
                    phoneOk ||
                    'Nhập email hợp lệ hoặc số điện thoại 10–11 chữ số'
                  );
                },
              })}
              error={errors.email?.message}
            />

            <Input
              placeholder="Mật khẩu"
              type="password"
              className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register('password', {
                required: 'Mật khẩu là bắt buộc',
              })}
              error={errors.password?.message}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary-600 text-white text-lg font-bold rounded-full hover:bg-primary-700 transition-all disabled:bg-neutral-400 disabled:cursor-not-allowed shadow-none active:scale-[0.98] mt-2"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              className="text-primary-600 hover:underline text-sm font-medium bg-transparent border-0 cursor-pointer p-0"
              onClick={() => {
                onForgotPasswordClick?.();
                navigate('/forgot-password');
              }}
            >
              Quên mật khẩu?
            </button>
          </div>

          <div className="my-10 flex items-center justify-center" />

          <div className="flex justify-center flex-col space-y-6">
            <button
              type="button"
              onClick={() => (onRegisterClick ? onRegisterClick() : navigate('/register'))}
              className="w-full py-3 bg-white border border-primary-600 text-primary-600 text-lg font-bold rounded-full transition-all hover:bg-primary-50 active:scale-[0.98]"
            >
              Tạo tài khoản mới
            </button>
          </div>
        </form>

        {showGuestLink && (
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-xs font-semibold text-neutral-400 hover:text-primary-600 transition-colors uppercase tracking-widest"
            >
              Tiếp tục với tư cách khách
            </Link>
          </div>
        )}
      </div>

      {showOtpModal && (
        <div
          className="login-otp-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-otp-title"
        >
          <div className="login-otp-card bg-[#fff2d6] w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-red-700 px-6 py-4 flex justify-between items-center text-white">
              <h3 id="login-otp-title" className="text-lg font-bold">
                Xác thực email
              </h3>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-white hover:text-neutral-200 text-xl font-bold p-1 leading-none"
                aria-label="Đóng"
              >
                &times;
              </button>
            </div>

            <div className="p-6 md:p-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 border border-red-200 shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-neutral-800 font-medium text-center mb-6 px-4">
                Vui lòng nhập mã OTP đã được gửi đến email của bạn để xác thực tài khoản.
              </p>

              <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="w-full space-y-4">
                <Input
                  placeholder="Nhập mã OTP (6 chữ số)"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="border-neutral-300 py-3.5 focus:border-red-600 text-center text-lg tracking-widest shadow-none ring-0 focus:ring-2 focus:ring-red-600/20"
                  {...registerOtp('otp', {
                    required: 'Mã OTP là bắt buộc',
                    validate: (v) =>
                      /^\d{6}$/.test(String(v ?? '').trim()) ||
                      'Mã OTP phải gồm đúng 6 chữ số',
                  })}
                  error={otpErrors.otp?.message}
                />
                <button
                  type="submit"
                  disabled={isOtpLoading}
                  className="w-full py-3.5 mt-2 bg-red-700 text-white text-lg font-bold rounded-full hover:bg-red-800 transition-all shadow-md active:scale-[0.98] disabled:bg-neutral-400"
                >
                  {isOtpLoading ? 'Đang xác thực...' : 'Xác nhận ngay'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
