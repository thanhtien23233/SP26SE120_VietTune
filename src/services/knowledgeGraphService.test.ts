import { describe, expect, it } from 'vitest';

import { parseKnowledgeGraphApiResponse } from '@/services/knowledgeGraphService';

describe('parseKnowledgeGraphApiResponse', () => {
  it('accepts camelCase keys', () => {
    const g = parseKnowledgeGraphApiResponse({
      nodes: [{ id: '1', type: 'Recording', label: 'A' }],
      edges: [{ sourceId: '1', targetId: '2', relation: 'X' }],
      totalNodes: 9,
    });
    expect(g.nodes).toHaveLength(1);
    expect(g.edges).toHaveLength(1);
    expect(g.totalNodes).toBe(9);
  });

  it('accepts PascalCase keys', () => {
    const g = parseKnowledgeGraphApiResponse({
      Nodes: [{ Id: '1', Type: 'Instrument', Label: 'B' }],
      Edges: [{ SourceId: '1', TargetId: '2', Relation: 'R' }],
      TotalNodes: 3,
    });
    expect(g.nodes[0]?.id).toBe('1');
    expect(g.edges[0]?.relation).toBe('R');
    expect(g.totalNodes).toBe(3);
  });

  it('returns empty graph for invalid input', () => {
    expect(parseKnowledgeGraphApiResponse(null).nodes).toEqual([]);
    expect(parseKnowledgeGraphApiResponse('x').edges).toEqual([]);
  });
});
