import { DEFAULT_MAX_DB, DEFAULT_MIN_DB } from './constants';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function dbToNorm(db: number): number {
  return clamp01((db - DEFAULT_MIN_DB) / (DEFAULT_MAX_DB - DEFAULT_MIN_DB));
}

/**
 * Magma-style heatmap: **low energy → near black**.
 * Previous polynomial had b ≈ 250 at t=0, which painted “silence” as bright blue → solid blue slabs.
 */
function buildMagmaLUT(): Array<[number, number, number, number]> {
  const stops: Array<[number, number, number]> = [
    [0, 0, 2],
    [28, 12, 42],
    [69, 13, 89],
    [114, 23, 112],
    [179, 37, 102],
    [225, 68, 57],
    [251, 163, 37],
    [252, 235, 155],
  ];
  const lut: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const pos = t * (stops.length - 1);
    const j = Math.floor(pos);
    const f = pos - j;
    const [r0, g0, b0] = stops[Math.min(j, stops.length - 1)];
    const [r1, g1, b1] = stops[Math.min(j + 1, stops.length - 1)];
    lut.push([
      Math.round(r0 + (r1 - r0) * f),
      Math.round(g0 + (g1 - g0) * f),
      Math.round(b0 + (b1 - b0) * f),
      255,
    ]);
  }
  return lut;
}

const MAGMA_LUT = buildMagmaLUT();

export function magma(norm: number): [number, number, number, number] {
  const clamped = clamp01(norm);
  const idxFloat = clamped * (MAGMA_LUT.length - 1);
  const i0 = Math.floor(idxFloat);
  const i1 = Math.min(MAGMA_LUT.length - 1, i0 + 1);
  const blend = idxFloat - i0;
  const c0 = MAGMA_LUT[i0];
  const c1 = MAGMA_LUT[i1];
  return [
    Math.round(c0[0] * (1 - blend) + c1[0] * blend),
    Math.round(c0[1] * (1 - blend) + c1[1] * blend),
    Math.round(c0[2] * (1 - blend) + c1[2] * blend),
    255,
  ];
}

export function diverging(norm: number): [number, number, number, number] {
  const t = clamp01((norm + 1) / 2); // -1..1 -> 0..1
  if (t < 0.5) {
    const k = t * 2;
    return [Math.round(255 * k), Math.round(255 * k), 255, 255];
  }
  const k = (t - 0.5) * 2;
  return [255, Math.round(255 * (1 - k)), Math.round(255 * (1 - k)), 255];
}
