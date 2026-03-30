import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "@/services/authService";
import Input from "@/components/common/Input";
import BackButton from "@/components/common/BackButton";
import { RegisterForm } from "@/types";
import { notify } from "@/stores/notificationStore";
import logo from "@/components/image/VietTune logo.png";
import TermsAndConditions from "@/components/features/TermsAndConditions";
import { sessionGetItem, sessionRemoveItem } from "@/services/storageService";
import { BronzeDrum } from "@/components/image/pattern/BackgroundPatterns";

export default function RegisterPage() {
  const navigate = useNavigate();
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
      const payload = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
      };
      const result = await authService.registerResearcher(payload);
      
      // Since axios only resolves on 2xx, reaching here means success
      const msg =
        result && typeof result === "object" && "message" in result && typeof (result as { message?: unknown }).message === "string"
          ? (result as { message: string }).message
          : "Đăng ký thành công. Vui lòng xác thực tài khoản.";
      notify.success("Thành công", msg);
      navigate("/confirm-account");
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
         <BronzeDrum />
      </div>

      {!fromLogout && (
        <div className="absolute top-6 left-6 z-10">
          <BackButton />
        </div>
      )}
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="VietTune Logo"
            className="w-20 h-20 object-contain mb-4 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          />
          <h1 className="text-2xl font-bold text-white mb-2">
            Tham gia VietTune
          </h1>
          <p className="text-neutral-300 font-medium">
            Tạo tài khoản để kết nối và sẻ chia âm hưởng nghìn năm.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Input
              labelColor="light"
              label="Họ và tên"
              placeholder="Nhập họ và tên đầy đủ"
              className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register("fullName", {
                required: "Họ và tên là bắt buộc",
              })}
              error={errors.fullName?.message}
            />

            <Input
              labelColor="light"
              label="Số điện thoại"
              placeholder="Nhập số điện thoại"
              className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register("phoneNumber", {
                required: "Số điện thoại là bắt buộc",
                pattern: {
                  value: /^[0-9]{10,11}$/,
                  message: "Số điện thoại không hợp lệ (10-11 chữ số)",
                },
              })}
              error={errors.phoneNumber?.message}
            />

            <Input
              labelColor="light"
              label="Địa chỉ Email"
              type="email"
              placeholder="Nhập địa chỉ email"
              className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register("email", {
                required: "Email là bắt buộc",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Địa chỉ email không hợp lệ",
                },
              })}
              error={errors.email?.message}
            />

            <Input
              labelColor="light"
              label="Mật khẩu"
              type="password"
              placeholder="Tạo mật khẩu mạnh"
              className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
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
              labelColor="light"
              label="Xác nhận mật khẩu"
              type="password"
              placeholder="Nhập lại mật khẩu"
              className="border-neutral-300 py-3.5 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20"
              {...register("confirmPassword", {
                required: "Vui lòng xác nhận mật khẩu",
                validate: (value) => value === password || "Mật khẩu không khớp",
              })}
              error={errors.confirmPassword?.message}
            />
          </div>

          {/* Legal / Terms */}
          <div className="text-center">
            <p className="text-[11px] text-neutral-400 leading-relaxed px-4">
              Bằng cách nhấn đăng ký, bạn đồng ý với {" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="font-bold text-primary-600 hover:underline"
              >
                Điều khoản & Điều kiện
              </button>{" "}
              và Chính sách bảo mật của VietTune.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary-600 text-white text-lg font-bold rounded-full hover:bg-primary-700 transition-all shadow-md active:scale-[0.98] disabled:bg-neutral-400"
          >
            {isLoading ? "Đang xử lý..." : "Đăng ký"}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-sm font-semibold text-primary-600 hover:underline">
              Đã có tài khoản? <span className="text-secondary-400">Đăng nhập tại đây</span>
            </Link>
          </div>
        </form>
      </div>

      <TermsAndConditions
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />
    </div>
  );
}
