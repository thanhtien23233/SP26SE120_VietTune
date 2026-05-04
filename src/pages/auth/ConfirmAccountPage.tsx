import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import Input from '@/components/common/Input';
import logo from '@/components/image/VietTune logo.png';
import { authService } from '@/services/authService';
import { ConfirmAccountForm } from '@/types';
import { uiToast, notifyLine } from '@/uiToast';

export default function ConfirmAccountPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Removed authentication guard to allow users to reach this page after registration
  // without needing to login first (since the backend blocks login for unconfirmed emails).

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmAccountForm>();

  const onSubmit = async (data: ConfirmAccountForm) => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <BackButton />
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="VietTune Logo"
            className="w-20 h-20 object-contain mb-4 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={80}
            height={80}
          />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Xác thực tài khoản</h1>
          <p className="text-neutral-600 font-medium">
            Nhập mã OTP đã được gửi đến email của bạn để kích hoạt tài khoản.
          </p>
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
              className="rounded-xl border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register('otp', {
                required: 'Mã OTP là bắt buộc',
                validate: (v) =>
                  /^\d{6}$/.test(String(v ?? '').trim()) ||
                  'Mã OTP phải gồm đúng 6 chữ số',
              })}
              error={errors.otp?.message}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary-600 text-white text-lg font-bold rounded-full hover:bg-primary-700 transition-all shadow-md active:scale-[0.98] disabled:bg-neutral-400"
          >
            {isLoading ? 'Đang xác thực...' : 'Xác nhận ngay'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              Trở về trang chủ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
