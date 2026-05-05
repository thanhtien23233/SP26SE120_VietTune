import { describe, expect, it } from 'vitest';

import {
  getRecordingNeighborNodesInGraph,
  pickDefaultGraphNodeForTab,
  resolveKnowledgeGraphExploreNodeId,
} from '@/features/knowledge-graph/utils/researcherGraphUx';
import type { KnowledgeGraphData } from '@/types/graph';

describe('researcherGraphUx graph context', () => {
  const graph: KnowledgeGraphData = {
    nodes: [
      { id: 'hub', name: 'Hub', type: 'ethnic_group' },
      { id: 'leaf', name: 'Leaf', type: 'instrument' },
      { id: 'rec1', name: 'Rec A', type: 'recording' },
      { id: 'rec2', name: 'Rec B', type: 'recording' },
    ],
    links: [
      { source: 'hub', target: 'leaf', type: 'x' },
      { source: 'hub', target: 'rec1', type: 'x' },
      { source: 'hub', target: 'rec2', type: 'x' },
    ],
  };

  it('pickDefaultGraphNodeForTab prefers highest degree in tab', () => {
    const n = pickDefaultGraphNodeForTab(graph, 'overview');
    expect(n?.id).toBe('hub');
  });

  it('pickDefaultGraphNodeForTab respects tab filter', () => {
    expect(pickDefaultGraphNodeForTab(graph, 'instruments')?.id).toBe('leaf');
  });

  it('getRecordingNeighborNodesInGraph returns recording neighbors only', () => {
    const ns = getRecordingNeighborNodesInGraph(graph, 'hub', 5);
    expect(ns.map((x) => x.id).sort()).toEqual(['rec1', 'rec2']);
  });

  it('caps recording neighbors at 5', () => {
    const manyRecs: KnowledgeGraphData = {
      nodes: [
        { id: 'h', name: 'H', type: 'ceremony' },
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `r${i}`,
          name: `R${i}`,
          type: 'recording' as const,
        })),
      ],
      links: Array.from({ length: 8 }, (_, i) => ({ source: 'h', target: `r${i}`, type: 'x' })),
    };
    expect(getRecordingNeighborNodesInGraph(manyRecs, 'h', 5)).toHaveLength(5);
  });
});

describe('resolveKnowledgeGraphExploreNodeId', () => {
  it('returns backendId when the viewer id is synthetic', () => {
    expect(
      resolveKnowledgeGraphExploreNodeId({
        id: 'rec_abc',
        backendId: 'abc',
        name: 'R',
        type: 'recording',
      }),
    ).toBe('abc');
  });

  it('returns null when id is synthetic and there is no backendId', () => {
    expect(
      resolveKnowledgeGraphExploreNodeId({
        id: 'eth_tay',
        name: 'Tày',
        type: 'ethnic_group',
      }),
    ).toBeNull();
  });

  it('returns raw id for API-sourced nodes (no backendId)', () => {
    expect(
      resolveKnowledgeGraphExploreNodeId({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Node',
        type: 'instrument',
      }),
    ).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
