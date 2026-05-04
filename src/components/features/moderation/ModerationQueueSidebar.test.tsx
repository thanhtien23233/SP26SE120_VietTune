import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModerationQueueSidebar } from '@/components/features/moderation/ModerationQueueSidebar';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { buildQueueStatusMeta } from '@/features/moderation/utils/queueStatusMeta';
import { ModerationStatus } from '@/types';

const baseItems: LocalRecordingMini[] = [
  {
    id: 'rec-1',
    title: 'Bai 1',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    uploader: { id: 'u1', username: 'alpha' },
    moderation: { status: ModerationStatus.PENDING_REVIEW },
  },
  {
    id: 'rec-2',
    title: 'Bai 2',
    uploadedAt: '2026-01-02T00:00:00.000Z',
    uploader: { id: 'u2', username: 'beta' },
    moderation: { status: ModerationStatus.IN_REVIEW },
  },
];

describe('ModerationQueueSidebar', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it('triggers status filter change when clicking filter pills', () => {
    const onStatusFilterChange = vi.fn();

    render(
      <ModerationQueueSidebar
        queueStatusMeta={buildQueueStatusMeta(baseItems)}
        statusFilter="ALL"
        onStatusFilterChange={onStatusFilterChange}
        dateSort="newest"
        onDateSortChange={vi.fn()}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        items={baseItems}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Lọc hàng đợi: Đang được kiểm duyệt/i }));
    expect(onStatusFilterChange).toHaveBeenCalledWith(ModerationStatus.IN_REVIEW);
  });

  it('supports keyboard selection navigation in queue list', () => {
    const onSelect = vi.fn();

    render(
      <ModerationQueueSidebar
        queueStatusMeta={buildQueueStatusMeta(baseItems)}
        statusFilter="ALL"
        onStatusFilterChange={vi.fn()}
        dateSort="newest"
        onDateSortChange={vi.fn()}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        items={baseItems}
        selectedId="rec-1"
        onSelect={onSelect}
      />,
    );

    const selectedItem = screen
      .getAllByRole('button')
      .find((el) => el.getAttribute('aria-current') === 'true');
    expect(selectedItem).not.toBeNull();
    if (!selectedItem) return;
    fireEvent.keyDown(selectedItem, { key: 'ArrowDown' });

    expect(onSelect).toHaveBeenCalledWith('rec-2');
  });

  it('shows empty search result state when no items match', () => {
    render(
      <ModerationQueueSidebar
        queueStatusMeta={buildQueueStatusMeta([])}
        statusFilter="ALL"
        onStatusFilterChange={vi.fn()}
        dateSort="newest"
        onDateSortChange={vi.fn()}
        searchQuery="khong-ton-tai"
        onSearchQueryChange={vi.fn()}
        items={[]}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('status').textContent).toContain('Không có kết quả cho "khong-ton-tai".');
  });
});
