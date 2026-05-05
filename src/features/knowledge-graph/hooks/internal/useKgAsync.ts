import { useCallback, useEffect, useRef, useState } from 'react';

export type KgAsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export type KgAsyncResult<T> = {
  data: T | null;
  error: Error | null;
  status: KgAsyncStatus;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isIdle: boolean;
  refetch: () => void;
};

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  const err = e as { name?: string; code?: string };
  return err?.name === 'AbortError' || err?.code === 'ERR_CANCELED';
}

export type UseKgAsyncOptions = {
  enabled?: boolean;
  /**
   * Short-lived in-memory cache (per hook instance). `refetch()` clears the cache entry.
   * Use for safe GETs (overview, stats). Keep `0` for explore/search defaults.
   */
  cacheTtlMs?: number;
};

/**
 * Abortable async loader with stale-result guard: cleanup aborts the request and
 * suppresses state updates from superseded runs.
 */
export function useKgAsync<T>(
  /** When this string changes, a new request runs (e.g. `overview:100` or explore key). */
  requestKey: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options?: UseKgAsyncOptions,
): KgAsyncResult<T> {
  const enabled = options?.enabled !== false;
  const cacheTtlMs = options?.cacheTtlMs ?? 0;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cacheRef = useRef<{ key: string; at: number; value: T } | null>(null);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{
    status: KgAsyncStatus;
    data: T | null;
    error: Error | null;
  }>({ status: 'idle', data: null, error: null });

  const refetch = useCallback(() => {
    cacheRef.current = null;
    setTick((x) => x + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }

    if (cacheTtlMs > 0) {
      const hit = cacheRef.current;
      if (hit && hit.key === requestKey && Date.now() - hit.at < cacheTtlMs) {
        setState({ status: 'success', data: hit.value, error: null });
        return;
      }
    }

    let cancelled = false;
    const ac = new AbortController();

    setState((prev) => ({
      status: 'loading',
      data: prev.data,
      error: null,
    }));

    void (async () => {
      try {
        const value = await fetcherRef.current(ac.signal);
        if (cancelled || ac.signal.aborted) return;
        if (cacheTtlMs > 0) {
          cacheRef.current = { key: requestKey, at: Date.now(), value };
        }
        setState({ status: 'success', data: value, error: null });
      } catch (e) {
        if (cancelled || ac.signal.aborted || isAbortError(e)) return;
        setState({
          status: 'error',
          data: null,
          error: e instanceof Error ? e : new Error(String(e)),
        });
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [requestKey, enabled, tick, cacheTtlMs]);

  const { status, data, error } = state;
  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    isIdle: status === 'idle',
    refetch,
  };
}
