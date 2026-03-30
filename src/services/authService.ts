import { api } from "./api";
import { User, LoginForm, RegisterForm, ApiResponse, UserRole } from "@/types";
import { notify } from "@/stores/notificationStore";
import {
  getItem,
  setItem,
  removeItem,
  sessionSetItem,
} from "@/services/storageService";

export const authService = {
  // Login
  login: async (credentials: LoginForm) => {
    interface LoginResponse {
      token: string;
      userId?: string | number;
      id?: string | number;
      role: string;
      fullName: string;
      phoneNumber: string;
      isActive: boolean;
    }
    try {
      const response = await api.post<LoginResponse | { data: LoginResponse }>("/auth/login", credentials);
      
      // Handle both { token, ... } and { data: { token, ... } } structures
      const authData: LoginResponse =
        response && typeof response === "object" && "token" in response && (response as LoginResponse).token
          ? (response as LoginResponse)
          : (response as { data: LoginResponse }).data;
      
      if (authData && authData.token) {
        await setItem("access_token", authData.token);
        
        // Use userId or id, ensuring it's a string
        const userId = (authData.userId || authData.id || "").toString();
        
        const user: User = {
          id: userId,
          username: credentials.email,
          email: credentials.email,
          fullName: authData.fullName,
          role: authData.role as UserRole,
          phoneNumber: authData.phoneNumber,
          isActive: authData.isActive,
          isEmailConfirmed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setItem("user", JSON.stringify(user));
        return {
          success: true,
          data: {
            user: user,
            token: authData.token,
          },
          // message: "Login successful",
        };
      }
      throw new Error("Invalid response from server");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Register
  register: async (data: RegisterForm) => {
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newUser: User = {
      id: newUserId,
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      role: UserRole.CONTRIBUTOR,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await api.post<ApiResponse<unknown>>(
        "/auth/register",
        data,
      );

      // Save to users_overrides so it persists
      try {
        const oRaw = getItem("users_overrides");
        const overrides = oRaw
          ? (JSON.parse(oRaw) as Record<string, User>)
          : {};
        overrides[newUserId] = newUser;
        await setItem("users_overrides", JSON.stringify(overrides));
      } catch (err) {
        console.warn("Failed to save new user to overrides", err);
      }

      return {
        success: true,
        data: response.data,
        message: "Registration successful",
      };
    } catch (error: unknown) {
      // Demo mode: when API is unavailable, create user locally and return so caller can log in
      const axiosLike = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        axiosLike.response?.data?.message ||
        axiosLike.message ||
        "Đăng ký thất bại";
      console.warn(`Register API failed (${errorMessage}), creating user locally for demo:`, error);
      try {
        const oRaw = getItem("users_overrides");
        const overrides = oRaw
          ? (JSON.parse(oRaw) as Record<string, User>)
          : {};
        overrides[newUserId] = newUser;
        await setItem("users_overrides", JSON.stringify(overrides));
        const token = `demo-token-${newUserId}`;
        await setItem("access_token", token);
        await setItem("user", JSON.stringify(newUser));
      } catch (err) {
        console.warn("Failed to create local user:", err);
        throw error;
      }
      return {
        success: true,
        data: { user: newUser },
        message: "Đăng ký thành công (chế độ demo, chưa kết nối backend).",
      };
    }
  },

  // Register Researcher
  registerResearcher: async (data: import("@/types").RegisterResearcherForm) => {
    try {
      const response = await api.post<ApiResponse<unknown>>("/auth/register-researcher", data);
      return response;
    } catch (error: unknown) {
      const axiosLike = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        axiosLike.response?.data?.message ||
        axiosLike.message ||
        "Đăng ký nhà nghiên cứu thất bại";
      console.error("Register researcher error:", errorMessage);
      throw error;
    }
  },

  // Verify OTP / Confirm Account (POST - keeping for compatibility if needed, but adding confirmEmail)
  verifyOtp: async (email: string, otp: string) => {
    try {
      const response = await api.post<ApiResponse<unknown>>("/auth/verify-otp", {
        email,
        otp,
      });
      return response;
    } catch (error) {
      console.error("Verify OTP error:", error);
      throw error;
    }
  },

  // Confirm Email (GET)
  confirmEmail: async (token: string) => {
    try {
      const response = await api.get<ApiResponse<unknown>>(`/auth/confirm-email`, {
        params: { token },
      });
      return response;
    } catch (error) {
      console.error("Confirm email error:", error);
      throw error;
    }
  },

  // Logout: only clear storage. Navigation to /login is handled by the caller
  // so we avoid a full page reload and a brief blank screen flash.
  logout: async () => {
    await removeItem("access_token");
    await removeItem("user");
    await sessionSetItem("fromLogout", "1");
  },

  // Get current user
  getCurrentUser: async () => {
    return api.get<ApiResponse<User>>("/auth/me");
  },

  // Update profile
  updateProfile: async (data: Partial<User>) => {
    return api.put<ApiResponse<User>>("/auth/profile", data);
  },

  // Queue a pending profile update for retry when server becomes available
  queuePendingProfileUpdate: async (
    userId: string | undefined,
    data: Partial<User>,
  ) => {
    if (!userId) return;
    try {
      const raw = getItem("pending_profile_updates");
      const pending = raw
        ? (JSON.parse(raw) as Record<string, Partial<User>>)
        : {};
      pending[userId] = data;
      await setItem("pending_profile_updates", JSON.stringify(pending));
    } catch (err) {
      console.warn("Failed to queue pending profile update", err);
    }
  },

  // Try to process pending profile updates (called on login/fetchCurrentUser)
  processPendingProfileUpdates: async () => {
    try {
      const raw = getItem("pending_profile_updates");
      const pending = raw
        ? (JSON.parse(raw) as Record<string, Partial<User>>)
        : {};
      const ids = Object.keys(pending);
      if (ids.length === 0) return;

      for (const id of ids) {
        try {
          const data = pending[id];
          const res = await api.put<ApiResponse<User>>("/auth/profile", data);
          if (res && res.data) {
            // Update local stored user and overrides
            const serverUser = res.data as User;
            await setItem("user", JSON.stringify(serverUser));
            const oRaw = getItem("users_overrides");
            const overrides = oRaw
              ? (JSON.parse(oRaw) as Record<string, User>)
              : {};
            overrides[serverUser.id] = serverUser;
            await setItem("users_overrides", JSON.stringify(overrides));

            // Do NOT load localRecordings here — it can be huge and cause OOM.
            // Propagation to localRecordings is done only in ProfilePage when user saves profile.

            // Remove from pending
            delete pending[id];

            // Notify user that profile has been synced
            try {
              notify.success(
                "Thành công",
                "Cập nhật hồ sơ đã được đồng bộ với server.",
              );
            } catch (err) {
              /* noop */
            }
          }
        } catch (err) {
          // keep pending if failed
          console.warn("Failed to process pending profile update for", id, err);
        }
      }

      // Save remaining pending back
      await setItem("pending_profile_updates", JSON.stringify(pending));
    } catch (err) {
      console.warn("Failed to process pending profile updates", err);
    }
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string) => {
    return api.post<ApiResponse<void>>("/auth/change-password", {
      oldPassword,
      newPassword,
    });
  },

  // Get stored user
  getStoredUser: (): User | null => {
    const userStr = getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if authenticated
  isAuthenticated: (): boolean => {
    return !!getItem("access_token");
  },

  // Demo login helper (for local demo/testing only)
  loginDemo: async (demoKey: string) => {
    // demoKey: 'contributor', 'expert_a', 'expert_b', 'expert_c'
    const mapping: Record<string, Partial<User>> = {
      contributor: {
        id: "contrib_demo",
        username: "contributor_demo",
        email: "contrib@example.com",
        fullName: "Người đóng góp (Demo)",
        role: UserRole.CONTRIBUTOR,
        avatar: undefined,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      expert_a: {
        id: "expert_a",
        username: "expertA",
        email: "expertA@example.com",
        fullName: "Expert A (Demo)",
        role: UserRole.EXPERT,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      expert_b: {
        id: "expert_b",
        username: "expertB",
        email: "expertB@example.com",
        fullName: "Expert B (Demo)",
        role: UserRole.EXPERT,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      expert_c: {
        id: "expert_c",
        username: "expertC",
        email: "expertC@example.com",
        fullName: "Expert C (Demo)",
        role: UserRole.EXPERT,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      admin: {
        id: "admin_demo",
        username: "admin_demo",
        email: "admin@example.com",
        fullName: "Administrator (Demo)",
        role: UserRole.ADMIN,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      researcher: {
        id: "researcher_demo",
        username: "researcher_demo",
        email: "researcher@example.com",
        fullName: "Nhà nghiên cứu (Demo)",
        role: UserRole.RESEARCHER,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    let demoUser = mapping[demoKey];
    if (!demoUser) throw new Error("Unknown demo user");

    // Merge overrides if user was edited locally previously
    try {
      const oRaw = getItem("users_overrides");
      const overrides = oRaw
        ? (JSON.parse(oRaw) as Record<string, Partial<User>>)
        : {};
      if (demoUser.id && overrides[demoUser.id]) {
        demoUser = {
          ...demoUser,
          ...(overrides[demoUser.id] as Partial<User>),
        };
      }
    } catch (err) {
      // ignore parse errors
    }

    const token = `demo-token-${demoUser.id}`;
    await setItem("access_token", token);
    await setItem("user", JSON.stringify(demoUser));

    // Also ensure overrides store includes this demo user so future logins keep it
    try {
      const oRaw2 = getItem("users_overrides");
      const overrides2 = oRaw2
        ? (JSON.parse(oRaw2) as Record<string, User>)
        : {};
      if (demoUser.id) {
        overrides2[demoUser.id] = demoUser as User;
        await setItem("users_overrides", JSON.stringify(overrides2));
      }
    } catch (err) {
      // ignore
    }

    return {
      success: true,
      data: {
        user: demoUser,
        token,
      },
      // message: "Demo login successful",
    };
  },
};
