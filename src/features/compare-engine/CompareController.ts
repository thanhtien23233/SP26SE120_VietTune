import { AudioEngine } from './AudioEngine';
import { resolveTrackGains } from './OverlayManager';
import type { FocusMode } from './types';

export class CompareController {
  constructor(private readonly engine: AudioEngine) {}

  applyFocusAndCrossfade(focus: FocusMode, crossfade: number) {
    const gain = resolveTrackGains(focus, crossfade);
    this.engine.setCrossfade(gain.b);
    if (focus !== 'both') this.engine.setFocusMode(focus);
    else this.engine.setFocusMode('both');
  }
}

