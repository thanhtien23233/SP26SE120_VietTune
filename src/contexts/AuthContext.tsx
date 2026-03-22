import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@/types";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

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
    const store = useAuthStore();
    const [isInitialized, setIsInitialized] = useState(false);

    // On mount: restore user from storage if not already in store
    useEffect(() => {
        const initialize = async () => {
            try {
                if (!store.user) {
                    // Try to restore from stored credentials
                    const storedUser = authService.getStoredUser();
                    const hasToken = authService.isAuthenticated();

                    if (storedUser && hasToken) {
                        store.setUser(storedUser);
                    }
                }
            } catch (err) {
                console.warn("[AuthContext] Failed to restore user on init:", err);
            } finally {
                setIsInitialized(true);
            }
        };

        void initialize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(
        async (email: string, password: string) => {
            await store.login(email, password);
        },
        [store]
    );

    const logout = useCallback(() => {
        store.logout();
    }, [store]);

    const setUser = useCallback(
        (user: User | null) => {
            store.setUser(user);
        },
        [store]
    );

    // Render nothing until initialization is complete to avoid flash of "logged out" state
    if (!isInitialized) {
        return null;
    }

    return (
        <AuthContext.Provider
            value={{
                user: store.user,
                isAuthenticated: store.isAuthenticated,
                isLoading: store.isLoading,
                login,
                logout,
                setUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Preferred hook for accessing auth state in components.
 * Uses AuthContext if available, falls back to authStore directly.
 */
// Fast refresh: hook co-located with provider is intentional for this module.
// eslint-disable-next-line react-refresh/only-export-components -- useAuth must live next to AuthProvider
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);

    // Fallback: if used outside AuthProvider (shouldn't happen in prod), use store directly
    const store = useAuthStore();
    if (!ctx) {
        console.warn("[useAuth] Used outside <AuthProvider>. Falling back to authStore.");
        return {
            user: store.user,
            isAuthenticated: store.isAuthenticated,
            isLoading: store.isLoading,
            login: store.login,
            logout: store.logout,
            setUser: store.setUser,
        };
    }

    return ctx;
}

export default AuthContext;
