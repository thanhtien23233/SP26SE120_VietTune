import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [isInitialized, setIsInitialized] = useState(false);

  // On mount: restore user from storage if not already in store (getState avoids stale closure / mount-only dep)
  useEffect(() => {
    const initialize = async () => {
      try {
        await authService.clearExpiredCredentialsIfNeeded();
        const storedUser = authService.getStoredUser();
        const hasToken = authService.isAuthenticated();
        useAuthStore.getState().setUser(hasToken && storedUser ? storedUser : null);
      } catch (err) {
        console.warn('[AuthContext] Failed to restore user on init:', err);
      } finally {
        setIsInitialized(true);
      }
    };

    void initialize();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await useAuthStore.getState().login(email, password);
  }, []);

  const logout = useCallback(() => {
    useAuthStore.getState().logout();
  }, []);

  const setUser = useCallback((next: User | null) => {
    useAuthStore.getState().setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      setUser,
    }),
    [user, isAuthenticated, isLoading, login, logout, setUser],
  );

  if (!isInitialized) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Preferred hook for accessing auth state in components.
 * Uses AuthContext if available, falls back to authStore directly.
 */
// Fast refresh: hook co-located with provider is intentional for this module.
// eslint-disable-next-line react-refresh/only-export-components -- useAuth must live next to AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  const fromStore = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      isAuthenticated: s.isAuthenticated,
      isLoading: s.isLoading,
      login: s.login,
      logout: s.logout,
      setUser: s.setUser,
    })),
  );

  if (!ctx) {
    console.warn('[useAuth] Used outside <AuthProvider>. Falling back to authStore.');
    return fromStore;
  }

  return ctx;
}

export default AuthContext;
