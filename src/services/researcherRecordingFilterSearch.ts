import { api } from "@/services/api";
import { mapSubmissionToLocalRecording } from "@/services/submissionApiMapper";
import { buildSubmissionLookupMaps } from "@/services/expertModerationApi";
import { convertLocalToRecording } from "@/utils/localRecordingToRecording";
import type { LocalRecording, Recording } from "@/types";
import type { SubmissionLookupMaps } from "@/services/submissionApiMapper";

/** Query for GET /Recording/search-by-filter (see BE Swagger). */
export type RecordingSearchByFilterQuery = {
  q?: string;
  ethnicGroupId?: string;
  instrumentId?: string;
  ceremonyId?: string;
  /** Macro region: FE sends `Region` enum key (e.g. RED_RIVER_DELTA); align with BE if codes differ. */
  regionCode?: string;
  communeId?: string;
  page?: number;
  pageSize?: number;
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
  if (typeof input !== "object") return input;
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
  if (dataVal && typeof dataVal === "object" && !Array.isArray(dataVal)) {
    const d = dataVal as Record<string, unknown>;
    const looksLikeRecording =
      typeof d.title === "string" ||
      typeof d.audioFileUrl === "string" ||
      Array.isArray(d.instrumentIds);
    if (looksLikeRecording) return [d];
  }
  return [];
}

function filterRowToLocal(row: Record<string, unknown>, lookups: SubmissionLookupMaps): LocalRecording {
  const rec =
    row.recording && typeof row.recording === "object" && !Array.isArray(row.recording)
      ? (row.recording as Record<string, unknown>)
      : row;
  const topId = String(
    row.id ?? row.recordingId ?? row.recording_id ?? rec.id ?? rec.recordingId ?? rec.recording_id ?? "",
  ).trim();
  const syntheticSubmission = {
    ...row,
    id: topId || String(row.submissionId ?? row.submission_id ?? "").trim(),
    status: 2,
    recording: rec,
  } as Record<string, unknown>;
  return mapSubmissionToLocalRecording(syntheticSubmission, lookups);
}

/**
 * Server-side search for researcher catalog (metadata filters + optional `q`).
 */
export async function fetchRecordingsSearchByFilter(query: RecordingSearchByFilterQuery): Promise<Recording[]> {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 500,
  };
  if (query.q?.trim()) params.q = query.q.trim();
  if (query.ethnicGroupId) params.ethnicGroupId = query.ethnicGroupId;
  if (query.instrumentId) params.instrumentId = query.instrumentId;
  if (query.ceremonyId) params.ceremonyId = query.ceremonyId;
  if (query.regionCode) params.regionCode = query.regionCode;
  if (query.communeId) params.communeId = query.communeId;

  const [lookups, res] = await Promise.all([
    buildSubmissionLookupMaps(),
    api.get<unknown>("/Recording/search-by-filter", { params }),
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
