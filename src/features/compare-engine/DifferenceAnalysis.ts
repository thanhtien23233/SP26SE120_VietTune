import { DIFFERENCE_CLAMP_DB } from './constants';
import type { DifferenceSummary, SpectrogramMatrix } from './types';

export function buildDifferenceMatrix(a: SpectrogramMatrix, b: SpectrogramMatrix): SpectrogramMatrix {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const idxA = y * a.width + x;
      const idxB = y * b.width + x;
      data[idx] = a.data[idxA] - b.data[idxB];
    }
  }
  return { width, height, data };
}

export function summarizeDifference(diff: SpectrogramMatrix): DifferenceSummary {
  if (diff.data.length === 0) {
    return { divergence: 0, bass: 0, mid: 0, treble: 0, similarity: 1, signedRangeDb: DIFFERENCE_CLAMP_DB };
  }
  let total = 0;
  let bass = 0;
  let mid = 0;
  let treble = 0;
  let same = 0;
  const bandA = Math.floor(diff.height * 0.33);
  const bandB = Math.floor(diff.height * 0.66);
  for (let y = 0; y < diff.height; y++) {
    for (let x = 0; x < diff.width; x++) {
      const v = Math.abs(diff.data[y * diff.width + x]);
      total += v;
      if (v < 0.05) same += 1;
      if (y <= bandA) bass += v;
      else if (y <= bandB) mid += v;
      else treble += v;
    }
  }
  const count = diff.width * diff.height;
  return {
    divergence: total / count,
    bass: bass / (Math.max(1, bandA) * diff.width),
    mid: mid / (Math.max(1, bandB - bandA) * diff.width),
    treble: treble / (Math.max(1, diff.height - bandB) * diff.width),
    similarity: same / count,
    signedRangeDb: DIFFERENCE_CLAMP_DB,
  };
}

