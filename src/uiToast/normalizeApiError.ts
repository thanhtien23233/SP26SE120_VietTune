import { NORMALIZED_API_ERROR_KEY, type NormalizedApiError } from './types';

import { getHttpStatus } from '@/utils/httpError';

function pickRawMessage(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === 'string') return data.trim() || null;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const m = o.message ?? o.Message ?? o.detail ?? o.Detail;
    if (typeof m === 'string') return m.trim() || null;
    if (Array.isArray(m) && typeof m[0] === 'string') return m[0].trim() || null;
  }
  return null;
}

function hasHttpLikeResponse(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const r = (error as { response?: unknown }).response;
  if (r == null || typeof r !== 'object') return false;
  const resp = r as { status?: unknown; data?: unknown };
  return typeof resp.status === 'number' || resp.data !== undefined;
}

function isAbortLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  const c = (error as { code?: string }).code;
  return c === 'ECONNABORTED';
}

function isNetworkLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message.toLowerCase();
  if (m.includes('network') || m.includes('failed to fetch')) return true;
  const c = (error as { code?: string }).code;
  return c === 'ECONNABORTED' || c === 'ERR_NETWORK';
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  const status = getHttpStatus(error);
  const e = typeof error === 'object' && error !== null ? error : null;
  const responseData = e && 'response' in e ? (e as { response?: { data?: unknown } }).response?.data : undefined;
  const rawMessage = pickRawMessage(responseData);

  let code: string;
  if (status != null) {
    code = `HTTP_${status}`;
  } else if (isAbortLikeError(error)) {
    code = 'TIMEOUT';
  } else if (isNetworkLikeError(error)) {
    code = 'NETWORK';
  } else {
    code = 'UNKNOWN';
  }

  return {
    code,
    httpStatus: status,
    rawMessage,
  };
}

export function normalizeAxiosError(error: unknown): NormalizedApiError {
  return normalizeApiError(error);
}

export function attachNormalizedApiError(error: unknown): void {
  if (typeof error !== 'object' || error === null) return;
  const normalized = normalizeApiError(error);
  Object.defineProperty(error, NORMALIZED_API_ERROR_KEY, {
    value: normalized,
    enumerable: false,
    configurable: true,
  });
}

export function getNormalizedApiError(error: unknown): NormalizedApiError | null {
  if (typeof error !== 'object' || error === null) return null;
  const rec = error as Record<string, unknown>;
  const attached = rec[NORMALIZED_API_ERROR_KEY];
  if (attached && typeof attached === 'object') return attached as NormalizedApiError;
  if (!hasHttpLikeResponse(error)) return null;
  return normalizeApiError(error);
}
