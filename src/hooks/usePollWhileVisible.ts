import { useEffect, useRef } from 'react';

export function usePollWhileVisible(
  callback: () => void | Promise<void>,
  intervalMs: number,
  deps: readonly unknown[],
): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    const run = () => {
      void ref.current();
    };
    run();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      run();
    }, intervalMs);
    const onVis = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        run();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
    // deps + intervalMs are forwarded from call sites (e.g. [load]); ref keeps callback fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
