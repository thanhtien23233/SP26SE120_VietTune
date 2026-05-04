import type { HttpClientRequestConfig } from '@/api/httpClientRequestConfig';

export type ServiceApiClient = {
  get: <T>(url: string, config?: HttpClientRequestConfig) => Promise<T>;
  post: <T>(url: string, data?: unknown, config?: HttpClientRequestConfig) => Promise<T>;
  put: <T>(url: string, data?: unknown, config?: HttpClientRequestConfig) => Promise<T>;
};
