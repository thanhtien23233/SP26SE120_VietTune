import type { FocusMode } from './types';

export function resolveTrackGains(focus: FocusMode, crossfade: number): { a: number; b: number } {
  const c = Math.max(0, Math.min(1, crossfade));
  if (focus === 'left') return { a: 1, b: 0 };
  if (focus === 'right') return { a: 0, b: 1 };
  return { a: 1 - c, b: c };
}

