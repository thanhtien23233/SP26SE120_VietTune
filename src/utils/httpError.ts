function pickRawMessage(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'string') {
    const t = data.trim();
    return t || undefined;
  }
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const m = o.message ?? o.Message ?? o.detail ?? o.Detail ?? o.title ?? o.Title;
    if (typeof m === 'string') {
      const t = m.trim();
      return t || undefined;
    }
    if (Array.isArray(m) && typeof m[0] === 'string') {
      const t = m[0].trim();
      return t || undefined;
    }
    const errors = o.errors ?? o.Errors;
    if (errors && typeof errors === 'object') {
      try {
        const flat = Object.entries(errors as Record<string, unknown>)
          .map(([k, v]) => {
            if (Array.isArray(v)) {
              const xs = v.filter((x) => typeof x === 'string') as string[];
              return xs.length ? `${k}: ${xs.join(', ')}` : null;
            }
            if (typeof v === 'string') return `${k}: ${v}`;
            return null;
          })
          .filter(Boolean)
          .join(' | ');
        if (flat) return flat;
      } catch {
        // ignore
      }
    }
  }
  return undefined;
}

function asErrorLike(error: unknown): {
  response?: { status?: number; data?: unknown; url?: string };
  config?: { url?: string };
  error?: unknown;
  message?: unknown;
  code?: string;
} | null {
  if (typeof error !== 'object' || error === null) return null;
  return error as {
    response?: { status?: number; data?: unknown; url?: string };
    config?: { url?: string };
    error?: unknown;
    message?: unknown;
    code?: string;
  };
}

export function getHttpStatus(error: unknown): number | undefined {
  const e = asErrorLike(error);
  const s = e?.response?.status;
  return typeof s === 'number' ? s : undefined;
}

export function getHttpUrl(error: unknown): string | undefined {
  const e = asErrorLike(error);
  const fromConfig = e?.config?.url;
  if (typeof fromConfig === 'string' && fromConfig) return fromConfig;
  const fromResponse = e?.response?.url;
  if (typeof fromResponse === 'string' && fromResponse) return fromResponse;
  return undefined;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const e = asErrorLike(error);
  const fromBody = pickRawMessage(e?.response?.data);
  if (fromBody) return fromBody;

  const fromErrorField = pickRawMessage(e?.error);
  if (fromErrorField) return fromErrorField;

  if (error instanceof Error && error.message) return error.message;
  const msg = typeof e?.message === 'string' ? e.message.trim() : '';
  return msg || fallback;
}
