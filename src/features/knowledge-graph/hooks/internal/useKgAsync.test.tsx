import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKgAsync } from '@/features/knowledge-graph/hooks/internal/useKgAsync';

describe('useKgAsync', () => {
  it('loads data and exposes refetch', async () => {
    const fetcher = vi.fn().mockImplementation(async () => 'ok');
    const { result } = renderHook(() => useKgAsync('a', fetcher, { enabled: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(1);

    fetcher.mockResolvedValueOnce('ok2');
    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toBe('ok2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not update state after unmount (stale guard)', async () => {
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 50)),
    );
    const { result, unmount } = renderHook(() => useKgAsync('stale', fetcher, { enabled: true }));
    expect(result.current.isLoading).toBe(true);
    unmount();
    await new Promise((r) => setTimeout(r, 80));
  });

  it('skips fetch when disabled', () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => useKgAsync('x', fetcher, { enabled: false }));
    expect(result.current.isIdle).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
