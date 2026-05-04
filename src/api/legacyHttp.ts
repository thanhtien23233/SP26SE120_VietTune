import type { HttpClientRequestConfig } from '@/api/httpClientRequestConfig';
import { API_BASE_URL } from '@/config/constants';
import type { ServiceApiClient } from '@/services/serviceApiClient';
import { getItem } from '@/services/storageService';

function joinUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${trimmed}`;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function throwHttpError(res: Response, data: unknown): never {
  const err = new Error(`API request failed (${res.status})`) as Error & {
    response?: { status: number; data: unknown; headers: Headers; url: string };
  };
  err.response = {
    status: res.status,
    data,
    headers: res.headers,
    url: res.url,
  };
  throw err;
}

export async function legacyGet<T>(path: string, config?: HttpClientRequestConfig): Promise<T> {
  const url = new URL(joinUrl(path));
  if (config?.params && typeof config.params === 'object') {
    Object.entries(config.params as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const token = getItem('access_token');
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: config?.signal as AbortSignal | undefined,
  });
  const data = await parseBody(res);
  if (!res.ok) throwHttpError(res, data);
  return data as T;
}

/** GET không gửi Bearer — dùng catalog guest / endpoint công khai. */
export async function legacyGetAnonymous<T>(
  path: string,
  config?: HttpClientRequestConfig,
): Promise<T> {
  const url = new URL(joinUrl(path));
  if (config?.params && typeof config.params === 'object') {
    Object.entries(config.params as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: config?.signal as AbortSignal | undefined,
  });
  const data = await parseBody(res);
  if (!res.ok) throwHttpError(res, data);
  return data as T;
}

/**
 * POST JSON tới `baseUrl + path`, đọc body dạng text (không parse JSON).
 * Dùng cho endpoint trả text/plain hoặc cần xử lý raw string (ví dụ chat AI).
 */
export async function legacyPostJsonAsText(
  baseUrl: string,
  path: string,
  body: unknown,
  options?: { timeout?: number; signal?: AbortSignal },
): Promise<string> {
  const base = baseUrl.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${p}`;
  const token = getItem('access_token');
  const controller = options?.timeout ? new AbortController() : undefined;
  const timeoutMs = options?.timeout;
  const timeoutId =
    controller && timeoutMs != null
      ? globalThis.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: options?.signal ?? controller?.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throwHttpError(res, text);
    }
    return text.trim();
  } finally {
    if (timeoutId != null) globalThis.clearTimeout(timeoutId);
  }
}

export async function legacyPost<T>(
  path: string,
  body?: unknown,
  config?: HttpClientRequestConfig,
): Promise<T> {
  const url = joinUrl(path);
  const token = getItem('access_token');
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = config?.timeout ? new AbortController() : undefined;
  const timeoutMs = typeof config?.timeout === 'number' ? config.timeout : undefined;
  const timeoutId =
    controller && timeoutMs != null
      ? globalThis.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
      signal: (config?.signal ?? controller?.signal) as AbortSignal | undefined,
    });
    const data = await parseBody(res);
    if (!res.ok) throwHttpError(res, data);
    return data as T;
  } finally {
    if (timeoutId != null) globalThis.clearTimeout(timeoutId);
  }
}

export async function legacyPut<T>(
  path: string,
  body?: unknown,
  config?: HttpClientRequestConfig,
): Promise<T> {
  const url = joinUrl(path);
  const token = getItem('access_token');
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: config?.signal as AbortSignal | undefined,
  });
  const data = await parseBody(res);
  if (!res.ok) throwHttpError(res, data);
  return data as T;
}

export const legacyApi: ServiceApiClient = {
  get: legacyGet,
  post: legacyPost,
  put: legacyPut,
};
