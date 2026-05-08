import type { FocusMode, TrackSlot } from './types';

type TrackState = {
  buffer: AudioBuffer | null;
  gain: GainNode | null;
  analyser: AnalyserNode | null;
  source: AudioBufferSourceNode | null;
  url: string | null;
  connected: boolean;
};

export class AudioEngine {
  private context: AudioContext | null = null;
  private readonly tracks: Record<TrackSlot, TrackState> = {
    A: { buffer: null, gain: null, analyser: null, source: null, url: null, connected: false },
    B: { buffer: null, gain: null, analyser: null, source: null, url: null, connected: false },
  };
  private isPlaying = false;
  private startAtCtx = 0;
  private startOffset = 0;

  private ensureContext() {
    if (!this.context) this.context = new AudioContext();
    for (const slot of ['A', 'B'] as const) {
      const state = this.tracks[slot];
      if (!state.gain) {
        state.gain = this.context.createGain();
        state.gain.gain.value = 1;
      }
      if (!state.analyser) {
        state.analyser = this.context.createAnalyser();
        state.analyser.fftSize = 1024;
        state.analyser.smoothingTimeConstant = 0.75;
      }
      if (state.gain && state.analyser && !state.connected) {
        state.gain.connect(state.analyser);
        state.analyser.connect(this.context.destination);
        state.connected = true;
      }
    }
  }

  async loadTrack(slot: TrackSlot, url: string): Promise<void> {
    this.ensureContext();
    if (!this.context) return;
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error(`Failed to load ${slot}: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const buffer = await this.context.decodeAudioData(bytes.slice(0));
    this.tracks[slot].buffer = buffer;
    this.tracks[slot].url = url;
    this.rebuildSources(this.startOffset);
  }

  private disposeSource(slot: TrackSlot) {
    const source = this.tracks[slot].source;
    if (!source) return;
    try {
      source.stop();
    } catch {
      // noop
    }
    try {
      source.disconnect();
    } catch {
      // noop
    }
    this.tracks[slot].source = null;
  }

  private rebuildSources(offsetSec: number) {
    if (!this.context) return;
    for (const slot of ['A', 'B'] as const) {
      this.disposeSource(slot);
      const state = this.tracks[slot];
      if (!state.buffer || !state.gain) continue;
      const src = this.context.createBufferSource();
      src.buffer = state.buffer;
      src.connect(state.gain);
      src.onended = () => {
        if (this.isPlaying && this.getCurrentTime() >= this.getMaxDuration() - 0.01) {
          this.isPlaying = false;
          this.startOffset = this.getMaxDuration();
        }
      };
      state.source = src;
    }
    this.startOffset = Math.max(0, offsetSec);
  }

  private getMaxDuration() {
    return Math.max(this.getDuration('A'), this.getDuration('B'));
  }

  async play(): Promise<void> {
    this.ensureContext();
    if (!this.context || this.isPlaying) return;
    if (this.context.state === 'suspended') await this.context.resume();
    this.rebuildSources(this.startOffset);
    this.startAtCtx = this.context.currentTime;
    for (const slot of ['A', 'B'] as const) {
      const source = this.tracks[slot].source;
      const buffer = this.tracks[slot].buffer;
      if (!source || !buffer) continue;
      const safeOffset = Math.min(this.startOffset, Math.max(0, buffer.duration - 0.01));
      source.start(this.startAtCtx, safeOffset);
    }
    this.isPlaying = true;
  }

  pause() {
    if (!this.isPlaying) return;
    this.startOffset = this.getCurrentTime();
    for (const slot of ['A', 'B'] as const) this.disposeSource(slot);
    this.isPlaying = false;
  }

  seek(timeSec: number) {
    const next = Math.max(0, Math.min(timeSec, this.getMaxDuration()));
    this.startOffset = next;
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
      void this.play();
      return;
    }
    this.rebuildSources(next);
  }

  setFocusMode(mode: FocusMode) {
    const gainA = this.tracks.A.gain;
    const gainB = this.tracks.B.gain;
    if (!this.context || !gainA || !gainB) return;
    const now = this.context.currentTime;
    gainA.gain.cancelScheduledValues(now);
    gainB.gain.cancelScheduledValues(now);
    gainA.gain.setValueAtTime(gainA.gain.value, now);
    gainB.gain.setValueAtTime(gainB.gain.value, now);
    gainA.gain.linearRampToValueAtTime(mode === 'right' ? 0 : 1, now + 0.01);
    gainB.gain.linearRampToValueAtTime(mode === 'left' ? 0 : 1, now + 0.01);
  }

  setCrossfade(value: number) {
    if (!this.context || !this.tracks.A.gain || !this.tracks.B.gain) return;
    const clamped = Math.max(0, Math.min(1, value));
    const now = this.context.currentTime;
    this.tracks.A.gain.gain.cancelScheduledValues(now);
    this.tracks.B.gain.gain.cancelScheduledValues(now);
    this.tracks.A.gain.gain.setValueAtTime(this.tracks.A.gain.gain.value, now);
    this.tracks.B.gain.gain.setValueAtTime(this.tracks.B.gain.gain.value, now);
    this.tracks.A.gain.gain.linearRampToValueAtTime(1 - clamped, now + 0.01);
    this.tracks.B.gain.gain.linearRampToValueAtTime(clamped, now + 0.01);
  }

  getCurrentTime() {
    if (!this.context || !this.isPlaying) return this.startOffset;
    return Math.min(this.getMaxDuration(), this.startOffset + (this.context.currentTime - this.startAtCtx));
  }

  getDuration(slot: TrackSlot) {
    return this.tracks[slot].buffer?.duration ?? 0;
  }

  getAnalyser(slot: TrackSlot) {
    return this.tracks[slot].analyser;
  }

  getBuffer(slot: TrackSlot) {
    return this.tracks[slot].buffer;
  }

  getPlaying() {
    return this.isPlaying;
  }

  dispose() {
    this.pause();
    for (const slot of ['A', 'B'] as const) {
      this.disposeSource(slot);
      try {
        this.tracks[slot].gain?.disconnect();
        this.tracks[slot].analyser?.disconnect();
      } catch {
        // noop
      }
    }
    void this.context?.close();
    this.context = null;
  }
}

