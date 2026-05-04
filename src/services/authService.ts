import { apiFetchLoose, apiOk, asApiEnvelope } from '@/api';
import type {
  ApiAuthConfirmEmailQuery,
  ApiAuthForgotPasswordModel,
  ApiAuthLoginModel,
  ApiAuthRegisterModel,
} from '@/api';
import { legacyGet, legacyPost, legacyPut } from '@/api/legacyHttp';
import { logServiceError, logServiceWarn } from '@/services/serviceLogger';
import { getItem, setItem, removeItem, sessionSetItem } from '@/services/storageService';
import { User, LoginForm, ApiResponse, UserRole } from '@/types';
import { uiToast } from '@/uiToast';
import { isJwtExpired } from '@/utils/jwtExpiry';

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
      const payload: ApiAuthLoginModel = {
        email: (credentials.email ?? '').trim(),
        password: credentials.password,
      };
      const response = await apiOk<LoginResponse | { data: LoginResponse }>(
        asApiEnvelope<LoginResponse | { data: LoginResponse }>(
          apiFetchLoose.POST('/api/Auth/login', { body: payload }),
        ),
      );

      // Handle both { token, ... } and { data: { token, ... } } structures
      const authData: LoginResponse =
        response &&
        typeof response === 'object' &&
        'token' in response &&
        (response as LoginResponse).token
          ? (response as LoginResponse)
          : (response as { data: LoginResponse }).data;

      if (authData && authData.token) {
        await setItem('access_token', authData.token);

        // Use userId or id, ensuring it's a string
        const userId = (authData.userId || authData.id || '').toString();

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
        await setItem('user', JSON.stringify(user));
        return {
          success: true,
          data: {
            user: user,
            token: authData.token,
          },
          // message: "Login successful",
        };
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 401) {
        const err = new Error('Invalid credentials');
        (err as { response?: { status?: number; data?: { message?: string } } }).response = {
          status,
          data: { message: 'Sai tài khoản hoặc mật khẩu' },
        };
        throw err;
      }
      logServiceError('Login error', error);
      throw error;
    }
  },

  // Register as Contributor
  register: async (data: import('@/types').RegisterResearcherForm) => {
    const payload: ApiAuthRegisterModel = {
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
    };
    const response = await apiOk<unknown>(
      asApiEnvelope<unknown>(
        apiFetchLoose.POST('/api/Auth/register-contributor', { body: payload }),
      ),
    );
    return {
      success: true,
      data: response,
      message: 'Registration successful',
    };
  },

  // Register Researcher
  registerResearcher: async (data: import('@/types').RegisterResearcherForm) => {
    try {
      const payload: ApiAuthRegisterModel = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
      };
      const response = await apiOk<unknown>(
        asApiEnvelope<unknown>(
          apiFetchLoose.POST('/api/Auth/register-researcher', { body: payload }),
        ),
      );
      return response;
    } catch (error: unknown) {
      const axiosLike = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        axiosLike.response?.data?.message || axiosLike.message || 'Đăng ký nhà nghiên cứu thất bại';
      logServiceError('Register researcher error', errorMessage);
      throw error;
    }
  },

  // Verify OTP / Confirm Account (POST - keeping for compatibility if needed, but adding confirmEmail)
  verifyOtp: async (email: string, otp: string) => {
    try {
      const response = await legacyPost<ApiResponse<unknown>>('/auth/verify-otp', {
        email,
        otp,
      });
      return response;
    } catch (error) {
      logServiceError('Verify OTP error', error);
      throw error;
    }
  },

  // Confirm Email (GET)
  confirmEmail: async (token: string) => {
    try {
      const params: ApiAuthConfirmEmailQuery = { token };
      return await apiOk<unknown>(
        asApiEnvelope<unknown>(
          apiFetchLoose.GET('/api/Auth/confirm-email', { params: { query: params } }),
        ),
      );
    } catch (error) {
      logServiceError('Confirm email error', error);
      throw error;
    }
  },

  forgotPassword: async (email: string) => {
    const payload: ApiAuthForgotPasswordModel = { email: email.trim() };
    return await apiOk<unknown>(
      asApiEnvelope<unknown>(
        apiFetchLoose.POST('/api/Auth/forgot-password', { body: payload }),
      ),
    );
  },

  // Logout: only clear storage. Navigation to /login is handled by the caller
  // so we avoid a full page reload and a brief blank screen flash.
  logout: async () => {
    await removeItem('access_token');
    await removeItem('user');
    await sessionSetItem('fromLogout', '1');
  },

  // Get current user
  getCurrentUser: async () => {
    return legacyGet<ApiResponse<User>>('/auth/me');
  },

  // Update profile
  updateProfile: async (data: Partial<User>) => {
    return legacyPut<ApiResponse<User>>('/auth/profile', data);
  },

  // Queue a pending profile update for retry when server becomes available
  queuePendingProfileUpdate: async (userId: string | undefined, data: Partial<User>) => {
    if (!userId) return;
    try {
      const raw = getItem('pending_profile_updates');
      const pending = raw ? (JSON.parse(raw) as Record<string, Partial<User>>) : {};
      pending[userId] = data;
      await setItem('pending_profile_updates', JSON.stringify(pending));
    } catch (err) {
      logServiceWarn('Failed to queue pending profile update', err);
    }
  },

  // Try to process pending profile updates (called on login/fetchCurrentUser)
  processPendingProfileUpdates: async () => {
    try {
      const raw = getItem('pending_profile_updates');
      const pending = raw ? (JSON.parse(raw) as Record<string, Partial<User>>) : {};
      const ids = Object.keys(pending);
      if (ids.length === 0) return;

      for (const id of ids) {
        try {
          const data = pending[id];
          const res = await legacyPut<ApiResponse<User>>('/auth/profile', data);
          if (res && res.data) {
            // Update local stored user and overrides
            const serverUser = res.data as User;
            await setItem('user', JSON.stringify(serverUser));
            const oRaw = getItem('users_overrides');
            const overrides = oRaw ? (JSON.parse(oRaw) as Record<string, User>) : {};
            overrides[serverUser.id] = serverUser;
            await setItem('users_overrides', JSON.stringify(overrides));

            // Do NOT load localRecordings here — it can be huge and cause OOM.
            // Propagation to localRecordings is done only in ProfilePage when user saves profile.

            // Remove from pending
            delete pending[id];

            // Notify user that profile has been synced
            try {
              uiToast.success('auth.profile.sync_success');
            } catch {
              /* noop */
            }
          }
        } catch (err) {
          // keep pending if failed
          logServiceWarn(`Failed to process pending profile update for ${id}`, err);
        }
      }

      // Save remaining pending back
      await setItem('pending_profile_updates', JSON.stringify(pending));
    } catch (err) {
      logServiceWarn('Failed to process pending profile updates', err);
    }
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string) => {
    return legacyPost<ApiResponse<void>>('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },

  // Get stored user — safe JSON parse to avoid app crash on corrupt storage
  getStoredUser: (): User | null => {
    const userStr = getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      logServiceWarn('[authService] Corrupt user data in storage, clearing.');
      void removeItem('user');
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    const token = getItem('access_token');
    if (!token) return false;
    return !isJwtExpired(token);
  },

  async clearExpiredCredentialsIfNeeded(): Promise<boolean> {
    const token = getItem('access_token');
    if (!token || !isJwtExpired(token)) return false;
    await removeItem('access_token');
    await removeItem('user');
    return true;
  },

  // Demo login helper — available in DEV only to prevent misuse in production
  loginDemo: async (demoKey: string) => {
    if (!import.meta.env.DEV) {
      throw new Error('loginDemo is not available in production.');
    }
    // demoKey: 'contributor', 'expert_a', 'expert_b', 'expert_c'
    const mapping: Record<string, Partial<User>> = {
      contributor: {
        id: 'contrib_demo',
        username: 'contributor_demo',
        email: 'contrib@example.com',
        fullName: 'Người đóng góp (Demo)',
        role: UserRole.CONTRIBUTOR,
        avatar: undefined,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      expert_a: {
        id: 'expert_a',
        username: 'expertA',
        email: 'expertA@example.com',
        fullName: 'Expert A (Demo)',
        role: UserRole.EXPERT,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      expert_b: {
        id: 'expert_b',
        username: 'expertB',
        email: 'expertB@example.com',
        fullName: 'Expert B (Demo)',
        role: UserRole.EXPERT,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      expert_c: {
        id: 'expert_c',
        username: 'expertC',
        email: 'expertC@example.com',
        fullName: 'Expert C (Demo)',
        role: UserRole.EXPERT,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      admin: {
        id: 'admin_demo',
        username: 'admin_demo',
        email: 'admin@example.com',
        fullName: 'Administrator (Demo)',
        role: UserRole.ADMIN,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      researcher: {
        id: 'researcher_demo',
        username: 'researcher_demo',
        email: 'researcher@example.com',
        fullName: 'Nhà nghiên cứu (Demo)',
        role: UserRole.RESEARCHER,
        isEmailConfirmed: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    let demoUser = mapping[demoKey];
    if (!demoUser) throw new Error('Unknown demo user');

    // Merge overrides if user was edited locally previously
    try {
      const oRaw = getItem('users_overrides');
      const overrides = oRaw ? (JSON.parse(oRaw) as Record<string, Partial<User>>) : {};
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
    await setItem('access_token', token);
    await setItem('user', JSON.stringify(demoUser));

    // Also ensure overrides store includes this demo user so future logins keep it
    try {
      const oRaw2 = getItem('users_overrides');
      const overrides2 = oRaw2 ? (JSON.parse(oRaw2) as Record<string, User>) : {};
      if (demoUser.id) {
        overrides2[demoUser.id] = demoUser as User;
        await setItem('users_overrides', JSON.stringify(overrides2));
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
