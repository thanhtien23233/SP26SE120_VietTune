import type { DetectedInstrument } from '@/types/instrumentDetection';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Unwrap common API envelopes until an object with an `instruments` array is found (or leaf).
 */
export function peelAiAnalysisEnvelope(raw: unknown): Record<string, unknown> | null {
  let cur: unknown = raw;
  for (let i = 0; i < 12; i++) {
    if (!isRecord(cur)) return null;
    if (Array.isArray(cur.instruments)) {
      return cur;
    }
    const inner = cur.data ?? cur.value ?? cur.result ?? cur.payload ?? cur.body;
    if (isRecord(inner)) {
      cur = inner;
      continue;
    }
    return cur;
  }
  return isRecord(cur) ? cur : null;
}

/**
 * Maps one API instrument row. Uses **`name` only** (no `instrument` field).
 */
export function mapInstrumentDetectionRow(raw: unknown): DetectedInstrument | null {
  if (!isRecord(raw)) return null;

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : '';
  if (!name) return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : undefined;
  const rawConf = raw.confidence;
  const parsed =
    typeof rawConf === 'number'
      ? rawConf
      : typeof rawConf === 'string' && rawConf.trim() !== ''
        ? Number(rawConf)
        : NaN;
  const confidence = Number.isFinite(parsed) ? parsed : null;

  return { id, name, confidence };
}
