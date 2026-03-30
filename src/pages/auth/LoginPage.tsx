import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import Input from "@/components/common/Input";
import { LoginForm, ConfirmAccountForm } from "@/types";
import { notify } from "@/stores/notificationStore";
import logo from "@/components/image/VietTune logo.png";
import { sessionGetItem, sessionRemoveItem } from "@/services/storageService";
import { ZitherStrings } from "@/components/image/pattern/BackgroundPatterns";
import { resolvePostLoginPath } from "@/utils/routeAccess";

/** Safe internal path for post-login redirect (no open redirect). */
function getSafeRedirect(redirect: string | null): string | null {
  if (!redirect || typeof redirect !== "string") return null;
  const trimmed = redirect.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return null;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get("redirect"));
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const fromLogout = typeof window !== "undefined" && sessionGetItem("fromLogout") === "1";

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

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

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      if (response.success && response.data) {
        setUser(response.data.user);
        void sessionRemoveItem("fromLogout");
        const nextPath = resolvePostLoginPath(response.data.user, redirectTo);
        navigate(nextPath);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại."
          : "Đăng nhập thất bại. Vui lòng thử lại.";
          
      if (errorMessage.toLowerCase().includes("xác nhận email")) {
        setShowOtpModal(true);
      } else {
        notify.error("Lỗi đăng nhập", errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: ConfirmAccountForm) => {
    setIsOtpLoading(true);
    try {
      const result = await authService.confirmEmail(data.otp);
      const msg =
        result && typeof result === "object" && "message" in result && typeof (result as { message?: unknown }).message === "string"
          ? (result as { message: string }).message
          : "Xác thực tài khoản thành công.";
      notify.success("Thành công", msg);
      setShowOtpModal(false);
      resetOtpForm();
      
      // Tự động đăng nhập
      const loginData = getValues();
      if (loginData.email && loginData.password) {
        await onSubmit(loginData);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message || "Xác thực thất bại. Vui lòng kiểm tra lại mã OTP."
          : "Xác thực thất bại. Vui lòng thử lại.";
      notify.error("Lỗi", errorMessage);
    } finally {
      setIsOtpLoading(false);
    }
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
              onClick={() => navigate("/")}
            />
          </div>
          <h1 className="text-4xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-6">
            <span className="block">VietTune giúp bạn</span>
            <span className="block">kết nối và sẻ chia</span>
            <span className="block">âm hưởng nghìn năm.</span>
          </h1>
          <div className="h-1.5 w-24 bg-primary-600 mb-8 rounded-full hidden md:block"></div>
          <p className="text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl opacity-80">
            Khám phá, lưu giữ và lan tỏa di sản dân ca cùng cộng đồng. Âm hưởng nghìn năm, kết nối muôn đời qua từng bản thu.
          </p>
        </div>
      </div>

      {/* Right Side: Login Section (3/10) */}
      <div className="md:w-[30%] bg-white flex flex-col items-center justify-center p-8 lg:p-12 order-1 md:order-2 border-l border-neutral-100">
        <div className="w-full max-w-[400px]">
          <h2 className="text-xl font-bold text-neutral-900 mb-6 text-left">
            Đăng nhập vào VietTune
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <Input
                placeholder="Email hoặc số điện thoại"
                type="email"
                className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
                {...register("email", {
                  required: "Email là bắt buộc",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Địa chỉ email không hợp lệ",
                  },
                })}
                error={errors.email?.message}
              />

              <Input
                placeholder="Mật khẩu"
                type="password"
                className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
                {...register("password", {
                  required: "Mật khẩu là bắt buộc",
                })}
                error={errors.password?.message}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white text-lg font-bold rounded-full hover:bg-primary-700 transition-all disabled:bg-neutral-400 disabled:cursor-not-allowed shadow-none active:scale-[0.98] mt-2"
            >
              {isLoading ? "Đang xử lý..." : "Đăng nhập"}
            </button>

            <div className="text-center mt-4">
              <a
                href="#"
                className="text-primary-600 hover:underline text-sm font-medium"
              >
                Quên mật khẩu?
              </a>
            </div>

            <div className="my-10 flex items-center justify-center">
              {/* Optional: Add a subtle separator if needed, but image is very clean */}
            </div>

            <div className="flex justify-center flex-col space-y-6">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="w-full py-3 bg-white border border-primary-600 text-primary-600 text-lg font-bold rounded-full transition-all hover:bg-primary-50 active:scale-[0.98]"
              >
                Tạo tài khoản mới
              </button>

              {/* <div className="flex items-center justify-center gap-1 opacity-60 mt-4">
                <span className="text-xs font-bold text-neutral-800 tracking-wider flex items-center gap-1.5 uppercase">
                  <img src={logo} alt="" className="w-4 h-4 rounded-sm grayscale opacity-50" />
                  VietTune
                </span>
              </div> */}
            </div>
          </form>

          {!fromLogout && (
            <div className="mt-8 text-center">
              <Link to="/" className="text-xs font-semibold text-neutral-400 hover:text-primary-600 transition-colors uppercase tracking-widest">
                Tiếp tục với tư cách khách
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#fff2d6] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-700 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold">Xác thực email</h3>
              <button
                onClick={() => setShowOtpModal(false)}
                className="text-white hover:text-neutral-200 text-xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 md:p-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 border border-red-200 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-neutral-800 font-medium text-center mb-6 px-4">
                Vui lòng nhập mã OTP đã được gửi đến email của bạn để xác thực tài khoản.
              </p>
              
              <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="w-full space-y-4">
                <Input
                  placeholder="Nhập mã OTP (6 chữ số)"
                  className="border-neutral-300 py-3.5 focus:border-red-600 text-center text-lg tracking-widest shadow-none ring-0 focus:ring-2 focus:ring-red-600/20"
                  {...registerOtp("otp", {
                    required: "Mã OTP là bắt buộc",
                    minLength: {
                      value: 6,
                      message: "Mã OTP phải có 6 ký tự",
                    },
                    maxLength: {
                      value: 6,
                      message: "Mã OTP phải có 6 ký tự",
                    },
                  })}
                  error={otpErrors.otp?.message}
                />
                <button
                  type="submit"
                  disabled={isOtpLoading}
                  className="w-full py-3.5 mt-2 bg-red-700 text-white text-lg font-bold rounded-full hover:bg-red-800 transition-all shadow-md active:scale-[0.98] disabled:bg-neutral-400"
                >
                  {isOtpLoading ? "Đang xác thực..." : "Xác nhận ngay"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

