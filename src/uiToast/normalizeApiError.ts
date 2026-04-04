import axios, { type AxiosError } from "axios";
import { NORMALIZED_API_ERROR_KEY, type NormalizedApiError } from "./types";

function pickRawMessage(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return data.trim() || null;
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    const m = o.message ?? o.Message ?? o.detail ?? o.Detail;
    if (typeof m === "string") return m.trim() || null;
    if (Array.isArray(m) && typeof m[0] === "string") return m[0].trim() || null;
  }
  return null;
}

export function normalizeAxiosError(error: AxiosError): NormalizedApiError {
  const status = error.response?.status;
  const rawMessage = pickRawMessage(error.response?.data);

  let code: string;
  if (status != null) {
    code = `HTTP_${status}`;
  } else if (error.code === "ECONNABORTED") {
    code = "TIMEOUT";
  } else if (error.message?.toLowerCase().includes("network") || error.code === "ERR_NETWORK") {
    code = "NETWORK";
  } else {
    code = "UNKNOWN";
  }

  return {
    code,
    httpStatus: status,
    rawMessage,
  };
}

/** Call from Axios response error interceptor only — never show toast here. */
export function attachNormalizedApiError(error: AxiosError): void {
  const normalized = normalizeAxiosError(error);
  Object.defineProperty(error, NORMALIZED_API_ERROR_KEY, {
    value: normalized,
    enumerable: false,
    configurable: true,
  });
}

export function getNormalizedApiError(error: unknown): NormalizedApiError | null {
  if (!axios.isAxiosError(error)) return null;
  const v = (error as AxiosError & Record<string, unknown>)[NORMALIZED_API_ERROR_KEY];
  return v && typeof v === "object" ? (v as NormalizedApiError) : null;
}
