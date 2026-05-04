import toast, { type ToastOptions } from 'react-hot-toast';

import { interpolate } from './interpolate';
import { MESSAGE_CATALOG, resolveCatalogMessage, type MessageKey } from './messageCatalog';
import { getNormalizedApiError } from './normalizeApiError';

function isMessageKey(s: string): s is MessageKey {
  return Object.prototype.hasOwnProperty.call(MESSAGE_CATALOG, s);
}

function resolveText(
  messageOrKey: string,
  vars?: Record<string, string | number | undefined>,
): string {
  if (isMessageKey(messageOrKey)) {
    return resolveCatalogMessage(messageOrKey, vars);
  }
  return interpolate(messageOrKey, vars ?? {});
}

const defaultDuration = 5000;

function baseOptions(overrides?: ToastOptions): ToastOptions {
  return { duration: defaultDuration, ...overrides };
}

/** Map HTTP status to catalog key for generic API failures. */
function statusToMessageKey(status: number | undefined): MessageKey {
  if (status == null) return 'common.network';
  if (status === 400) return 'common.http_400';
  if (status === 401) return 'common.http_401';
  if (status === 403) return 'common.http_403';
  if (status === 404) return 'common.http_404';
  if (status === 422) return 'common.http_422';
  if (status >= 500) return 'common.http_500';
  return 'common.unknown';
}

function codeToMessageKey(code: string): MessageKey {
  if (code === 'NETWORK') return 'common.network';
  if (code === 'TIMEOUT') return 'common.timeout';
  return 'common.unknown';
}

/**
 * Thin wrapper over react-hot-toast. Feature code should import only this module.
 * Swapping the underlying library later = edit this file only.
 */
export const uiToast = {
  success(
    messageOrKey: string,
    vars?: Record<string, string | number | undefined>,
    options?: ToastOptions,
  ): string {
    return toast.success(resolveText(messageOrKey, vars), baseOptions(options));
  },

  error(
    messageOrKey: string,
    vars?: Record<string, string | number | undefined>,
    options?: ToastOptions,
  ): string {
    return toast.error(resolveText(messageOrKey, vars), baseOptions(options));
  },

  info(
    messageOrKey: string,
    vars?: Record<string, string | number | undefined>,
    options?: ToastOptions,
  ): string {
    return toast(resolveText(messageOrKey, vars), {
      ...baseOptions(options),
      icon: 'ℹ️',
    });
  },

  warning(
    messageOrKey: string,
    vars?: Record<string, string | number | undefined>,
    options?: ToastOptions,
  ): string {
    return toast(resolveText(messageOrKey, vars), {
      ...baseOptions(options),
      icon: '⚠️',
    });
  },

  promise<T>(
    p: Promise<T>,
    msgs: {
      loading: string;
      success: string;
      error: string;
    },
    vars?: {
      loading?: Record<string, string | number | undefined>;
      success?: Record<string, string | number | undefined>;
      error?: Record<string, string | number | undefined>;
    },
  ): Promise<T> {
    return toast.promise(p, {
      loading: resolveText(msgs.loading, vars?.loading),
      success: resolveText(msgs.success, vars?.success),
      error: resolveText(msgs.error, vars?.error),
    });
  },

  /**
   * Use in catch blocks when you choose to surface an error.
   * Dùng `getNormalizedApiError` (body lỗi HTTP hoặc đã gắn qua `attachNormalizedApiError`).
   */
  fromApiError(
    err: unknown,
    fallbackKey: MessageKey = 'common.unknown',
    options?: ToastOptions,
  ): string {
    const n = getNormalizedApiError(err);
    if (n) {
      const key =
        n.httpStatus != null ? statusToMessageKey(n.httpStatus) : codeToMessageKey(n.code);
      return toast.error(resolveCatalogMessage(key), baseOptions(options));
    }
    return toast.error(resolveCatalogMessage(fallbackKey), baseOptions(options));
  },
};
