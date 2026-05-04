import { useEffect, useRef } from 'react';

export type UseUploadDialogChromeOptions = {
  /**
   * When true (e.g. confirm submit modal or success overlay open), locks document body scroll
   * using the fixed-body pattern and restores position on teardown.
   */
  active: boolean;
  /** Invoked when the user presses Escape while `active` is true */
  onEscape: () => void;
};

/**
 * Body scroll lock + global Escape handler for upload flow dialogs (confirm + success).
 * Keeps `UploadMusic` orchestrator smaller; same behavior as previous inline `useEffect`s.
 */
export function useUploadDialogChrome({ active, onEscape }: UseUploadDialogChromeOptions): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (active) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscapeRef.current();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [active]);
}
