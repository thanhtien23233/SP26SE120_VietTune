import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import Input from '@/components/common/Input';
import logo from '@/components/image/VietTune logo.png';
import { authService } from '@/services/authService';
import { uiToast, notifyLine } from '@/uiToast';

type ForgotForm = {
  email: string;
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>();

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      uiToast.success(
        notifyLine(
          'Đã gửi',
          'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
        ),
      );
      navigate('/login');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Không thể gửi yêu cầu. Vui lòng thử lại.'
          : 'Không thể gửi yêu cầu. Vui lòng thử lại.';
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
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Quên mật khẩu</h1>
          <p className="text-neutral-600 font-medium">
            Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Nhập địa chỉ email"
              className="rounded-xl border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register('email', {
                required: 'Email là bắt buộc',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Địa chỉ email không hợp lệ',
                },
              })}
              error={errors.email?.message}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary-600 text-white text-lg font-bold rounded-full hover:bg-primary-700 transition-all shadow-md active:scale-[0.98] disabled:bg-neutral-400"
          >
            {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-sm font-semibold text-primary-600 hover:underline">
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
