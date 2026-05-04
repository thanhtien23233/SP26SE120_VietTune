import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModerationModals } from '@/components/features/moderation/ModerationModals';

const noopProps = {
  onDismiss: vi.fn(),
  approveExpertNotes: '',
  onApproveExpertNotesChange: vi.fn(),
  rejectConfirmExpertNotes: '',
  onRejectConfirmExpertNotesChange: vi.fn(),
  rejectType: 'temporary' as const,
  deleteRecordingTitle: '',
  onConfirmApprove: vi.fn(),
  onConfirmReject: vi.fn(),
  onConfirmDelete: vi.fn(),
};

describe('ModerationModals — unclaim (Phase 5 expert-review-redesign)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows Phase 5 title and body copy', () => {
    render(
      <ModerationModals
        {...noopProps}
        modal={{ kind: 'unclaim', submissionId: 'sub-1' }}
        onConfirmUnclaim={vi.fn()}
      />,
    );

    const dialogs = screen.getAllByRole('dialog', { name: 'Xác nhận hủy nhận bài' });
    const dialog = dialogs[dialogs.length - 1]!;
    expect(within(dialog).getByRole('heading', { name: 'Xác nhận hủy nhận bài' })).toBeTruthy();
    expect(
      within(dialog).getByText(
        /Bạn có chắc muốn hủy nhận bài này\? Bản thu sẽ trở về hàng đợi PENDING_REVIEW để chuyên\s*gia khác có thể nhận\./,
      ),
    ).toBeTruthy();
  });

  it('Giữ nguyên dismisses without confirming unclaim', () => {
    const onDismiss = vi.fn();
    const onConfirmUnclaim = vi.fn();

    render(
      <ModerationModals
        {...noopProps}
        onDismiss={onDismiss}
        modal={{ kind: 'unclaim', submissionId: 'sub-1' }}
        onConfirmUnclaim={onConfirmUnclaim}
      />,
    );

    const dialogs = screen.getAllByRole('dialog', { name: 'Xác nhận hủy nhận bài' });
    const dialog = dialogs[dialogs.length - 1]!;
    fireEvent.click(within(dialog).getByRole('button', { name: /Giữ nguyên/ }));
    expect(onDismiss).toHaveBeenCalledWith({ kind: 'unclaim', submissionId: 'sub-1' });
    expect(onConfirmUnclaim).not.toHaveBeenCalled();
  });

  it('Hủy nhận bài calls onConfirmUnclaim', () => {
    const onConfirmUnclaim = vi.fn();

    render(
      <ModerationModals
        {...noopProps}
        modal={{ kind: 'unclaim', submissionId: 'sub-1' }}
        onConfirmUnclaim={onConfirmUnclaim}
      />,
    );

    const dialogs = screen.getAllByRole('dialog', { name: 'Xác nhận hủy nhận bài' });
    const dialog = dialogs[dialogs.length - 1]!;
    fireEvent.click(within(dialog).getByRole('button', { name: /^Hủy nhận bài$/ }));
    expect(onConfirmUnclaim).toHaveBeenCalledTimes(1);
  });
});
