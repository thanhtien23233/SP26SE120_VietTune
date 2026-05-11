import { apiFetch, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import type { ApiRecordingSearchByFilterQuery } from '@/api';
import { PAGE_SIZE_RESEARCHER_SEARCH_DEFAULT } from '@/config/pagination';
import { buildSubmissionLookupMaps } from '@/services/expertModerationApi';
import { recordingService } from '@/services/recordingService';
import { mapSubmissionToLocalRecording } from '@/services/submissionApiMapper';
import type { SubmissionLookupMaps } from '@/services/submissionApiMapper';
import type { LocalRecording, Recording } from '@/types';
import type { Region } from '@/types/reference';
import { convertLocalToRecording } from '@/utils/localRecordingToRecording';
import { normalizeSearchText } from '@/utils/searchText';

/** Query for GET /Recording/search-by-filter (see BE Swagger). */
export type RecordingSearchByFilterQuery = ApiRecordingSearchByFilterQuery & {
  q?: string;
};

type RecordingFilterSearchApiResponse =
  | Record<string, unknown>[]
  | {
      data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      Data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      items?: Record<string, unknown>[];
      Items?: Record<string, unknown>[];
      records?: Record<string, unknown>[];
      result?: Record<string, unknown>[] | { items?: Record<string, unknown>[] };
      value?: Record<string, unknown>[];
    };

function normalizeJsonKey(k: string): string {
  if (!k) return k;
  if (/^[A-Z]{1,4}$/.test(k)) return k.toLowerCase();
  if (/^[A-Z]/.test(k)) return k.charAt(0).toLowerCase() + k.slice(1);
  return k;
}

/** Coerce common .NET / Swagger envelope shapes; normalize PascalCase keys for the mapper. */
export function normalizeDotNetJsonKeys(input: unknown, depth = 0): unknown {
  if (input === null || input === undefined || depth > 8) return input;
  if (Array.isArray(input)) {
    return input.map((x) => normalizeDotNetJsonKeys(x, depth + 1));
  }
  if (typeof input !== 'object') return input;
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[normalizeJsonKey(k)] = normalizeDotNetJsonKeys(v, depth + 1);
  }
  return out;
}

export function extractRecordingFilterSearchRows(res: unknown): Record<string, unknown>[] {
  const root = normalizeDotNetJsonKeys(res) as Record<string, unknown> | unknown[] | null;
  if (!root) return [];
  if (Array.isArray(root)) return root as Record<string, unknown>[];
  const r = root as Record<string, unknown>;
  const candidates = [
    r.data,
    r.items,
    (r.data as Record<string, unknown> | undefined)?.items,
    (r.data as Record<string, unknown> | undefined)?.records,
    (r.data as Record<string, unknown> | undefined)?.data,
    r.records,
    r.result,
    (r.result as Record<string, unknown> | undefined)?.items,
    r.value,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as Record<string, unknown>[];
  }
  const dataVal = r.data;
  if (dataVal && typeof dataVal === 'object' && !Array.isArray(dataVal)) {
    const d = dataVal as Record<string, unknown>;
    const looksLikeRecording =
      typeof d.title === 'string' ||
      typeof d.audioFileUrl === 'string' ||
      Array.isArray(d.instrumentIds);
    if (looksLikeRecording) return [d];
  }
  return [];
}

function filterRowToLocal(
  row: Record<string, unknown>,
  lookups: SubmissionLookupMaps,
): LocalRecording {
  const rec =
    row.recording && typeof row.recording === 'object' && !Array.isArray(row.recording)
      ? (row.recording as Record<string, unknown>)
      : row;
  const topId = String(
    row.id ??
      row.recordingId ??
      row.recording_id ??
      rec.id ??
      rec.recordingId ??
      rec.recording_id ??
      '',
  ).trim();
  const syntheticSubmission = {
    ...row,
    id: topId || String(row.submissionId ?? row.submission_id ?? '').trim(),
    status: 2,
    recording: rec,
  } as Record<string, unknown>;
  return mapSubmissionToLocalRecording(syntheticSubmission, lookups);
}

function matchesResearcherMetadataFilters(
  recording: Recording,
  query: RecordingSearchByFilterQuery,
): boolean {
  if (query.ethnicGroupId) {
    const wanted = query.ethnicGroupId;
    const ok =
      recording.ethnicity?.id === wanted ||
      recording.ethnicity?.name === wanted ||
      recording.ethnicity?.nameVietnamese === wanted;
    if (!ok) return false;
  }
  if (query.instrumentId) {
    const wanted = query.instrumentId;
    const ok = (recording.instruments ?? []).some(
      (inst) => inst.id === wanted || inst.name === wanted || inst.nameVietnamese === wanted,
    );
    if (!ok) return false;
  }
  if (query.regionCode && recording.region !== query.regionCode) return false;
  if (query.q?.trim()) {
    const q = normalizeSearchText(query.q);
    const hay = normalizeSearchText(
      `${recording.title ?? ''} ${recording.titleVietnamese ?? ''} ${recording.description ?? ''}`,
    );
    if (!hay.includes(q)) return false;
  }
  return true;
}

/**
 * Server-side search for researcher catalog (metadata filters + optional `q`).
 */
export async function fetchRecordingsSearchByFilter(
  query: RecordingSearchByFilterQuery,
): Promise<Recording[]> {
  const q = query.q?.trim();
  if (q) {
    const titleRes = await recordingService.searchRecordingsByTitle(
      q,
      query.page ?? 1,
      query.pageSize ?? 500,
    );
    const needsMetadata = Boolean(
      query.ethnicGroupId ||
        query.instrumentId ||
        query.ceremonyId ||
        query.regionCode ||
        query.communeId,
    );
    if (!needsMetadata) return titleRes.items;
    return titleRes.items.filter((item) => matchesResearcherMetadataFilters(item, query));
  }

  const apiQuery: ApiRecordingSearchByFilterQuery & { q?: string } = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 500,
    ...(query.ethnicGroupId ? { ethnicGroupId: query.ethnicGroupId } : {}),
    ...(query.instrumentId ? { instrumentId: query.instrumentId } : {}),
    ...(query.ceremonyId ? { ceremonyId: query.ceremonyId } : {}),
    ...(query.regionCode ? { regionCode: query.regionCode } : {}),
    ...(query.communeId ? { communeId: query.communeId } : {}),
  };

  const [lookups, res] = await Promise.all([
    buildSubmissionLookupMaps(),
    apiOk(
      asApiEnvelope<RecordingFilterSearchApiResponse>(
        apiFetch.GET('/api/Recording/search-by-filter', {
          params: { query: openApiQueryRecord(apiQuery) },
        }),
      ),
    ),
  ]);
  const rows = extractRecordingFilterSearchRows(res);
  const locals = rows.map((row, index) => {
    const local = filterRowToLocal(
      normalizeDotNetJsonKeys(row) as Record<string, unknown>,
      lookups,
    );
    if (!local.id?.trim()) {
      return { ...local, id: `search-row-${index}` };
    }
    return local;
  });
  const byId = new Map<string, LocalRecording>();
  for (const l of locals) {
    byId.set(l.id ?? `row-${byId.size}`, l);
  }
  return Promise.all([...byId.values()].map((l) => convertLocalToRecording(l)));
}

/** Guest-safe variant using `/api/RecordingGuest/search-by-filter` (no Authorization required). */
export async function fetchGuestRecordingsSearchByFilter(
  query: RecordingSearchByFilterQuery,
): Promise<Recording[]> {
  const q = query.q?.trim();
  if (q) {
    const titleRes = await recordingService.searchGuestRecordingsByTitle(
      q,
      query.page ?? 1,
      query.pageSize ?? 500,
    );
    const needsMetadata = Boolean(
      query.ethnicGroupId ||
        query.instrumentId ||
        query.ceremonyId ||
        query.regionCode ||
        query.communeId,
    );
    if (!needsMetadata) return titleRes.items;
    return titleRes.items.filter((item) => matchesResearcherMetadataFilters(item, query));
  }

  const filters = {
    query: undefined,
    ethnicityIds: query.ethnicGroupId ? [query.ethnicGroupId] : [],
    instrumentIds: query.instrumentId ? [query.instrumentId] : [],
    regions: query.regionCode ? ([query.regionCode] as Region[]) : [],
    tags: [],
  };
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? PAGE_SIZE_RESEARCHER_SEARCH_DEFAULT;
  const result = await recordingService.getGuestRecordingsByFilter(filters, page, pageSize);
  return Array.isArray(result?.items) ? result.items : [];
}
