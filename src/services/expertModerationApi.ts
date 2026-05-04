import { apiFetch, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import type {
  ApiSubmissionActionQuery,
  ApiSubmissionGetByStatusQuery,
} from '@/api';
import { type ExpertQueueSource } from '@/config/expertWorkflowPhase';
import { macroRegionDisplayNameFromProvinceRegionCode } from '@/config/provinceRegionCodes';
import { referenceDataService } from '@/services/referenceDataService';
import { logServiceWarn } from '@/services/serviceLogger';
import {
  extractSubmissionRows,
  mapApiSubmissionStatusToModeration,
  mapSubmissionToLocalRecording,
  type SubmissionLookupMaps,
} from '@/services/submissionApiMapper';
import type { LocalRecording } from '@/types';
import { ModerationStatus } from '@/types';
import { toModerationUiStatus } from '@/types/moderation';
import { mutationFail, mutationOk } from '@/types/mutationResult';
import type { MutationResult } from '@/types/mutationResult';
import { getHttpStatus } from '@/utils/httpError';
import { isUuid } from '@/utils/validation';

const DEFAULT_PAGE_SIZE = 200;
const LOOKUP_TTL_MS = 15 * 60 * 1000;
let lookupCache: { ts: number; data: SubmissionLookupMaps } | null = null;
let lookupInflight: Promise<SubmissionLookupMaps> | null = null;

type SubmissionApiRow = Record<string, unknown>;
type SubmissionApiListResponse =
  | SubmissionApiRow[]
  | {
      data?: SubmissionApiRow[] | { items?: SubmissionApiRow[]; Items?: SubmissionApiRow[] };
      Data?: SubmissionApiRow[] | { items?: SubmissionApiRow[]; Items?: SubmissionApiRow[] };
      items?: SubmissionApiRow[];
      Items?: SubmissionApiRow[];
    };

function normalizeId(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

/** Shared reference maps for resolving ethnic/ceremony/instrument/geo IDs in submission payloads. */
export async function buildSubmissionLookupMaps(): Promise<SubmissionLookupMaps> {
  if (lookupCache && Date.now() - lookupCache.ts < LOOKUP_TTL_MS) {
    return lookupCache.data;
  }
  if (lookupInflight) return lookupInflight;
  lookupInflight = (async () => {
    try {
      const [ethnics, ceremonies, instruments, communes, districts, provinces] = await Promise.all([
        referenceDataService.getEthnicGroups(),
        referenceDataService.getCeremonies(),
        referenceDataService.getInstruments(),
        referenceDataService.getCommunes(),
        referenceDataService.getDistricts(),
        referenceDataService.getProvinces(),
      ]);

      const macroRegionByProvinceId = Object.fromEntries(
        provinces
          .map((p) => {
            const label = macroRegionDisplayNameFromProvinceRegionCode(p.regionCode).trim();
            return label ? ([normalizeId(p.id), label] as const) : null;
          })
          .filter((e): e is readonly [string, string] => e != null),
      );
      const provinceIdByDistrictId = Object.fromEntries(
        districts.map((d) => [normalizeId(d.id), normalizeId(d.provinceId)]),
      );
      const districtIdByCommuneId = Object.fromEntries(
        communes.map((c) => [normalizeId(c.id), normalizeId(c.districtId)]),
      );

      const data: SubmissionLookupMaps = {
        ethnicById: Object.fromEntries(ethnics.map((x) => [normalizeId(x.id), x.name])),
        ceremonyById: Object.fromEntries(ceremonies.map((x) => [normalizeId(x.id), x.name])),
        instrumentById: Object.fromEntries(instruments.map((x) => [normalizeId(x.id), x.name])),
        communeById: Object.fromEntries(communes.map((x) => [normalizeId(x.id), x.name])),
        districtById: Object.fromEntries(districts.map((x) => [normalizeId(x.id), x.name])),
        provinceById: Object.fromEntries(provinces.map((x) => [normalizeId(x.id), x.name])),
        macroRegionByProvinceId,
        provinceIdByDistrictId,
        districtIdByCommuneId,
      };
      lookupCache = { ts: Date.now(), data };
      return data;
    } catch {
      return {};
    }
  })();
  try {
    return await lookupInflight;
  } finally {
    lookupInflight = null;
  }
}

async function getSubmissionsByStatus(params: {
  status?: number;
  page?: number;
  pageSize?: number;
  lookups?: SubmissionLookupMaps;
}): Promise<LocalRecording[]> {
  const lookups = params.lookups ?? (await buildSubmissionLookupMaps());
  try {
    const statusParam: ApiSubmissionGetByStatusQuery['status'] =
      params.status === 0 || params.status === 1 || params.status === 2 || params.status === 3 || params.status === 4 || params.status === 5
        ? params.status
        : undefined;
    const res = await apiOk(
      asApiEnvelope<SubmissionApiListResponse>(
        apiFetch.GET('/api/Submission/get-by-status', {
          params: {
            query: openApiQueryRecord({
              ...(statusParam !== undefined ? { status: statusParam } : {}),
              page: params.page ?? 1,
              pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
            }),
          },
        }),
      ),
    );
    return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row, lookups));
  } catch (err: unknown) {
    // Backend returns 400 when no records match the status filter (instead of 200 + [])
    const status = getHttpStatus(err);
    if (status === 400 || status === 404) return [];
    throw err; // Propagate unexpected errors
  }
}

async function getAdminSubmissions(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  reviewer?: string;
  lookups?: SubmissionLookupMaps;
}): Promise<LocalRecording[]> {
  const lookups = params.lookups ?? (await buildSubmissionLookupMaps());
  const res = await apiOk(
    asApiEnvelope<SubmissionApiListResponse>(
      apiFetch.GET('/api/Admin/submissions', {
        params: {
          query: openApiQueryRecord({
            page: params.page ?? 1,
            pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
            ...(params.status ? { status: params.status } : {}),
            ...(params.reviewer ? { reviewer: params.reviewer } : {}),
          }),
        },
      }),
    ),
  );
  return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row, lookups));
}

function dedupeByRecordingId(rows: LocalRecording[]): LocalRecording[] {
  const map = new Map<string, LocalRecording>();
  for (const row of rows) {
    const id = String(row.id ?? '').trim();
    if (!id) continue;
    if (!map.has(id)) map.set(id, row);
  }
  return [...map.values()];
}

/**
 * Backend environments disagree on pending code (some use 1, some use 0).
 * Fallback sequence keeps queue visible without forcing environment-specific config.
 */
async function getPendingQueueByStatusWithFallback(
  lookups: SubmissionLookupMaps,
): Promise<LocalRecording[]> {
  const primary = await getSubmissionsByStatus({
    status: 1,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    lookups,
  });
  if (primary.length > 0) return primary;

  const legacyPending = await getSubmissionsByStatus({
    status: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    lookups,
  });
  if (legacyPending.length > 0) return legacyPending;

  // Final fallback: get all statuses then keep pending-like values via shared mapper.
  const unfiltered = await getSubmissionsByStatus({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    lookups,
  });
  const pendingOnly = unfiltered.filter(
    (row) =>
      toModerationUiStatus(mapApiSubmissionStatusToModeration(row.moderation?.status)) ===
      ModerationStatus.PENDING_REVIEW,
  );
  return dedupeByRecordingId(pendingOnly);
}

export async function fetchExpertQueueBase(source: ExpertQueueSource): Promise<LocalRecording[]> {
  const lookups = await buildSubmissionLookupMaps();
  if (source === 'admin') {
    return getAdminSubmissions({ page: 1, pageSize: DEFAULT_PAGE_SIZE, lookups });
  }
  return getPendingQueueByStatusWithFallback(lookups);
}

/**
 * Fetch approved submissions (backend status=2) for the Expert "Quản lý bản thu đã kiểm duyệt" page.
 * Uses GET /Submission/get-by-status instead of /Submission/my (which is Contributor-only).
 * Returns [] silently if backend returns 400/404 (no records found).
 */
export async function fetchApprovedSubmissionsForExpert(): Promise<LocalRecording[]> {
  try {
    return await getSubmissionsByStatus({ status: 2, page: 1, pageSize: DEFAULT_PAGE_SIZE });
  } catch (err: unknown) {
    const status = getHttpStatus(err);
    if (status === 400 || status === 404) return [];
    logServiceWarn('[expertModerationApi] fetchApprovedSubmissionsForExpert failed', status);
    return [];
  }
}

/**
 * GET /Submission/get-by-reviewer?reviewerId=...
 * Returns [] when backend reports no rows (400/404).
 */
export async function fetchSubmissionsByReviewer(
  reviewerId: string,
  lookups?: SubmissionLookupMaps,
): Promise<LocalRecording[]> {
  const resolvedLookups = lookups ?? (await buildSubmissionLookupMaps());
  try {
    const res = await apiOk(
      asApiEnvelope<SubmissionApiListResponse>(
        apiFetch.GET('/api/Submission/get-by-reviewer', {
          params: { query: { reviewerId } },
        }),
      ),
    );
    return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row, resolvedLookups));
  } catch (err: unknown) {
    const status = getHttpStatus(err);
    if (status === 400 || status === 404) return [];
    throw err;
  }
}

/** PUT /Submission/assign-reviewer-submission */
export async function assignReviewerSubmission(
  submissionId: string,
  reviewerId: string,
): Promise<MutationResult> {
  try {
    if (!isUuid(submissionId) || !isUuid(reviewerId)) {
      return mutationFail(new Error('ID không hợp lệ.'), 400);
    }
    const params: ApiSubmissionActionQuery & { reviewerId: string } = { submissionId, reviewerId };
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.PUT('/api/Submission/assign-reviewer-submission', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
    return mutationOk();
  } catch (err: unknown) {
    const httpStatus = getHttpStatus(err);
    return mutationFail(err, httpStatus);
  }
}

/** PUT /Submission/unassign-reviewer-submission */
export async function unassignReviewerSubmission(submissionId: string): Promise<MutationResult> {
  try {
    if (!isUuid(submissionId)) {
      return mutationFail(new Error('ID không hợp lệ.'), 400);
    }
    const params: ApiSubmissionActionQuery = { submissionId };
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.PUT('/api/Submission/unassign-reviewer-submission', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
    return mutationOk();
  } catch (err: unknown) {
    const httpStatus = getHttpStatus(err);
    return mutationFail(err, httpStatus);
  }
}

export async function approveSubmissionOnServer(submissionId: string): Promise<MutationResult> {
  try {
    const params: ApiSubmissionActionQuery = { submissionId };
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.PUT('/api/Submission/approve-submission', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
    return mutationOk();
  } catch (err: unknown) {
    const httpStatus = getHttpStatus(err);
    return mutationFail(err, httpStatus);
  }
}

export async function rejectSubmissionOnServer(submissionId: string): Promise<MutationResult> {
  try {
    const params: ApiSubmissionActionQuery = { submissionId };
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.PUT('/api/Submission/reject-submission', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
    return mutationOk();
  } catch (err: unknown) {
    const httpStatus = getHttpStatus(err);
    return mutationFail(err, httpStatus);
  }
}

/** OpenAPI AuditLogDto — POST /AuditLog (expert moderation trail, Phase 2). */
export type ExpertModerationAuditPayload = {
  userId: string;
  submissionId: string;
  action: 'expert_approve' | 'expert_reject';
  /** Serialized into newValuesJson */
  notesSummary: string;
};

export async function postExpertModerationAuditLog(
  params: ExpertModerationAuditPayload,
): Promise<boolean> {
  try {
    const newValuesJson = JSON.stringify({
      submissionId: params.submissionId,
      expertNotes: params.notesSummary,
      source: 'expert_moderation',
    });
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.POST('/api/AuditLog', {
          body: {
            userId: params.userId,
            entityType: 'Submission',
            entityId: params.submissionId,
            action: params.action,
            oldValuesJson: null,
            newValuesJson,
            createdAt: new Date().toISOString(),
          },
        }),
      ),
    );
    return true;
  } catch (err) {
    logServiceWarn('[expertModerationApi] Audit log POST failed', err);
    return false;
  }
}
