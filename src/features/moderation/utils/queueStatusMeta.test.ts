import { describe, expect, it } from 'vitest';

import { ModerationStage } from '@/features/moderation/constants/moderationStage';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { buildQueueStatusMeta, buildStageCountsFromItems } from '@/features/moderation/utils/queueStatusMeta';
import { ModerationStatus } from '@/types';

describe('queueStatusMeta', () => {
  it('buildStageCountsFromItems distributes by deriveModerationStage', () => {
    const rows: LocalRecordingMini[] = [
      { id: '1', moderation: { verificationStep: 1 } },
      { id: '2', moderation: { verificationStep: 2 } },
      { id: '3', moderation: { verificationStep: 3 } },
      { id: '4', moderation: { workflowStage: ModerationStage.VERIFICATION, verificationStep: 3 } },
    ];
    const c = buildStageCountsFromItems(rows);
    expect(c.all).toBe(4);
    expect(c.screening).toBe(1);
    expect(c.verification).toBe(2);
    expect(c.publication).toBe(1);
  });

  it('buildQueueStatusMeta uses visible subset for stageCounts when passed', () => {
    const allItems: LocalRecordingMini[] = [
      { id: 'a', moderation: { status: ModerationStatus.PENDING_REVIEW, verificationStep: 1 } },
      { id: 'b', moderation: { status: ModerationStatus.APPROVED, verificationStep: 3 } },
    ];
    const visible: LocalRecordingMini[] = [
      { id: 'a', moderation: { status: ModerationStatus.IN_REVIEW, verificationStep: 2 } },
    ];
    const meta = buildQueueStatusMeta(allItems, visible);
    expect(meta.counts[ModerationStatus.PENDING_REVIEW]).toBe(1);
    expect(meta.stageCounts.all).toBe(1);
    expect(meta.stageCounts.verification).toBe(1);
    expect(meta.stageCounts.screening).toBe(0);
  });
});
