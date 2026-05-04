import type { components } from '@/api';

export type ApiSubmissionStatus =
  components['schemas']['VietTuneArchive.Domain.Entities.Enum.SubmissionStatus'];

/** FE-only status cho UI (không phải enum của BE). */
export enum ModerationStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  TEMPORARILY_REJECTED = 'TEMPORARILY_REJECTED',
  EMBARGOED = 'EMBARGOED',
}

export function toApiSubmissionStatus(raw: unknown): ApiSubmissionStatus | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw === 0 || raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5) return raw;
    return undefined;
  }
  if (typeof raw === 'string') {
    const v = raw.trim();
    if (!v) return undefined;
    if (/^\d+$/.test(v)) {
      const n = Number(v);
      if (n === 0 || n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
      return undefined;
    }
  }
  return undefined;
}

export function toModerationUiStatus(raw: unknown): ModerationStatus {
  if (typeof raw === 'string') {
    const v = raw.trim();
    if ((Object.values(ModerationStatus) as string[]).includes(v)) return v as ModerationStatus;
    const normalized = v.toLowerCase().replace(/[\s-]+/g, '_');
    if (normalized === 'in_review' || normalized === 'reviewing') return ModerationStatus.IN_REVIEW;
    if (normalized === 'pending' || normalized === 'pending_review') return ModerationStatus.PENDING_REVIEW;
    if (normalized === 'approved' || normalized === 'accept') return ModerationStatus.APPROVED;
    if (normalized === 'rejected' || normalized === 'reject' || normalized === 'permanently_rejected')
      return ModerationStatus.REJECTED;
    if (
      normalized === 'temporarily_rejected' ||
      normalized === 'temp_rejected' ||
      normalized === 'revision_required'
    ) {
      return ModerationStatus.TEMPORARILY_REJECTED;
    }
    if (normalized === 'embargoed') return ModerationStatus.EMBARGOED;
  }

  const status = toApiSubmissionStatus(raw);
  switch (status) {
    case 0:
    case 1:
      return ModerationStatus.PENDING_REVIEW;
    case 2:
      return ModerationStatus.APPROVED;
    case 3:
      return ModerationStatus.REJECTED;
    case 4:
      return ModerationStatus.TEMPORARILY_REJECTED;
    case 5:
      return ModerationStatus.EMBARGOED;
    default:
      return ModerationStatus.PENDING_REVIEW;
  }
}
