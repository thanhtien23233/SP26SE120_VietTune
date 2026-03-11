import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import Input from "@/components/common/Input";
import BackButton from "@/components/common/BackButton";
import { RegisterForm, UserRole } from "@/types";
import { notify } from "@/stores/notificationStore";
import backgroundImage from "@/components/image/Đàn bầu.png";
import logo from "@/components/image/VietTune logo.png";
import TermsAndConditions from "@/components/features/TermsAndConditions";
import { getItem, sessionGetItem, sessionRemoveItem } from "@/services/storageService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const fromLogout = typeof window !== "undefined" && sessionGetItem("fromLogout") === "1";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch("password");

  // Clear fromLogout when entering Register so that returning to Login shows "Trở về".
  useEffect(() => {
    void sessionRemoveItem("fromLogout");
  }, []);

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const result = await authService.register(data);
      void sessionRemoveItem("fromLogout");
      const rawUser = result?.data && typeof result.data === "object" && "user" in result.data ? (result.data as { user: import("@/types").User }).user : null;
      // Mặc định khách đăng ký là Người đóng góp (CONTRIBUTOR)
      const user = rawUser
        ? { ...rawUser, role: (rawUser.role ?? UserRole.CONTRIBUTOR) as import("@/types").UserRole }
        : null;
      if (user) {
        setUser(user);
        notify.success("Thành công", result.message ?? "Đăng ký thành công. Bạn đã được đăng nhập.");
        navigate("/");
      } else {
        notify.success("Thành công", "Đăng ký thành công! Vui lòng đăng nhập.");
        navigate("/login");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message || "Đăng ký thất bại. Vui lòng thử lại."
          : "Đăng ký thất bại. Vui lòng thử lại.";
      notify.error("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="h-screen flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {!fromLogout && <div className="absolute top-4 right-4"><BackButton /></div>}
      <div className="max-w-xl w-full">
        <form
          className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl border border-neutral-200/80 shadow-2xl transition-all duration-300 hover:shadow-2xl space-y-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-col items-center">
            <img
              src={logo}
              alt="VietTune Logo"
              className="w-12 h-12 object-contain mb-1 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                void sessionRemoveItem("fromLogout");
                if (!authService.isAuthenticated()) {
                  navigate("/");
                  return;
                }
                const lastPage = getItem("lastVisitedPage");
                navigate(lastPage || "/");
              }}
            />
            <h2 className="text-center text-xl font-bold text-neutral-800">
              Tạo tài khoản của bạn
            </h2>
            <p className="text-center text-sm text-neutral-600">
              Đã có tài khoản?{" "}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700 active:text-primary-800"
              >
                Đăng nhập
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Họ và tên"
              {...register("fullName", {
                required: "Họ và tên là bắt buộc",
              })}
              error={errors.fullName?.message}
            />

            <Input
              label="Tên người dùng"
              {...register("username", {
                required: "Tên người dùng là bắt buộc",
                minLength: {
                  value: 3,
                  message: "Tên người dùng phải có ít nhất 3 ký tự",
                },
              })}
              error={errors.username?.message}
            />
          </div>

          <Input
            label="Email"
            type="email"
            {...register("email", {
              required: "Email là bắt buộc",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Địa chỉ email không hợp lệ",
              },
            })}
            error={errors.email?.message}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Mật khẩu"
              type="password"
              {...register("password", {
                required: "Mật khẩu là bắt buộc",
                minLength: {
                  value: 6,
                  message: "Mật khẩu phải có ít nhất 6 ký tự",
                },
              })}
              error={errors.password?.message}
            />

            <Input
              label="Xác nhận mật khẩu"
              type="password"
              {...register("confirmPassword", {
                required: "Vui lòng xác nhận mật khẩu",
                validate: (value) =>
                  value === password || "Mật khẩu không khớp",
              })}
              error={errors.confirmPassword?.message}
            />
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              required
              className="h-3.5 w-3.5 bg-white text-primary-600 focus:outline-none border-2 border-neutral-400 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-neutral-700">
              Tôi đồng ý với{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-primary-600 hover:text-primary-700 active:text-primary-800 underline transition-colors"
              >
                Điều khoản và Điều kiện
              </button>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:bg-neutral-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </button>
        </form>
      </div>

      <TermsAndConditions
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />
    </div>
  );
}
