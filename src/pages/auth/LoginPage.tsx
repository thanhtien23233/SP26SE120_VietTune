import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import Input from "@/components/common/Input";
import { LoginForm, User, UserRole } from "@/types";
import { notify } from "@/stores/notificationStore";
import logo from "@/components/image/VietTune logo.png";
import { getItem, sessionGetItem, sessionRemoveItem } from "@/services/storageService";
import { ZitherStrings } from "@/components/image/pattern/BackgroundPatterns";

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

  // Show overridden demo usernames if present in IndexedDB
  const [demoNames, setDemoNames] = useState<Record<string, string>>({});

  const loadDemoNames = () => {
    try {
      const oRaw = getItem("users_overrides");
      const overrides = oRaw ? (JSON.parse(oRaw) as Record<string, User>) : {};
      setDemoNames({
        contributor: overrides["contrib_demo"]?.username || "contributor_demo",
        expert_a: overrides["expert_a"]?.username || "expertA",
        expert_b: overrides["expert_b"]?.username || "expertB",
        expert_c: overrides["expert_c"]?.username || "expertC",
        admin: overrides["admin_demo"]?.username || "admin_demo",
        researcher: overrides["researcher_demo"]?.username || "researcher_demo",
      });
    } catch (err) {
      setDemoNames({
        contributor: "contributor_demo",
        expert_a: "expertA",
        expert_b: "expertB",
        expert_c: "expertC",
        admin: "admin_demo",
        researcher: "researcher_demo",
      });
    }
  };

  // Load on mount
  useEffect(() => {
    loadDemoNames();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      if (response.success && response.data) {
        setUser(response.data.user);
        void sessionRemoveItem("fromLogout");
        const defaultPath =
          response.data.user?.role === UserRole.RESEARCHER ? "/researcher" :
            response.data.user?.role === UserRole.EXPERT ? "/moderation" : "/";
        navigate(redirectTo ?? defaultPath);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại."
          : "Đăng nhập thất bại. Vui lòng thử lại.";
      notify.error("Lỗi đăng nhập", errorMessage);
    } finally {
      setIsLoading(false);
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
            VietTune giúp bạn kết nối và sẻ chia âm hưởng nghìn năm.
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
                className="rounded-xl border-neutral-200 py-3.5 focus:border-primary-500 bg-white"
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
                className="rounded-xl border-neutral-200 py-3.5 focus:border-primary-500 bg-white"
                {...register("password", {
                  required: "Mật khẩu là bắt buộc",
                })}
                error={errors.password?.message}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white text-lg font-bold rounded-xl hover:bg-primary-700 transition-all disabled:bg-neutral-400 disabled:cursor-not-allowed shadow-none active:scale-[0.98] mt-2"
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
    </div>
  );
}

