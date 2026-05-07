import {
  ModerationStage,
  deriveModerationStage,
} from '@/features/moderation/constants/moderationStage';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { normalizeQueueStatus } from '@/features/moderation/utils/expertQueueProjection';
import { ModerationStatus } from '@/types';

export type ModerationQueueStatusItem = { key: string; label: string; count: number };
export type ModerationQueueStatusGroup = { title: string; items: ModerationQueueStatusItem[] };

/** Review 3 filter key: all items, or single workflow stage. */
export type ModerationStageFilterKey = 'ALL' | ModerationStage;

export type ModerationQueueStageCounts = {
  all: number;
  screening: number;
  verification: number;
  publication: number;
};

export type ModerationQueueStatusMeta = {
  counts: Record<string, number>;
  groups: ModerationQueueStatusGroup[];
  /** distribution of expert stages for the rows that match the active status/date filter (`visibleItems` in useExpertQueue). */
  stageCounts: ModerationQueueStageCounts;
};

export function buildStageCountsFromItems(items: LocalRecordingMini[]): ModerationQueueStageCounts {
  const out: ModerationQueueStageCounts = {
    all: items.length,
    screening: 0,
    verification: 0,
    publication: 0,
  };
  for (const it of items) {
    const stage = deriveModerationStage(it.moderation?.verificationStep, it.moderation?.workflowStage);
    if (stage === ModerationStage.SCREENING) out.screening += 1;
    else if (stage === ModerationStage.VERIFICATION) out.verification += 1;
    else out.publication += 1;
  }
  return out;
}

/**
 * @param allItems full queue (for status totals)
 * @param visibleForStageCounts subset matching current status + date sort (for stage pills)
 */
export function buildQueueStatusMeta(
  allItems: LocalRecordingMini[],
  visibleForStageCounts?: LocalRecordingMini[],
): ModerationQueueStatusMeta {
  const counts = allItems.reduce<Record<string, number>>((acc, item) => {
    const key = String(normalizeQueueStatus(item.moderation?.status));
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const stageCounts = buildStageCountsFromItems(visibleForStageCounts ?? allItems);

  return {
    counts,
    stageCounts,
    groups: [
      {
        title: 'Đang xử lý',
        items: [
          { key: 'ALL', label: 'Tất cả', count: allItems.length },
          {
            key: ModerationStatus.PENDING_REVIEW,
            label: 'Chờ được kiểm duyệt',
            count: counts[ModerationStatus.PENDING_REVIEW] ?? 0,
          },
          {
            key: ModerationStatus.IN_REVIEW,
            label: 'Đang được kiểm duyệt',
            count: counts[ModerationStatus.IN_REVIEW] ?? 0,
          },
        ],
      },
      {
        title: 'Đã xử lý',
        items: [
          {
            key: ModerationStatus.APPROVED,
            label: 'Đã được kiểm duyệt',
            count: counts[ModerationStatus.APPROVED] ?? 0,
          },
          {
            key: ModerationStatus.REJECTED,
            label: 'Đã bị từ chối vĩnh viễn',
            count: counts[ModerationStatus.REJECTED] ?? 0,
          },
          {
            key: ModerationStatus.TEMPORARILY_REJECTED,
            label: 'Đã bị từ chối tạm thời',
            count: counts[ModerationStatus.TEMPORARILY_REJECTED] ?? 0,
          },
        ],
      },
    ],
  };
}
