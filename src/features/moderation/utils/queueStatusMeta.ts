import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { normalizeQueueStatus } from '@/features/moderation/utils/expertQueueProjection';
import { ModerationStatus } from '@/types';

export type ModerationQueueStatusItem = { key: string; label: string; count: number };
export type ModerationQueueStatusGroup = { title: string; items: ModerationQueueStatusItem[] };
export type ModerationQueueStatusMeta = {
  counts: Record<string, number>;
  groups: ModerationQueueStatusGroup[];
};

export function buildQueueStatusMeta(allItems: LocalRecordingMini[]): ModerationQueueStatusMeta {
  const counts = allItems.reduce<Record<string, number>>((acc, item) => {
    const key = String(normalizeQueueStatus(item.moderation?.status));
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    counts,
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
