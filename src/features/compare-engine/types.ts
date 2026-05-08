export type TrackSlot = 'A' | 'B';

export type SpectrogramMode = 'side-by-side' | 'overlay' | 'difference';

export type FocusMode = 'both' | 'left' | 'right';

export interface SpectrogramMatrix {
  width: number;
  height: number;
  data: Float32Array;
  dbMin?: number;
  dbMax?: number;
  dbP05?: number;
  dbP95?: number;
}

export interface DifferenceSummary {
  divergence: number;
  bass: number;
  mid: number;
  treble: number;
  similarity: number;
  signedRangeDb: number;
}

export interface SpectrogramDiagnostics {
  sampleRate: number;
  fftSize: number;
  hopSize: number;
  frameCount: number;
  binCount: number;
  dbMin: number;
  dbMax: number;
  dbP05: number;
  dbP95: number;
}

