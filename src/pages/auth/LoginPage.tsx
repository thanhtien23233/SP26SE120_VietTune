import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import Input from "@/components/common/Input";
import BackButton from "@/components/common/BackButton";
import { LoginForm, User, UserRole } from "@/types";
import { notify } from "@/stores/notificationStore";
import backgroundImage from "@/components/image/Đàn bầu.png";
import logo from "@/components/image/VietTune logo.png";
import { getItem, sessionGetItem, sessionRemoveItem } from "@/services/storageService";

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
              Đăng nhập vào VietTune
            </h2>
            <p className="text-center text-sm text-neutral-600">
              Hoặc{" "}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-700 active:text-primary-800"
              >
                tạo tài khoản mới
              </Link>
            </p>
          </div>

          <div className="space-y-3">
            <Input
              label="Tên người dùng hoặc Email"
              {...register("usernameOrEmail", {
                required: "Tên người dùng hoặc Email là bắt buộc",
              })}
              error={errors.usernameOrEmail?.message}
            />

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
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-3.5 w-3.5 bg-white text-primary-600 focus:outline-none border-2 border-neutral-400 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-neutral-700"
              >
                Ghi nhớ tôi
              </label>
            </div>

            <a
              href="#"
              className="font-medium text-primary-600 hover:text-primary-700 active:text-primary-800"
            >
              Quên mật khẩu?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-primary-600 text-white font-semibold rounded-full hover:bg-primary-700 transition-colors disabled:bg-neutral-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          {/* Demo accounts for quick testing */}
          <div className="mt-4 text-center text-sm text-neutral-600">
            <p className="mb-2">Hoặc dùng tài khoản demo:</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                type="button"
                className="px-6 py-3 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const res = await authService.loginDemo("contributor");
                    if (res.success && res.data) {
                      setUser(res.data.user as unknown as import("@/types").User);
                      void sessionRemoveItem("fromLogout");
                      navigate(redirectTo ?? "/");
                    }
                  } catch (err) {
                    notify.error("Lỗi", "Không thể đăng nhập demo");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {`Contributor (${demoNames.contributor || 'contributor_demo'})`}
              </button>
              <button
                type="button"
                className="px-6 py-3 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const res = await authService.loginDemo("expert_a");
                    if (res.success && res.data) {
                      setUser(res.data.user as unknown as import("@/types").User);
                      void sessionRemoveItem("fromLogout");
                      navigate(redirectTo ?? "/moderation");
                    }
                  } catch (err) {
                    notify.error("Lỗi", "Không thể đăng nhập demo");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {`Expert A (${demoNames.expert_a || 'expertA'})`}
              </button>
              <button
                type="button"
                className="px-6 py-3 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const res = await authService.loginDemo("expert_b");
                    if (res.success && res.data) {
                      setUser(res.data.user as unknown as import("@/types").User);
                      void sessionRemoveItem("fromLogout");
                      navigate(redirectTo ?? "/moderation");
                    }
                  } catch (err) {
                    notify.error("Lỗi", "Không thể đăng nhập demo");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {`Expert B (${demoNames.expert_b || 'expertB'})`}
              </button>
              <button
                type="button"
                className="px-6 py-3 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const res = await authService.loginDemo("expert_c");
                    if (res.success && res.data) {
                      setUser(res.data.user as unknown as import("@/types").User);
                      void sessionRemoveItem("fromLogout");
                      navigate(redirectTo ?? "/moderation");
                    }
                  } catch (err) {
                    notify.error("Lỗi", "Không thể đăng nhập demo");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {`Expert C (${demoNames.expert_c || 'expertC'})`}
              </button>
              <button
                type="button"
                className="px-6 py-3 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const res = await authService.loginDemo("admin");
                    if (res.success && res.data) {
                      setUser(res.data.user as unknown as import("@/types").User);
                      void sessionRemoveItem("fromLogout");
                      navigate(redirectTo ?? "/");
                    }
                  } catch (err) {
                    notify.error("Lỗi", "Không thể đăng nhập demo");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {`Admin (${demoNames.admin ?? "admin_demo"})`}
              </button>
              <button
                type="button"
                className="px-6 py-3 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const res = await authService.loginDemo("researcher");
                    if (res.success && res.data) {
                      setUser(res.data.user as unknown as import("@/types").User);
                      void sessionRemoveItem("fromLogout");
                      navigate(redirectTo ?? "/researcher");
                    }
                  } catch (err) {
                    notify.error("Lỗi", "Không thể đăng nhập demo");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {`Researcher (${demoNames.researcher ?? "researcher_demo"})`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
