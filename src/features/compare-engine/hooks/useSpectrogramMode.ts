import { useState } from 'react';

import type { SpectrogramMode } from '../types';

export function useSpectrogramMode() {
  const [mode, setMode] = useState<SpectrogramMode>('side-by-side');
  return { mode, setMode };
}

