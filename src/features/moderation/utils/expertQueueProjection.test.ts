import { describe, expect, it } from 'vitest';

import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import {
  normalizeQueueStatus,
  projectModerationLists,
} from '@/features/moderation/utils/expertQueueProjection';
import { ModerationStatus } from '@/types';

function mini(
  id: string,
  partial: Partial<NonNullable<LocalRecordingMini['moderation']>> & {
    uploadedAt?: string;
  },
): LocalRecordingMini {
  const { uploadedAt, ...modRest } = partial;
  return {
    id,
    uploadedAt,
    moderation: {
      status: modRest.status,
      claimedBy: modRest.claimedBy,
      reviewerId: modRest.reviewerId,
      reviewedAt: modRest.reviewedAt,
    },
  };
}

describe('normalizeQueueStatus', () => {
  it('returns known ModerationStatus strings as-is', () => {
    expect(normalizeQueueStatus(ModerationStatus.PENDING_REVIEW)).toBe(
      ModerationStatus.PENDING_REVIEW,
    );
  });

  it('maps numeric API status via toModerationUiStatus', () => {
    expect(normalizeQueueStatus(2)).toBe(ModerationStatus.APPROVED);
  });
});

describe('projectModerationLists', () => {
  const userId = 'expert-1';

  it('keeps items claimed by user, unclaimed pending, or reviewed by user', () => {
    const rows: LocalRecordingMini[] = [
      mini('a', { status: ModerationStatus.IN_REVIEW, claimedBy: userId }),
      mini('b', { status: ModerationStatus.PENDING_REVIEW }),
      mini('c', { status: ModerationStatus.APPROVED, reviewerId: userId }),
      mini('d', { status: ModerationStatus.PENDING_REVIEW, claimedBy: 'other' }),
    ];
    const { expertItems } = projectModerationLists(rows, userId, 'ALL', 'newest');
    expect(expertItems.map((r) => r.id).sort()).toEqual(['a', 'b', 'c'].sort());
  });

  it('filters by statusFilter when not ALL', () => {
    const rows: LocalRecordingMini[] = [
      mini('a', { status: ModerationStatus.PENDING_REVIEW, claimedBy: userId }),
      mini('b', { status: ModerationStatus.APPROVED, claimedBy: userId }),
    ];
    const { visibleItems } = projectModerationLists(
      rows,
      userId,
      ModerationStatus.APPROVED,
      'newest',
    );
    expect(visibleItems.map((r) => r.id)).toEqual(['b']);
  });

  it('sorts by newest using uploadedAt', () => {
    const rows: LocalRecordingMini[] = [
      mini('old', {
        status: ModerationStatus.PENDING_REVIEW,
        claimedBy: userId,
        uploadedAt: '2020-01-01T00:00:00.000Z',
      }),
      mini('new', {
        status: ModerationStatus.PENDING_REVIEW,
        claimedBy: userId,
        uploadedAt: '2025-01-01T00:00:00.000Z',
      }),
    ];
    const { visibleItems } = projectModerationLists(rows, userId, 'ALL', 'newest');
    expect(visibleItems.map((r) => r.id)).toEqual(['new', 'old']);
  });

  it('sorts by oldest when dateSort is oldest', () => {
    const rows: LocalRecordingMini[] = [
      mini('old', {
        status: ModerationStatus.PENDING_REVIEW,
        claimedBy: userId,
        uploadedAt: '2020-01-01T00:00:00.000Z',
      }),
      mini('new', {
        status: ModerationStatus.PENDING_REVIEW,
        claimedBy: userId,
        uploadedAt: '2025-01-01T00:00:00.000Z',
      }),
    ];
    const { visibleItems } = projectModerationLists(rows, userId, 'ALL', 'oldest');
    expect(visibleItems.map((r) => r.id)).toEqual(['old', 'new']);
  });
});
