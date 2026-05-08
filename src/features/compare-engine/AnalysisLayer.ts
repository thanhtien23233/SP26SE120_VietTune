import type { Recording } from '@/types';

export type InstrumentFingerprint = {
  leftOnly: string[];
  rightOnly: string[];
  shared: string[];
};

export function buildInstrumentFingerprint(
  left?: Recording,
  right?: Recording,
): InstrumentFingerprint {
  const l = new Set((left?.instruments ?? []).map((i) => i.nameVietnamese ?? i.name).filter(Boolean));
  const r = new Set((right?.instruments ?? []).map((i) => i.nameVietnamese ?? i.name).filter(Boolean));
  const shared = Array.from(l).filter((name) => r.has(name));
  const leftOnly = Array.from(l).filter((name) => !r.has(name));
  const rightOnly = Array.from(r).filter((name) => !l.has(name));
  return { leftOnly, rightOnly, shared };
}

