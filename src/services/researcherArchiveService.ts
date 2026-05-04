import { apiFetch, apiOk, asApiEnvelope } from '@/api';
import type { ApiSubmissionGetByStatusQuery } from '@/api';
import { buildSubmissionLookupMaps } from '@/services/expertModerationApi';
import {
  extractSubmissionRows,
  mapSubmissionToLocalRecording,
} from '@/services/submissionApiMapper';
import type { LocalRecording, Recording } from '@/types';
import { convertLocalToRecording } from '@/utils/localRecordingToRecording';

/**
 * Integer for GET /Submission/get-by-status = “đã duyệt” (same as Contributions tab Đã duyệt).
 * Backend uses **2** = approved; **3** = rejected.
 * Override with `VITE_RESEARCHER_VERIFIED_SUBMISSION_STATUS` if needed.
 */
const DEFAULT_VERIFIED = 2;

type SubmissionStatusListApiResponse =
  | Record<string, unknown>[]
  | {
      data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      Data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      items?: Record<string, unknown>[];
      Items?: Record<string, unknown>[];
    };

function verifiedStatusCodes(): number[] {
  const raw =
    import.meta.env.VITE_RESEARCHER_VERIFIED_SUBMISSION_STATUS ?? String(DEFAULT_VERIFIED);
  return raw
    .split(',')
    .map((s: string) => parseInt(s.trim(), 10))
    .filter((n: number) => !Number.isNaN(n));
}

/**
 * Approved/verified submission rows → `Recording` for researcher UI (IDs resolved to display names).
 */
export async function fetchVerifiedSubmissionsAsRecordings(opts?: {
  signal?: AbortSignal;
}): Promise<Recording[]> {
  const statuses = verifiedStatusCodes();
  const signal = opts?.signal;
  const lookupPromise = buildSubmissionLookupMaps();
  const submissionPromises = statuses.map((status) =>
    apiOk(
      asApiEnvelope<SubmissionStatusListApiResponse>(
        apiFetch.GET('/api/Submission/get-by-status', {
          params: {
            query: { status, page: 1, pageSize: 500 } as ApiSubmissionGetByStatusQuery,
          },
          signal,
        }),
      ),
    ),
  );
  const [lookups, ...responses] = await Promise.all([lookupPromise, ...submissionPromises]);

  const merged: LocalRecording[] = [];
  for (const res of responses) {
    const rows = extractSubmissionRows(res);
    for (const row of rows) {
      merged.push(mapSubmissionToLocalRecording(row, lookups));
    }
  }

  const byId = new Map<string, (typeof merged)[0]>();
  for (const local of merged) {
    if (local.id) byId.set(local.id, local);
  }

  return Promise.all([...byId.values()].map((l) => convertLocalToRecording(l)));
}
