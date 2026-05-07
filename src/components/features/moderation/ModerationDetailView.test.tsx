import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/instrumentDetectionService', () => ({
  instrumentDetectionFlags: { confidenceEnabled: false, mockEnabled: false },
}));

vi.mock('@/services/expertModerationApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/expertModerationApi')>();
  return {
    ...actual,
    fetchRelatedSubmissions: vi.fn().mockResolvedValue([]),
  };
});

vi.mock('@/components/features/moderation/ModerationDetailMedia', () => ({
  ModerationDetailMedia: () => <div data-testid="moderation-detail-media-stub" />,
}));

import ModerationDetailView from '@/components/features/moderation/ModerationDetailView';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { ModerationStatus, UserRole } from '@/types';

afterEach(() => {
  cleanup();
});

function baseItem(): LocalRecordingMini {
  return {
    id: 'rec-moderation-detail-test',
    basicInfo: { title: 'Bài mẫu kiểm duyệt', artist: 'Nghệ sĩ' },
    audioUrl: 'https://example.com/sample-audio.mp3',
    mediaType: 'audio',
    uploadedAt: '2026-02-20T10:00:00.000Z',
    culturalContext: { ethnicity: 'Kinh', province: 'Hà Nội' },
    moderation: {
      status: ModerationStatus.IN_REVIEW,
      claimedBy: 'expert-self',
      verificationStep: 1,
      verificationData: {
        step1: { infoComplete: false, infoAccurate: false, formatCorrect: false },
      },
    },
  };
}

describe('ModerationDetailView', () => {
  it('renders hero, workspace tablist, and switches Embargo tab', () => {
    const onOpenWizard = vi.fn();

    render(
      <ModerationDetailView
        item={baseItem()}
        selectedItemFull={null}
        currentUserId="expert-self"
        userRole={UserRole.EXPERT}
        expertReviewNotesDraft=""
        onExpertReviewNotesChange={vi.fn()}
        onAssign={vi.fn()}
        onUnclaim={vi.fn()}
        onOpenWizard={onOpenWizard}
        onRequestDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Bài mẫu kiểm duyệt' })).toBeTruthy();
    const tablist = screen.getByRole('tablist', { name: /Không gian làm việc kiểm duyệt/i });
    expect(within(tablist).getByRole('tab', { name: 'Metadata' }).getAttribute('aria-selected')).toBe('true');

    const embargoTabs = within(tablist).getAllByRole('tab', { name: 'Embargo' });
    expect(embargoTabs).toHaveLength(1);

    fireEvent.click(embargoTabs[0]!);
    expect(embargoTabs[0]!.getAttribute('aria-selected')).toBe('true');
  });
});
