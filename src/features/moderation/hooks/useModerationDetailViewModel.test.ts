import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useModerationDetailViewModel } from '@/features/moderation/hooks/useModerationDetailViewModel';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { ModerationStatus, UserRole } from '@/types';

vi.mock('@/services/instrumentDetectionService', () => ({
  instrumentDetectionFlags: { confidenceEnabled: true, mockEnabled: false },
}));

describe('useModerationDetailViewModel', () => {
  it('reports sparse metadata when header parts are insufficient', () => {
    const item: LocalRecordingMini = {
      id: 'sub-1',
      title: 'Song',
      culturalContext: {},
      basicInfo: {},
    };

    const { result } = renderHook(() =>
      useModerationDetailViewModel({
        item,
        selectedItemFull: null,
        userRole: UserRole.EXPERT,
        currentUserId: 'expert-1',
      }),
    );

    expect(result.current.metadataHealthOk).toBe(false);
    expect(result.current.metadataHealthLabel).toMatch(/Thiếu metadata/);
    expect(result.current.headerMetaLine).toBe('Chưa có metadata chính');
    expect(result.current.headerMetaParts.length).toBeLessThan(2);
  });

  it('enables similar-recordings tab when claimed by current user and id present', () => {
    const item: LocalRecordingMini = {
      id: 'sub-2',
      title: 'Song',
      uploadedAt: '2026-02-20T10:00:00.000Z',
      culturalContext: { ethnicity: 'Kinh', province: 'HN' },
      moderation: {
        status: ModerationStatus.IN_REVIEW,
        claimedBy: 'expert-1',
        verificationStep: 1,
      },
    };

    const { result } = renderHook(() =>
      useModerationDetailViewModel({
        item,
        selectedItemFull: null,
        userRole: UserRole.EXPERT,
        currentUserId: 'expert-1',
      }),
    );

    expect(result.current.claimedByCurrentUser).toBe(true);
    expect(result.current.showSimilarRecordings).toBe(true);
    expect(result.current.tabVisibility.similar).toBe(true);
    expect(result.current.tabVisibility.ai).toBe(true);
    expect(result.current.defaultTab).toBe('metadata');
  });

  it('hides AI tab when recording has no id', () => {
    const item: LocalRecordingMini = {
      title: 'Song',
      uploadedAt: '2026-02-20T10:00:00.000Z',
      culturalContext: { ethnicity: 'Kinh', province: 'HN' },
    };

    const { result } = renderHook(() =>
      useModerationDetailViewModel({
        item,
        selectedItemFull: null,
        userRole: UserRole.EXPERT,
        currentUserId: 'expert-1',
      }),
    );

    expect(result.current.aiViewAvailable).toBe(false);
    expect(result.current.tabVisibility.ai).toBe(false);
  });
});
