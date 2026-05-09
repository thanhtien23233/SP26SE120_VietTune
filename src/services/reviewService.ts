import { apiFetch, apiOk, asApiEnvelope } from '@/api';

export type ContributorSubmissionReview = {
  comments: string | null;
  decision: number | undefined;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'string') return v;
  }
  return null;
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v == null || v === '') continue;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

/** Normalize GET /api/Review/get-by-submissionid response (envelope and/or PascalCase). */
export function normalizeContributorReviewPayload(raw: unknown): ContributorSubmissionReview | null {
  const root = asRecord(raw);
  if (!root) return null;

  if ('isSuccess' in root && root.isSuccess === false) return null;

  let rec: Record<string, unknown> | null = root;
  if ('data' in root) {
    if (root.data === null || root.data === undefined) return null;
    const inner = asRecord(root.data);
    if (inner) rec = inner;
  }

  if (!rec) return null;

  const rawComments = pickStr(rec, ['comments', 'Comments']);
  const trimmed = rawComments?.trim() ? rawComments.trim() : null;
  const decision = pickNum(rec, ['decision', 'Decision']);

  if (decision === undefined && !trimmed) return null;

  return { comments: trimmed, decision };
}

/**
 * Loads moderation review for a submission (reject / request-update + comments).
 * Returns null on network error, empty payload, or missing review — does not throw.
 */
export async function getReviewBySubmissionId(submissionId: string): Promise<ContributorSubmissionReview | null> {
  const id = String(submissionId ?? '').trim();
  if (!id) return null;
  try {
    const raw = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/Review/get-by-submissionid/{submissionId}', {
          params: { path: { submissionId: id } },
        }),
      ),
    );
    return normalizeContributorReviewPayload(raw);
  } catch {
    return null;
  }
}
