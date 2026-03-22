import type { LocalRecording } from "@/types";
import { ModerationStatus } from "@/types";

/**
 * Maps backend SubmissionStatus (int) → UI enum. Confirm with API owner if values differ.
 * OpenAPI: SubmissionStatus 0–4 (integer).
 */
const SUBMISSION_STATUS_INT: Record<number, ModerationStatus> = {
  0: ModerationStatus.PENDING_REVIEW,
  1: ModerationStatus.PENDING_REVIEW,
  2: ModerationStatus.IN_REVIEW,
  3: ModerationStatus.APPROVED,
  4: ModerationStatus.REJECTED,
};

export function mapApiSubmissionStatusToModeration(raw: unknown): ModerationStatus | string {
  if (raw === null || raw === undefined) return ModerationStatus.PENDING_REVIEW;
  if (typeof raw === "string") {
    const v = raw.trim();
    if ((Object.values(ModerationStatus) as string[]).includes(v)) return v as ModerationStatus;
    return v;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const mapped = SUBMISSION_STATUS_INT[raw];
    return mapped ?? ModerationStatus.PENDING_REVIEW;
  }
  return ModerationStatus.PENDING_REVIEW;
}

/** Normalize list payloads from various VietTune API envelope shapes. */
export function extractSubmissionRows(res: unknown): Record<string, unknown>[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const r = res as Record<string, unknown>;
  if (Array.isArray(r.data)) return r.data as Record<string, unknown>[];
  const data = r.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.items)) return data.items as Record<string, unknown>[];
  if (Array.isArray(r.items)) return r.items as Record<string, unknown>[];
  return [];
}

/**
 * Map a submission object from GET /Submission/* or admin list to LocalRecording (meta).
 */
export function mapSubmissionToLocalRecording(x: Record<string, unknown>): LocalRecording {
  const id = String(x.id ?? "");
  const title = (x.title as string) || "Không có tiêu đề";
  const audioFileUrl = (x.audioFileUrl as string | undefined) ?? undefined;
  const videoFileUrl = (x.videoFileUrl as string | undefined) ?? undefined;
  const statusRaw = x.status;
  const moderationStatus = mapApiSubmissionStatusToModeration(statusRaw);
  const reviewerId =
    (x.reviewerId as string | undefined) ??
    (x.assignedReviewerId as string | undefined) ??
    (x.claimedBy as string | undefined);

  const claimedBy =
    moderationStatus === ModerationStatus.IN_REVIEW && reviewerId ? reviewerId : undefined;
  const decisionReviewerId =
    moderationStatus === ModerationStatus.APPROVED ||
    moderationStatus === ModerationStatus.REJECTED ||
    moderationStatus === ModerationStatus.TEMPORARILY_REJECTED
      ? reviewerId
      : undefined;

  return {
    id,
    title,
    mediaType: audioFileUrl ? "audio" : videoFileUrl ? "video" : undefined,
    audioUrl: audioFileUrl,
    videoData: videoFileUrl,
    moderation: {
      status: moderationStatus,
      ...(claimedBy ? { claimedBy } : {}),
      ...(decisionReviewerId ? { reviewerId: decisionReviewerId } : {}),
    },
    uploadedDate: (x.createdAt as string) || (x.submittedAt as string) || new Date().toISOString(),
    basicInfo: { title, artist: (x.performerName as string) || (x.submittedBy as string) },
    uploader: { id: (x.uploadedById as string) || (x.submittedBy as string) || "" },
  } as unknown as LocalRecording;
}
