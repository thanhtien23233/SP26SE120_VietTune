import { describe, expect, it } from 'vitest';

import {
  knowledgeGraphApiToViewerData,
  mapKnowledgeGraphApiNodeToGraphNode,
  toRemoteGraphPayload,
} from '@/features/knowledge-graph/utils/knowledgeGraphApiAdapter';

describe('knowledgeGraphApiAdapter', () => {
  it('maps API node types and preserves apiEntityType', () => {
    const n = mapKnowledgeGraphApiNodeToGraphNode({
      id: 'g1',
      type: 'EthnicGroup',
      label: 'Tày',
      properties: { imageUrl: 'https://x/img.png' },
    });
    expect(n.type).toBe('ethnic_group');
    expect(n.apiEntityType).toBe('EthnicGroup');
    expect(n.backendId).toBe('g1');
    expect(n.imgUrl).toBe('https://x/img.png');
  });

  it('converts graph response to viewer links with string endpoints', () => {
    const data = knowledgeGraphApiToViewerData({
      nodes: [
        { id: 'a', type: 'Recording', label: 'R1' },
        { id: 'b', type: 'Instrument', label: 'Tranh' },
      ],
      edges: [{ sourceId: 'a', targetId: 'b', relation: 'USES_INSTRUMENT' }],
      totalNodes: 2,
    });
    expect(data.links).toHaveLength(1);
    expect(data.links[0]).toEqual({
      source: 'a',
      target: 'b',
      type: 'USES_INSTRUMENT',
      value: 1,
    });
  });

  it('maps edge weight from properties onto link value', () => {
    const data = knowledgeGraphApiToViewerData({
      nodes: [{ id: 'a', type: 'Recording', label: 'R1' }],
      edges: [
        { sourceId: 'a', targetId: 'b', relation: 'X', properties: { weight: 2.5 } },
        { sourceId: 'a', targetId: 'c', relation: 'Y', properties: { weight: 'not-a-number' } },
        { sourceId: 'a', targetId: 'd', relation: 'Z', properties: { Weight: 4 } },
      ],
    });
    expect(data.links[0]?.value).toBe(2.5);
    expect(data.links[1]?.value).toBe(1);
    expect(data.links[2]?.value).toBe(4);
  });

  it('toRemoteGraphPayload returns graph + raw', () => {
    const api = {
      nodes: [{ id: '1', type: 'Tag', label: 'folk' }],
      edges: [],
    };
    const { graph, raw } = toRemoteGraphPayload(api);
    expect(graph.nodes[0]?.type).toBe('tag');
    expect(raw.nodes).toHaveLength(1);
  });
});
