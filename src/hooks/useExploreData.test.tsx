import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useExploreData } from '@/hooks/useExploreData';
import type { Recording } from '@/types';

const loadExploreRecordings = vi.fn();
const isExploreRequestAborted = vi.fn();

vi.mock('@/features/explore/utils/exploreRecordingsLoad', () => ({
  loadExploreRecordings: (...args: unknown[]) => loadExploreRecordings(...args),
  isExploreRequestAborted: (...args: unknown[]) => isExploreRequestAborted(...args),
}));

const baseParams = {
  currentPage: 1,
  exploreMode: 'keyword' as const,
  filters: {},
  sqFromUrl: '',
  isAuthenticated: true,
};

describe('useExploreData', () => {
  it('sets recordings and totalResults when load succeeds', async () => {
    const rec = { id: 'r1', uploadedDate: '2026-01-01T00:00:00.000Z' } as Recording;
    loadExploreRecordings.mockResolvedValue({
      recordings: [rec],
      totalResults: 3,
      dataSource: 'recordingApi',
    });
    isExploreRequestAborted.mockReturnValue(false);

    const { result } = renderHook(() => useExploreData(baseParams));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recordings).toEqual([rec]);
    expect(result.current.totalResults).toBe(3);
    expect(result.current.searchError).toBeNull();
    expect(loadExploreRecordings).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 1,
        exploreMode: 'keyword',
        isAuthenticated: true,
      }),
    );
  });

  it('sets friendly error when load throws and not aborted', async () => {
    loadExploreRecordings.mockRejectedValue(new Error('network'));
    isExploreRequestAborted.mockReturnValue(false);

    const { result } = renderHook(() => useExploreData(baseParams));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recordings).toEqual([]);
    expect(result.current.totalResults).toBe(0);
    expect(result.current.searchError).toBe('Không tải được dữ liệu. Bạn có thể thử lại sau.');
  });

  it('does not set error when request was aborted', async () => {
    loadExploreRecordings.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    isExploreRequestAborted.mockReturnValue(true);

    const { result } = renderHook(() => useExploreData(baseParams));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.searchError).toBeNull();
  });
});
