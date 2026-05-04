import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { isLockedToAnotherExpert } from '@/features/moderation/utils/expertSubmissionLock';
import { ModerationStatus } from '@/types';
import { toModerationUiStatus } from '@/types/moderation';

export function normalizeQueueStatus(
  status?: unknown,
): ModerationStatus | string {
  if (typeof status === 'string') {
    const v = status.trim();
    if ((Object.values(ModerationStatus) as string[]).includes(v)) return v as ModerationStatus;
  }
  return toModerationUiStatus(status);
}

/** Same expert + filter + sort rules as queue `load()` — for optimistic list updates without refetch. */
export function projectModerationLists(
  migrated: LocalRecordingMini[],
  userId: string | undefined,
  statusFilter: string,
  dateSort: 'newest' | 'oldest',
): { expertItems: LocalRecordingMini[]; visibleItems: LocalRecordingMini[] } {
  const expertItems = migrated.filter((r) => {
    if (isLockedToAnotherExpert(r.moderation, userId)) return false;
    const status = normalizeQueueStatus(r.moderation?.status);
    if (r.moderation?.claimedBy === userId) return true;
    if (!r.moderation?.claimedBy && status === ModerationStatus.PENDING_REVIEW) return true;
    if (r.moderation?.reviewerId === userId) return true;
    return false;
  });
  let filtered = expertItems;
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter((r) => normalizeQueueStatus(r.moderation?.status) === statusFilter);
  }
  filtered = [...filtered].sort((a, b) => {
    const aDate =
      (a as LocalRecordingMini & { uploadedDate?: string }).uploadedDate ||
      a.uploadedAt ||
      a.moderation?.reviewedAt ||
      '';
    const bDate =
      (b as LocalRecordingMini & { uploadedDate?: string }).uploadedDate ||
      b.uploadedAt ||
      b.moderation?.reviewedAt ||
      '';
    const dateA = new Date(aDate || 0).getTime();
    const dateB = new Date(bDate || 0).getTime();
    return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
  });
  return { expertItems, visibleItems: filtered };
}
