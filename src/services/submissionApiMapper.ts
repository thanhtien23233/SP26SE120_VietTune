import type { LocalRecording } from "@/types";
import { ModerationStatus } from "@/types";

export interface SubmissionLookupMaps {
  ethnicById?: Record<string, string>;
  ceremonyById?: Record<string, string>;
  instrumentById?: Record<string, string>;
  communeById?: Record<string, string>;
  districtById?: Record<string, string>;
  provinceById?: Record<string, string>;
  /** Normalized province UUID → “vùng/miền” label from `province.regionCode` (not tên phường/xã). */
  macroRegionByProvinceId?: Record<string, string>;
  /** Normalized district UUID → normalized province UUID */
  provinceIdByDistrictId?: Record<string, string>;
  /** Normalized commune UUID → normalized district UUID */
  districtIdByCommuneId?: Record<string, string>;
}

function normalizeId(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function pickMeaningfulText(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    const lowered = raw.toLowerCase();
    if (lowered === "không có tiêu đề" || lowered === "untitled") continue;
    if (raw.toUpperCase().startsWith("ID:")) continue;
    return raw;
  }
  return undefined;
}

/** Địa lý cấp tỉnh → nhãn vùng/miền; không dùng tên phường/xã/huyện cho “Vùng miền”. */
function macroRegionLabelFromGeo(
  lookups: SubmissionLookupMaps | undefined,
  provinceId: string | undefined,
  districtId: string | undefined,
  communeId: string | undefined,
): string | undefined {
  if (!lookups?.macroRegionByProvinceId) return undefined;
  const byProv = lookups.macroRegionByProvinceId;
  let pid = provinceId ? normalizeId(provinceId) : "";
  if (!pid && districtId && lookups.provinceIdByDistrictId) {
    pid = lookups.provinceIdByDistrictId[normalizeId(districtId)] ?? "";
  }
  if (!pid && communeId && lookups.districtIdByCommuneId && lookups.provinceIdByDistrictId) {
    const did = lookups.districtIdByCommuneId[normalizeId(communeId)] ?? "";
    if (did) pid = lookups.provinceIdByDistrictId[did] ?? "";
  }
  if (!pid) return undefined;
  const label = byProv[pid];
  return label?.trim() || undefined;
}

/**
 * Maps backend SubmissionStatus (int) → UI enum.
 * Align with `ContributionsPage` STATUS_LABELS / API: 0 nháp, 1 đang xử lý, 2 đã duyệt, 3 từ chối, 4 yêu cầu cập nhật.
 */
const SUBMISSION_STATUS_INT: Record<number, ModerationStatus> = {
  0: ModerationStatus.PENDING_REVIEW,
  1: ModerationStatus.IN_REVIEW,
  2: ModerationStatus.APPROVED,
  3: ModerationStatus.REJECTED,
  4: ModerationStatus.TEMPORARILY_REJECTED,
};

export function mapApiSubmissionStatusToModeration(raw: unknown): ModerationStatus | string {
  if (raw === null || raw === undefined) return ModerationStatus.PENDING_REVIEW;
  if (typeof raw === "string") {
    const v = raw.trim();
    if (/^\d+$/.test(v)) {
      const n = Number(v);
      const mapped = SUBMISSION_STATUS_INT[n];
      return mapped ?? ModerationStatus.PENDING_REVIEW;
    }
    const normalized = v.toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized === "pending" || normalized === "pending_review") {
      return ModerationStatus.PENDING_REVIEW;
    }
    if (normalized === "in_review" || normalized === "reviewing") {
      return ModerationStatus.IN_REVIEW;
    }
    if (normalized === "approved" || normalized === "accept") {
      return ModerationStatus.APPROVED;
    }
    if (
      normalized === "rejected" ||
      normalized === "reject" ||
      normalized === "permanently_rejected"
    ) {
      return ModerationStatus.REJECTED;
    }
    if (
      normalized === "temporarily_rejected" ||
      normalized === "temp_rejected" ||
      normalized === "revision_required"
    ) {
      return ModerationStatus.TEMPORARILY_REJECTED;
    }
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
  // PascalCase (.NET JSON without camelCase resolver)
  if (Array.isArray(r.Data)) return r.Data as Record<string, unknown>[];
  const dataP = r.Data as Record<string, unknown> | undefined;
  if (dataP && Array.isArray(dataP.Items)) return dataP.Items as Record<string, unknown>[];
  if (dataP && Array.isArray(dataP.items)) return dataP.items as Record<string, unknown>[];
  if (Array.isArray(r.Items)) return r.Items as Record<string, unknown>[];
  return [];
}

/**
 * Map a submission object from GET /Submission/* or admin list to LocalRecording (meta).
 */
export function mapSubmissionToLocalRecording(
  x: Record<string, unknown>,
  lookups?: SubmissionLookupMaps,
): LocalRecording {
  const rec = (x.recording && typeof x.recording === "object"
    ? (x.recording as Record<string, unknown>)
    : null);

  const submissionId = String(x.id ?? "");
  const recordingEntityId =
    rec?.id != null && String(rec.id).trim() ? String(rec.id).trim() : "";
  const id = recordingEntityId || submissionId;
  const recBasicInfo = (rec?.basicInfo && typeof rec.basicInfo === "object")
    ? (rec.basicInfo as Record<string, unknown>)
    : undefined;
  const xBasicInfo = (x.basicInfo && typeof x.basicInfo === "object")
    ? (x.basicInfo as Record<string, unknown>)
    : undefined;
  const title = pickMeaningfulText(
    rec?.title,
    rec?.Title,
    rec?.recordingTitle,
    rec?.recordingName,
    rec?.songName,
    rec?.name,
    recBasicInfo?.title,
    recBasicInfo?.Title,
    recBasicInfo?.recordingTitle,
    recBasicInfo?.recordingName,
    recBasicInfo?.songName,
    recBasicInfo?.name,
    x.title,
    x.Title,
    x.recordingTitle,
    x.recordingName,
    x.songName,
    x.name,
    x.submissionTitle,
    xBasicInfo?.title,
    xBasicInfo?.Title,
    xBasicInfo?.recordingTitle,
    xBasicInfo?.recordingName,
    xBasicInfo?.songName,
    xBasicInfo?.name,
  ) ?? "Không có tiêu đề";
  const audioFileUrl =
    (rec?.audioFileUrl as string | undefined) ??
    (x.audioFileUrl as string | undefined) ??
    undefined;
  const videoFileUrl =
    (rec?.videoFileUrl as string | undefined) ??
    (x.videoFileUrl as string | undefined) ??
    undefined;
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

  const instrumentIds =
    Array.isArray(rec?.instrumentIds) ? (rec?.instrumentIds as unknown[]) : [];
  const instrumentObjects = Array.isArray(rec?.instruments)
    ? (rec?.instruments as Array<Record<string, unknown>>)
    : [];
  const mappedInstrumentNames = instrumentIds
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .map((idVal) => lookups?.instrumentById?.[normalizeId(idVal)] || `ID:${idVal}`);
  const embeddedInstrumentNames = instrumentObjects
    .map((it) => String(it?.name ?? it?.nameVietnamese ?? "").trim())
    .filter(Boolean);
  const instrumentNames =
    mappedInstrumentNames.length > 0 ? mappedInstrumentNames : embeddedInstrumentNames;

  const communeId =
    (rec?.communeId as string | undefined) || (x.communeId as string | undefined);
  const districtId =
    (rec?.districtId as string | undefined) || (x.districtId as string | undefined);
  const provinceId =
    (rec?.provinceId as string | undefined) || (x.provinceId as string | undefined);

  const ethnicityFromApi =
    (x.ethnicityName as string | undefined) ||
    (rec?.ethnicityName as string | undefined) ||
    (rec?.ethnicGroupName as string | undefined) ||
    ((rec?.ethnicGroup as Record<string, unknown> | undefined)?.name as string | undefined) ||
    (rec?.ethnicGroupId
      ? lookups?.ethnicById?.[normalizeId(rec.ethnicGroupId)] ||
        `ID:${String(rec.ethnicGroupId)}`
      : undefined);

  const eventTypeFromApi =
    (x.ceremonyName as string | undefined) ||
    (rec?.ceremonyName as string | undefined) ||
    ((rec?.ceremony as Record<string, unknown> | undefined)?.name as string | undefined) ||
    (rec?.ceremonyId
      ? lookups?.ceremonyById?.[normalizeId(rec.ceremonyId)] ||
        `ID:${String(rec.ceremonyId)}`
      : undefined);

  const explicitRegion =
    (typeof rec?.region === "string" && rec.region.trim() ? rec.region.trim() : undefined) ||
    (typeof x.region === "string" && x.region.trim() ? x.region.trim() : undefined);
  const regionMacroLabel =
    macroRegionLabelFromGeo(lookups, provinceId, districtId, communeId) || explicitRegion || undefined;

  return {
    id,
    ...(submissionId ? { submissionId } : {}),
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
    basicInfo: {
      title,
      artist:
        (rec?.performerName as string | undefined) ||
        (x.performerName as string | undefined) ||
        (x.submittedBy as string | undefined),
    },
    uploader: {
      id:
        (rec?.uploadedById as string | undefined) ||
        (x.uploadedById as string | undefined) ||
        (x.contributorId as string | undefined) ||
        "",
      username: (x.submittedBy as string | undefined) || undefined,
    },
    culturalContext: {
      ethnicity: ethnicityFromApi,
      region: regionMacroLabel,
      province:
        (communeId ? lookups?.communeById?.[normalizeId(communeId)] : undefined) ||
        (rec?.communeName as string | undefined) ||
        (rec?.recordingLocation as string | undefined) ||
        undefined,
      eventType: eventTypeFromApi,
      instruments: instrumentNames,
      performanceType: (rec?.performanceContext as string | undefined) || undefined,
    },
    ...((typeof rec?.durationSeconds === "number" && Number.isFinite(rec.durationSeconds))
      ? { duration: Math.floor(rec.durationSeconds as number) }
      : {}),
    ...((rec?.description && String(rec.description).trim())
      ? { description: String(rec.description).trim() }
      : {}),
    ...((rec?.recordingDate && String(rec.recordingDate).trim())
      ? { recordedDate: String(rec.recordingDate).trim() }
      : {}),
  } as unknown as LocalRecording;
}
