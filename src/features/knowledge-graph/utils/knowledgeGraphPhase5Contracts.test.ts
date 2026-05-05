import { describe, expect, it } from 'vitest';

import { mapKnowledgeGraphApiNodeToGraphNode } from '@/features/knowledge-graph/utils/knowledgeGraphApiAdapter';
import { resolveKnowledgeGraphExploreNodeId } from '@/features/knowledge-graph/utils/researcherGraphUx';
import type { GraphNode } from '@/types/graph';

/**
 * Same resolution as `ResearcherPortalGraphTab` “Bản thu liên quan” graph neighbors (audit B4).
 */
function findApprovedRecordingForGraphNeighbor(
  gn: Pick<GraphNode, 'id' | 'backendId'>,
  approvedRecordings: { id: string }[],
): { id: string } | undefined {
  const lookupId = gn.backendId ?? gn.id;
  return approvedRecordings.find(
    (r) => r.id === lookupId || r.id === gn.id || `rec_${r.id}` === gn.id,
  );
}

/** Phase 5 — ID / explore contracts (B1, B2, B4) */
describe('knowledgeGraph Phase 5 contracts', () => {
  it('API-mapped nodes use raw id as explore target (B1)', () => {
    const n = mapKnowledgeGraphApiNodeToGraphNode({
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Instrument',
      label: 'Tranh',
    });
    expect(resolveKnowledgeGraphExploreNodeId(n)).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('fallback recording graph id resolves explore to recording backendId (B1, B2)', () => {
    const gn: GraphNode = {
      id: 'rec_real-guid',
      backendId: 'real-guid',
      name: 'Title',
      type: 'recording',
      apiEntityType: 'Recording',
    };
    expect(resolveKnowledgeGraphExploreNodeId(gn)).toBe('real-guid');
  });

  it('synthetic ethnic node without backendId does not resolve for explore (B1)', () => {
    const gn: GraphNode = {
      id: 'eth_tay',
      name: 'Tày',
      type: 'ethnic_group',
    };
    expect(resolveKnowledgeGraphExploreNodeId(gn)).toBeNull();
  });

  it('neighbor recording lookup matches backendId and rec_ graph id (B4)', () => {
    const approved = [{ id: 'abc-123' }, { id: 'other' }];
    expect(
      findApprovedRecordingForGraphNeighbor(
        { id: 'rec_abc-123', backendId: 'abc-123' },
        approved,
      )?.id,
    ).toBe('abc-123');
    expect(findApprovedRecordingForGraphNeighbor({ id: 'rec_abc-123' }, approved)?.id).toBe('abc-123');
    expect(findApprovedRecordingForGraphNeighbor({ id: 'rec_unknown' }, approved)).toBeUndefined();
  });
});
