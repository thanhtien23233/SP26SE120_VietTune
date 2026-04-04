import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/constants";
import { getItem, removeItem } from "@/services/storageService";
import { attachNormalizedApiError } from "@/uiToast/normalizeApiError";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Track whether a 401 redirect is in progress to avoid loops
let isRedirectingToLogin = false;

function isProtectedPath(path: string): boolean {
  const p = (path || "").toLowerCase();
  if (!p || p === "/") return false;
  if (p.startsWith("/login") || p.startsWith("/register") || p.startsWith("/confirm-account")) return false;
  if (p.startsWith("/explore") || p.startsWith("/search") || p.startsWith("/semantic-search")) return false;
  if (p.startsWith("/instruments") || p.startsWith("/ethnicities") || p.startsWith("/masters")) return false;
  if (p.startsWith("/about") || p.startsWith("/terms") || p.startsWith("/chatbot")) return false;
  // Recording detail is public; edit page remains protected.
  if (p.startsWith("/recordings/") && !p.endsWith("/edit")) return false;
  return true;
}

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (axios.isAxiosError(error)) {
      attachNormalizedApiError(error);
    }
    if (error.response?.status === 401 && !isRedirectingToLogin) {
      const url = error.config?.url ?? "";
      const isAuthEndpoint = url.includes("/auth/") || url.includes("/Auth/");

      // Auth endpoint failure (bad credentials, confirm email, etc.) — let caller handle
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      const token = getItem("access_token");
      const path = typeof window !== "undefined" ? window.location.pathname : "";

      if (!token) {
        // No token at all — redirect only from protected pages
        if (isProtectedPath(path)) {
          isRedirectingToLogin = true;
          await removeItem("access_token");
          await removeItem("user");
          const redirect = path && path !== "/login" ? `?redirect=${encodeURIComponent(path)}` : "";
          window.location.href = `/login${redirect}`;
        }
        return Promise.reject(error);
      }

      // Token present but 401: could be role-restricted endpoint or transient server issue.
      // Do NOT auto-logout — let the component display an appropriate error instead.
      // Only logout when there is genuinely no token (handled above).

    }
    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};

export default apiClient;
