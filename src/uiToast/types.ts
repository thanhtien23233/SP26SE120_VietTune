/** Normalized API error attached by Axios response interceptor — no toast here. */
export type NormalizedApiError = {
  /** e.g. HTTP_403, NETWORK, TIMEOUT */
  code: string;
  httpStatus?: number;
  /** Best-effort backend message; callers decide whether to show it. */
  rawMessage: string | null;
};

export const NORMALIZED_API_ERROR_KEY = "__viettuneNormalizedApiError" as const;
