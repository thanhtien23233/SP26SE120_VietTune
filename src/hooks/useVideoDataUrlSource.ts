import { useEffect, useRef, useState } from 'react';

/**
 * Resolves `data:video/...` URLs to a blob URL for smoother playback; revokes on change/unmount.
 */
export function useVideoDataUrlSource(src: string | undefined): string | undefined {
  const blobUrlRef = useRef<string | null>(null);
  const [resolvedVideoSrc, setResolvedVideoSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!src || typeof src !== 'string' || !src.startsWith('data:video/')) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setResolvedVideoSrc(undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(src);
        if (cancelled || !res.ok) return;
        const blob = await res.blob();
        if (cancelled) return;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        if (!cancelled) setResolvedVideoSrc(url);
      } catch {
        if (!cancelled) setResolvedVideoSrc(src);
      }
    })();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setResolvedVideoSrc(undefined);
    };
  }, [src]);

  return resolvedVideoSrc;
}
