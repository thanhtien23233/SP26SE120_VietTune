import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useKnowledgeGraphExplore } from '@/features/knowledge-graph/hooks/useKnowledgeGraphExplore';
import { useKnowledgeGraphOverview } from '@/features/knowledge-graph/hooks/useKnowledgeGraphOverview';
import { useKnowledgeGraphSearch } from '@/features/knowledge-graph/hooks/useKnowledgeGraphSearch';
import { useKnowledgeGraphStats } from '@/features/knowledge-graph/hooks/useKnowledgeGraphStats';
import { knowledgeGraphService } from '@/services/knowledgeGraphService';

vi.mock('@/services/knowledgeGraphService', () => ({
  knowledgeGraphService: {
    getOverview: vi.fn(),
    exploreNode: vi.fn(),
    searchNodes: vi.fn(),
    getStats: vi.fn(),
  },
}));

describe('useKnowledgeGraphOverview', () => {
  beforeEach(() => {
    vi.mocked(knowledgeGraphService.getOverview).mockReset();
  });

  it('maps overview through adapter on success', async () => {
    vi.mocked(knowledgeGraphService.getOverview).mockResolvedValue({
      nodes: [{ id: 'r1', type: 'Recording', label: 'Bản thu 1' }],
      edges: [],
      totalNodes: 1,
    });
    const { result } = renderHook(() => useKnowledgeGraphOverview({ maxNodes: 40, enabled: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(knowledgeGraphService.getOverview).toHaveBeenCalledWith(
      expect.objectContaining({ maxNodes: 40, signal: expect.any(AbortSignal) }),
    );
    expect(result.current.data?.graph.nodes[0]?.id).toBe('r1');
    expect(result.current.data?.raw.totalNodes).toBe(1);
  });
});

describe('useKnowledgeGraphExplore', () => {
  beforeEach(() => {
    vi.mocked(knowledgeGraphService.exploreNode).mockReset();
  });

  it('does not call API when nodeId is empty', () => {
    const { result } = renderHook(() =>
      useKnowledgeGraphExplore({ nodeId: '  ', nodeType: 'Instrument', enabled: true }),
    );
    expect(result.current.isIdle).toBe(true);
    expect(knowledgeGraphService.exploreNode).not.toHaveBeenCalled();
  });

  it('refetches explore when nodeId changes', async () => {
    vi.mocked(knowledgeGraphService.exploreNode).mockImplementation(async (body) => ({
      nodes: [{ id: body.nodeId, type: 'Recording', label: 'L' }],
      edges: [],
      totalNodes: 1,
    }));

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) =>
        useKnowledgeGraphExplore({ nodeId: id, nodeType: 'Recording', enabled: true }),
      { initialProps: { id: '1' } },
    );

    await waitFor(() => expect(result.current.data?.graph.nodes[0]?.id).toBe('1'));
    rerender({ id: '2' });
    await waitFor(() => expect(result.current.data?.graph.nodes[0]?.id).toBe('2'));
    expect(knowledgeGraphService.exploreNode).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: '2', nodeType: 'Recording' }),
      expect.any(AbortSignal),
    );
  });
});

describe('useKnowledgeGraphSearch', () => {
  beforeEach(() => {
    vi.mocked(knowledgeGraphService.searchNodes).mockReset();
  });

  it('is idle when query too short', () => {
    const { result } = renderHook(() =>
      useKnowledgeGraphSearch({ query: '', enabled: true, minQueryLength: 1 }),
    );
    expect(result.current.isIdle).toBe(true);
    expect(knowledgeGraphService.searchNodes).not.toHaveBeenCalled();
  });

  it('loads search results', async () => {
    vi.mocked(knowledgeGraphService.searchNodes).mockResolvedValue([
      { id: 'n1', type: 'Instrument', label: 'Tranh' },
    ]);
    const { result } = renderHook(() =>
      useKnowledgeGraphSearch({ query: 'tranh', limit: 5, enabled: true }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.label).toBe('Tranh');
  });
});

describe('useKnowledgeGraphStats', () => {
  beforeEach(() => {
    vi.mocked(knowledgeGraphService.getStats).mockReset();
  });

  it('loads stats', async () => {
    vi.mocked(knowledgeGraphService.getStats).mockResolvedValue({
      totalEthnicGroups: 2,
      totalInstruments: 3,
      totalCeremonies: 0,
      totalRecordings: 10,
      totalVocalStyles: 0,
      totalMusicalScales: 0,
      totalTags: 0,
      totalProvinces: 0,
      totalEdges: 5,
    });
    const { result } = renderHook(() => useKnowledgeGraphStats({ enabled: true, cacheTtlMs: 0 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalRecordings).toBe(10);
  });
});
