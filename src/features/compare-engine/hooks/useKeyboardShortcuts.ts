import { useEffect } from 'react';

import type { SpectrogramMode } from '../types';

type Params = {
  onTogglePlay: () => void;
  onNudge: (delta: number) => void;
  setMode: (mode: SpectrogramMode) => void;
  setFocusBoth: () => void;
  setFocusA: () => void;
  setFocusB: () => void;
};

export function useKeyboardShortcuts({
  onTogglePlay,
  onNudge,
  setMode,
  setFocusBoth,
  setFocusA,
  setFocusB,
}: Params) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === '1') {
        setFocusA();
      } else if (e.key === '2') {
        setFocusB();
      } else if (e.key === '3') {
        setFocusBoth();
        setMode('overlay');
      } else if (e.key === '4') {
        setMode('difference');
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        onNudge(-0.1);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        onNudge(0.1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNudge, onTogglePlay, setFocusA, setFocusB, setFocusBoth, setMode]);
}

