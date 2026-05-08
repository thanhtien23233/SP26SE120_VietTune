import {
  DEFAULT_FFT_SIZE,
  DEFAULT_HOP_SIZE,
} from './constants';
import type { SpectrogramDiagnostics, SpectrogramMatrix } from './types';

export type FFTJobInput = {
  pcm: Float32Array;
  sampleRate: number;
  fftSize?: number;
  hopSize?: number;
};

export type FFTJobOutput = {
  matrix: SpectrogramMatrix;
  diagnostics: SpectrogramDiagnostics;
};

function percentile(sortedValues: Float32Array, q: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.max(0, Math.min(sortedValues.length - 1, Math.floor(q * (sortedValues.length - 1))));
  return sortedValues[idx];
}

export function runFFTProcessor(input: FFTJobInput): FFTJobOutput {
  const fftSize = input.fftSize ?? DEFAULT_FFT_SIZE;
  const hopSize = input.hopSize ?? DEFAULT_HOP_SIZE;
  const { pcm, sampleRate } = input;
  const frameCount = Math.max(1, Math.floor(Math.max(0, pcm.length - fftSize) / hopSize) + 1);
  const binCount = fftSize / 2;
  const data = new Float32Array(frameCount * binCount);
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let frame = 0; frame < frameCount; frame++) {
    const offset = frame * hopSize;
    for (let bin = 0; bin < binCount; bin++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < fftSize; n++) {
        const sample = (pcm[offset + n] ?? 0) * window[n];
        const angle = (2 * Math.PI * bin * n) / fftSize;
        re += sample * Math.cos(angle);
        im -= sample * Math.sin(angle);
      }
      const power = re * re + im * im;
      const db = 10 * Math.log10(Math.max(1e-12, power));
      const targetIdx = (binCount - 1 - bin) * frameCount + frame;
      data[targetIdx] = db;
      if (db < min) min = db;
      if (db > max) max = db;
    }
  }

  const sorted = new Float32Array(data);
  sorted.sort();
  const dbP05 = percentile(sorted, 0.05);
  const dbP95 = percentile(sorted, 0.95);
  const matrix: SpectrogramMatrix = {
    width: frameCount,
    height: binCount,
    data,
    dbMin: min,
    dbMax: max,
    dbP05,
    dbP95,
  };
  const diagnostics: SpectrogramDiagnostics = {
    sampleRate,
    fftSize,
    hopSize,
    frameCount,
    binCount,
    dbMin: min,
    dbMax: max,
    dbP05,
    dbP95,
  };

  if (import.meta.env.DEV && import.meta.env.VITE_SPECTROGRAM_DEBUG === 'true') {
    const slice = Math.min(20, data.length);
    let mean = 0;
    for (let i = 0; i < data.length; i++) mean += data[i];
    mean /= data.length;
    // eslint-disable-next-line no-console -- intentional diagnostics
    console.debug('[spectrogram:fft]', {
      frameCount,
      binCount,
      dbMin: min,
      dbMax: max,
      dbP05,
      dbP95,
      spread: dbP95 - dbP05,
      meanApprox: mean,
      dataHead: Array.from(data.subarray(0, slice)),
    });
  }

  return { matrix, diagnostics };
}

