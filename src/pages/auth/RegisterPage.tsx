import { BookOpen, Lock, Music } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';

import AuthHeader from '@/components/auth/AuthHeader';
import Input from '@/components/common/Input';
import TermsAndConditions from '@/components/features/TermsAndConditions';
import backgroundImage from '@/components/image/background.png';
import logo from '@/components/image/viettune_logo_img';
import { authService } from '@/services/authService';
import { sessionGetItem, sessionRemoveItem } from '@/services/storageService';
import { RegisterForm } from '@/types';
import { uiToast, notifyLine } from '@/uiToast';
import { cn } from '@/utils/helpers';
import { validatePassword } from '@/utils/validation';

type RegisterRole = 'contributor' | 'researcher';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RegisterRole>('contributor');
  const fromLogout = typeof window !== 'undefined' && sessionGetItem('fromLogout') === '1';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');
  const backgroundAttachment = useMemo(() => {
    if (typeof navigator === 'undefined') return 'fixed';

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);

    return isIOS ? 'scroll' : 'fixed';
  }, []);

  useEffect(() => {
    void sessionRemoveItem('fromLogout');
  }, []);

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const payload = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
      };
      const result =
        selectedRole === 'researcher'
          ? await authService.registerResearcher(payload)
          : await authService.register(payload);

      const msg =
        result &&
        typeof result === 'object' &&
        'message' in result &&
        typeof (result as { message?: unknown }).message === 'string'
          ? (result as { message: string }).message
          : 'Đăng ký thành công. Vui lòng xác thực tài khoản.';
      uiToast.success(notifyLine('Thành công', msg));
      navigate('/confirm-account', { state: { email: data.email } });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Đăng ký thất bại. Vui lòng thử lại.'
          : 'Đăng ký thất bại. Vui lòng thử lại.';
      uiToast.error(notifyLine('Lỗi', errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF2D6] relative overflow-hidden">
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
        {/* Header Section */}
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
            <h1 className="mb-2 text-2xl font-bold text-neutral-900">Tham gia VietTune</h1>
            <p className="font-medium text-neutral-600">
              Tạo tài khoản để kết nối và sẻ chia âm hưởng nghìn năm.
            </p>
          </div>

        {/* Form Section */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Role selector */}
          <fieldset>
              <legend className="mb-3 text-center text-sm font-semibold text-neutral-800">
              Bạn muốn tham gia với vai trò nào?
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedRole('contributor')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 text-center transition-all duration-200',
                  selectedRole === 'contributor'
                    ? 'border-secondary-400 bg-cream-50 text-neutral-900 shadow-md shadow-secondary-500/20 scale-[1.02]'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
                )}
              >
                <Music className="h-6 w-6 shrink-0" strokeWidth={2} />
                <span className="text-sm font-bold">Người đóng góp</span>
                <span className="text-[11px] leading-tight opacity-80">
                  Tải lên và chia sẻ bản thu âm nhạc dân tộc
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('researcher')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 text-center transition-all duration-200',
                  selectedRole === 'researcher'
                    ? 'border-secondary-400 bg-cream-50 text-neutral-900 shadow-md shadow-secondary-500/20 scale-[1.02]'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
                )}
              >
                <BookOpen className="h-6 w-6 shrink-0" strokeWidth={2} />
                <span className="text-sm font-bold">Nhà nghiên cứu</span>
                <span className="text-[11px] leading-tight opacity-80">
                  Phân tích, so sánh và khai thác kho dữ liệu
                </span>
              </button>
            </div>
          </fieldset>

            <div className="space-y-4 sm:space-y-5">
              <Input
                labelColor="dark"
                label="Họ và tên"
                placeholder="Nhập họ và tên đầy đủ"
                className="border-neutral-300 py-3 sm:py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
                {...register('fullName', {
                  required: 'Họ và tên là bắt buộc',
                })}
                error={errors.fullName?.message}
              />

              <Input
                labelColor="dark"
                label="Số điện thoại"
                placeholder="Nhập số điện thoại"
                className="border-neutral-300 py-3 sm:py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
                {...register('phoneNumber', {
                  required: 'Số điện thoại là bắt buộc',
                  pattern: {
                    value: /^[0-9]{10,11}$/,
                    message: 'Số điện thoại không hợp lệ (10-11 chữ số)',
                  },
                })}
                error={errors.phoneNumber?.message}
              />

              <Input
                labelColor="dark"
                label="Địa chỉ Email"
                type="email"
                placeholder="Nhập địa chỉ email"
                className="border-neutral-300 py-3 sm:py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
                {...register('email', {
                  required: 'Email là bắt buộc',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Địa chỉ email không hợp lệ',
                  },
                })}
                error={errors.email?.message}
              />

              <Input
                labelColor="dark"
                label="Mật khẩu"
                type="password"
                placeholder="Ít nhất 6 ký tự, chữ hoa, chữ thường và số"
                className="border-neutral-300 py-3 sm:py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
                {...register('password', {
                  required: 'Mật khẩu là bắt buộc',
                  validate: (v) => {
                    const r = validatePassword(v || '');
                    return r.valid || r.errors[0];
                  },
                })}
                error={errors.password?.message}
              />

              <Input
                labelColor="dark"
                label="Xác nhận mật khẩu"
                type="password"
                placeholder="Nhập lại mật khẩu"
                className="border-neutral-300 py-3 sm:py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
                {...register('confirmPassword', {
                  required: 'Vui lòng xác nhận mật khẩu',
                  validate: (value) => value === password || 'Mật khẩu không khớp',
                })}
                error={errors.confirmPassword?.message}
              />
            </div>

          {/* Legal / Terms */}
          <div className="text-center">
            <p className="text-[11px] text-neutral-400 leading-relaxed px-4">
              Bằng cách nhấn đăng ký, bạn đồng ý với{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="font-bold text-primary-600 hover:underline"
              >
                Điều khoản & Điều kiện
              </button>{' '}
              và Chính sách bảo mật của VietTune.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-primary-600 py-3.5 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-[0.98] disabled:bg-neutral-400 disabled:shadow-none"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            Dữ liệu của bạn được mã hóa và bảo vệ an toàn.
          </p>

          <div className="text-center pt-2">
            <Link to="/login" className="text-sm font-semibold text-primary-600 hover:underline">
              Đã có tài khoản? <span className="text-secondary-400">Đăng nhập tại đây</span>
            </Link>
          </div>
          </form>
        </div>
      </div>

      <TermsAndConditions isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
