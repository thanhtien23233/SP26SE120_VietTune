import { INSTRUMENT_METADATA_FALLBACK } from '@/features/upload/constants/instrumentMetadataFallback';
import type { EthnicGroupItem, InstrumentItem, VocalStyleItem } from '@/services/referenceDataService';
import type {
  AdvisoryMetadataSuggestion,
  AdvisoryMetadataSuggestionField,
  DetectedInstrument,
  MetadataSuggestion,
  MetadataSuggestionCandidate,
} from '@/types/instrumentDetection';

/** Normalize for case- and accent-insensitive instrument name matching. */
export function normalizeInstrumentMatchKey(input: string): string {
  const s = String(input ?? '')
    .replace(/đ/gi, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return s.replace(/\s+/g, ' ');
}

function pickBestRegionLabel(raw: string | null | undefined, availableRegions: readonly string[]): string | null {
  if (!raw?.trim()) return null;
  const n = normalizeInstrumentMatchKey(raw);
  for (const r of availableRegions) {
    if (normalizeInstrumentMatchKey(r) === n) return r;
  }
  for (const r of availableRegions) {
    const rn = normalizeInstrumentMatchKey(r);
    if (n.includes(rn) || rn.includes(n)) return r;
  }
  return raw.trim();
}

function findInstrumentByDetectedName(
  detectedName: string,
  instrumentsData: readonly InstrumentItem[],
): InstrumentItem | undefined {
  const key = normalizeInstrumentMatchKey(detectedName);
  return instrumentsData.find((i) => normalizeInstrumentMatchKey(i.name) === key);
}

function lookupFallback(detectedName: string) {
  const key = normalizeInstrumentMatchKey(detectedName);
  return INSTRUMENT_METADATA_FALLBACK[key];
}

function pushSuggestion(
  out: MetadataSuggestion[],
  field: MetadataSuggestion['field'],
  value: string,
  sourceInstrument: string,
  confidence: number,
) {
  const v = value.trim();
  if (!v) return;
  out.push({ field, value: v, sourceInstrument, confidence });
}

/**
 * Stable key for expert verification / dedupe (field + value + source instrument).
 */
export function metadataSuggestionKey(s: MetadataSuggestion): string {
  return `${s.field}|${normalizeInstrumentMatchKey(s.value)}|${normalizeInstrumentMatchKey(s.sourceInstrument)}`;
}

/**
 * Dedupe by (field, display value), keeping the row with highest confidence; then sort by confidence desc.
 */
export function dedupeAndSortMetadataSuggestions(rows: MetadataSuggestion[]): MetadataSuggestion[] {
  const best = new Map<string, MetadataSuggestion>();
  for (const row of rows) {
    const dedupeKey = `${row.field}|${normalizeInstrumentMatchKey(row.value)}`;
    const prev = best.get(dedupeKey);
    const rowConf = Number.isFinite(row.confidence) ? row.confidence : -1;
    const prevConf = prev ? (Number.isFinite(prev.confidence) ? prev.confidence : -1) : -1;
    if (!prev || rowConf > prevConf) {
      best.set(dedupeKey, row);
    }
  }
  return [...best.values()].sort((a, b) => {
    const ca = Number.isFinite(a.confidence) ? a.confidence : -1;
    const cb = Number.isFinite(b.confidence) ? b.confidence : -1;
    return cb - ca;
  });
}

export type MapInstrumentsToMetadataSuggestionsParams = {
  detected: readonly DetectedInstrument[];
  instrumentsData: readonly InstrumentItem[];
  ethnicGroupsData: readonly EthnicGroupItem[];
  vocalStylesData: readonly VocalStyleItem[];
  /** Macro-region labels from upload (province region codes) — used to align `primaryRegion` strings. */
  availableRegions: readonly string[];
};

/**
 * Hybrid mapping: DB join via `originEthnicGroupId` + `VocalStyleItem.ethnicGroupId`, then static fallback.
 */
export function mapInstrumentsToMetadataSuggestions(
  params: MapInstrumentsToMetadataSuggestionsParams,
): MetadataSuggestion[] {
  const { detected, instrumentsData, ethnicGroupsData, vocalStylesData, availableRegions } = params;
  const raw: MetadataSuggestion[] = [];

  const ethnicById = new Map(ethnicGroupsData.map((e) => [e.id, e]));

  for (const d of detected) {
    const name = d.name?.trim();
    if (!name) continue;
    const confCandidate =
      d.confidence !== null && typeof d.confidence === 'number' && Number.isFinite(d.confidence)
        ? d.confidence
        : null;
    if (confCandidate == null) continue;
    const conf = Math.max(0, Math.min(1, confCandidate > 1 ? confCandidate / 100 : confCandidate));

    const inst = findInstrumentByDetectedName(name, instrumentsData);
    const egId = inst?.originEthnicGroupId?.trim();
    const ethnic = egId ? ethnicById.get(egId) : undefined;

    if (ethnic?.name) {
      pushSuggestion(raw, 'ethnicity', ethnic.name, name, conf);
    }
    if (ethnic?.primaryRegion) {
      const regionLabel = pickBestRegionLabel(ethnic.primaryRegion, availableRegions) ?? ethnic.primaryRegion;
      pushSuggestion(raw, 'region', regionLabel, name, conf);
    }

    if (egId) {
      for (const vs of vocalStylesData) {
        if (vs.ethnicGroupId && String(vs.ethnicGroupId) === String(egId) && vs.name?.trim()) {
          pushSuggestion(raw, 'vocalStyle', vs.name.trim(), name, conf);
        }
      }
    }

    const fb = lookupFallback(name);
    if (fb) {
      for (const e of fb.ethnicities ?? []) {
        pushSuggestion(raw, 'ethnicity', e, name, conf);
      }
      for (const r of fb.regions ?? []) {
        const regionLabel = pickBestRegionLabel(r, availableRegions) ?? r;
        pushSuggestion(raw, 'region', regionLabel, name, conf);
      }
      for (const v of fb.vocalStyles ?? []) {
        pushSuggestion(raw, 'vocalStyle', v, name, conf);
      }
      for (const ev of fb.eventTypes ?? []) {
        pushSuggestion(raw, 'eventType', ev, name, conf);
      }
    }
  }

  return dedupeAndSortMetadataSuggestions(raw);
}

function mapLegacyFieldToAdvisoryField(
  field: MetadataSuggestion['field'],
): AdvisoryMetadataSuggestionField | null {
  if (field === 'region') return 'region';
  if (field === 'ethnicity') return 'ethnicGroup';
  if (field === 'vocalStyle') return 'genre';
  if (field === 'eventType') return 'eventType';
  return null;
}

function evaluateConflict(candidates: readonly MetadataSuggestionCandidate[]): {
  conflictDetected: boolean;
  requiresExpert: boolean;
} {
  const topScore = candidates[0]?.score ?? 0;
  const secondScore = candidates[1]?.score ?? 0;
  const gap = topScore - secondScore;
  const conflictDetected = gap >= 0.05 && gap <= 0.2;
  const requiresExpert = topScore < 0.5 || gap < 0.05;
  return { conflictDetected, requiresExpert };
}

function rankCandidates(rows: readonly MetadataSuggestion[]): MetadataSuggestionCandidate[] {
  const bestByValue = new Map<string, MetadataSuggestionCandidate>();
  const sourceByValue = new Map<string, Set<string>>();
  const advisoryField = mapLegacyFieldToAdvisoryField(rows[0]?.field ?? 'region') ?? 'region';

  const aliasCanonicalByField: Record<AdvisoryMetadataSuggestionField, Record<string, string>> = {
    ethnicGroup: {
      kinh: 'Kinh (Việt)',
      'kinh viet': 'Kinh (Việt)',
      'kinh (viet)': 'Kinh (Việt)',
      'kinh (việt)': 'Kinh (Việt)',
    },
    region: {
      'mien bac': 'Miền Bắc',
      'miền bắc': 'Miền Bắc',
      'dong bang song hong': 'Đồng bằng sông Hồng',
      'đồng bằng sông hồng': 'Đồng bằng sông Hồng',
    },
    genre: {},
    eventType: {},
  };

  const canonicalize = (value: string): { key: string; label: string } => {
    const normalized = normalizeInstrumentMatchKey(value);
    const mapped = aliasCanonicalByField[advisoryField][normalized];
    if (mapped) {
      return { key: normalizeInstrumentMatchKey(mapped), label: mapped };
    }
    return { key: normalized, label: value.trim() };
  };

  for (const row of rows) {
    const canonical = canonicalize(row.value);
    const key = canonical.key;
    const sourceName = row.sourceInstrument?.trim();
    if (sourceName) {
      const current = sourceByValue.get(key) ?? new Set<string>();
      current.add(sourceName);
      sourceByValue.set(key, current);
    }
    const prev = bestByValue.get(key);
    const next: MetadataSuggestionCandidate = {
      value: canonical.label,
      label: canonical.label,
      score: row.confidence,
      sourceInstrument: sourceName || undefined,
    };
    const prevScore = prev ? (Number.isFinite(prev.score) ? prev.score : -1) : -1;
    const nextScore = Number.isFinite(next.score) ? next.score : -1;
    if (!prev || nextScore > prevScore) {
      bestByValue.set(key, next);
    }
  }
  return [...bestByValue.entries()]
    .map(([key, candidate]) => {
      const sourceInstruments = [...(sourceByValue.get(key) ?? new Set<string>())];
      return {
        ...candidate,
        sourceInstruments,
        sourceInstrument: sourceInstruments[0] ?? candidate.sourceInstrument,
      };
    })
    .sort((a, b) => {
      const sa = Number.isFinite(a.score) ? a.score : -1;
      const sb = Number.isFinite(b.score) ? b.score : -1;
      return sb - sa;
    });
}

/**
 * Group legacy metadata suggestions into advisory field buckets with conflict flags.
 * This function is additive and does not alter existing mapper behavior.
 */
export function groupMetadataSuggestionsForAdvisory(
  suggestions: readonly MetadataSuggestion[],
): AdvisoryMetadataSuggestion[] {
  const grouped = new Map<AdvisoryMetadataSuggestionField, MetadataSuggestion[]>();
  for (const row of suggestions) {
    const mappedField = mapLegacyFieldToAdvisoryField(row.field);
    if (!mappedField) continue;
    const list = grouped.get(mappedField) ?? [];
    list.push(row);
    grouped.set(mappedField, list);
  }

  const out: AdvisoryMetadataSuggestion[] = [];
  for (const [field, rows] of grouped.entries()) {
    const candidates = rankCandidates(rows);
    if (candidates.length === 0) continue;
    const conflict = evaluateConflict(candidates);
    out.push({
      field,
      candidates,
      conflictDetected: conflict.conflictDetected,
      requiresExpert: conflict.requiresExpert,
    });
  }

  return out.sort((a, b) => a.field.localeCompare(b.field));
}

/**
 * End-to-end advisory mapper:
 * detected instruments -> legacy suggestions -> grouped advisory suggestions.
 */
export function mapInstrumentsToAdvisoryMetadataSuggestions(
  params: MapInstrumentsToMetadataSuggestionsParams,
): AdvisoryMetadataSuggestion[] {
  const legacySuggestions = mapInstrumentsToMetadataSuggestions(params);
  return groupMetadataSuggestionsForAdvisory(legacySuggestions);
}
