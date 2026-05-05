import type { DetectedInstrument } from '@/types/instrumentDetection';
import { normalizeInstrumentMatchKey } from '@/utils/instrumentMetadataMapper';

export type DeclaredDetectedRow = {
  declared: string;
  detected: string | null;
  confidence: number | null;
  matched: boolean;
};

export type DeclaredDetectedComparison = {
  rows: DeclaredDetectedRow[];
  unmatchedDetected: DetectedInstrument[];
  matchedCount: number;
  mismatchCount: number;
};

function dedupeDeclared(declared: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of declared) {
    const label = String(raw ?? '').trim();
    if (!label) continue;
    const key = normalizeInstrumentMatchKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function compareDeclaredDetectedInstruments(
  declared: readonly string[],
  detected: readonly DetectedInstrument[],
): DeclaredDetectedComparison {
  const declaredUnique = dedupeDeclared(declared);
  const detectedByKey = new Map<string, DetectedInstrument>();

  for (const d of detected) {
    const key = normalizeInstrumentMatchKey(d.name);
    if (!key) continue;
    const prev = detectedByKey.get(key);
    const rank = (c: number | null) => (c !== null && Number.isFinite(c) ? c : -1);
    if (!prev || rank(d.confidence) > rank(prev.confidence)) {
      detectedByKey.set(key, d);
    }
  }

  const matchedKeys = new Set<string>();
  const rows: DeclaredDetectedRow[] = declaredUnique.map((declaredName) => {
    const key = normalizeInstrumentMatchKey(declaredName);
    const match = detectedByKey.get(key);
    if (match) {
      matchedKeys.add(key);
      return {
        declared: declaredName,
        detected: match.name,
        confidence: match.confidence,
        matched: true,
      };
    }
    return {
      declared: declaredName,
      detected: null,
      confidence: null,
      matched: false,
    };
  });

  const unmatchedDetected = [...detected]
    .filter((d) => !matchedKeys.has(normalizeInstrumentMatchKey(d.name)))
    .sort((a, b) => {
      const ca = a.confidence !== null && Number.isFinite(a.confidence) ? a.confidence : -1;
      const cb = b.confidence !== null && Number.isFinite(b.confidence) ? b.confidence : -1;
      return cb - ca;
    });

  return {
    rows,
    unmatchedDetected,
    matchedCount: rows.filter((row) => row.matched).length,
    mismatchCount: rows.filter((row) => !row.matched).length + unmatchedDetected.length,
  };
}
