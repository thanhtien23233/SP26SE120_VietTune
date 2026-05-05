import { describe, expect, it } from 'vitest';

import {
  buildGraphDataSafe,
  HIGH_DEGREE_THRESHOLD,
  pickFocusDefaultNode,
  showHighImportanceLabel,
  truncateLabel,
} from '@/features/knowledge-graph/utils/graphViewerHelpers';
import { tabMatchesViewerType } from '@/features/knowledge-graph/utils/researcherGraphUx';
import type { GraphNode } from '@/types/graph';
import type { KnowledgeGraphData } from '@/types/graph';

describe('graphViewerHelpers', () => {
  it('truncateLabel respects max length', () => {
    expect(truncateLabel('abc', 10)).toBe('abc');
    expect(truncateLabel('abcdefghijklmnop', 10)).toBe('abcdefghi…');
  });

  it('buildGraphDataSafe dedupes nodes and caps count', () => {
    const data: KnowledgeGraphData = {
      nodes: [
        { id: 'a', name: 'A', type: 'recording' },
        { id: 'a', name: 'Dup', type: 'recording' },
        { id: 'b', name: 'B', type: 'instrument' },
        { id: 'c', name: 'C', type: 'ceremony' },
      ],
      links: [
        { source: 'a', target: 'b', type: 'x' },
        { source: 'b', target: 'a', type: 'x' },
      ],
    };
    const capped = buildGraphDataSafe(data, 2);
    expect(capped.nodes).toHaveLength(2);
    expect(capped.links).toHaveLength(1);
  });
});

/** Phase 5 audit — graph sanitization & hub labels */
describe('buildGraphDataSafe (Phase 5 verification)', () => {
  it('handles empty graph without throwing', () => {
    const empty: KnowledgeGraphData = { nodes: [], links: [] };
    const out = buildGraphDataSafe(empty, 100);
    expect(out.nodes).toHaveLength(0);
    expect(out.links).toHaveLength(0);
  });

  it('preserves a single-node graph (no orphan self-loop required)', () => {
    const single: KnowledgeGraphData = {
      nodes: [{ id: 'solo', name: 'Only', type: 'recording' }],
      links: [],
    };
    const out = buildGraphDataSafe(single, 100);
    expect(out.nodes).toHaveLength(1);
    expect(out.nodes[0]?.id).toBe('solo');
  });

  it('keeps the first node instance when duplicate ids appear (dedupe)', () => {
    const data: KnowledgeGraphData = {
      nodes: [
        { id: 'same', name: 'First', type: 'recording' },
        { id: 'same', name: 'Second', type: 'recording' },
      ],
      links: [],
    };
    const out = buildGraphDataSafe(data, 100);
    expect(out.nodes).toHaveLength(1);
    expect(out.nodes[0]?.name).toBe('First');
  });

  it('drops edges whose endpoints are missing after dedupe / cap', () => {
    const data: KnowledgeGraphData = {
      nodes: [
        { id: 'only', name: 'Solo', type: 'recording', val: 50 },
        { id: 'ghost', name: 'Gone', type: 'instrument', val: 1 },
      ],
      links: [
        { source: 'only', target: 'missing', type: 'orphan' },
        { source: 'only', target: 'ghost', type: 'ok' },
      ],
    };
    const out = buildGraphDataSafe(data, 1);
    expect(out.nodes).toHaveLength(1);
    expect(out.nodes[0]?.id).toBe('only');
    expect(out.links).toHaveLength(0);
  });
});

describe('pickFocusDefaultNode & tab filter (Phase 5)', () => {
  const mixed: KnowledgeGraphData = {
    nodes: [
      { id: 'i1', name: 'Inst', type: 'instrument', val: 2 },
      { id: 'r1', name: 'Rec', type: 'recording', val: 9 },
      { id: 'e1', name: 'Eth', type: 'ethnic_group', val: 1 },
    ],
    links: [{ source: 'r1', target: 'i1', type: 'x' }],
  };

  it('pickFocusDefaultNode respects instruments tab filter', () => {
    const n = pickFocusDefaultNode(mixed, (node: GraphNode) => tabMatchesViewerType('instruments', node.type));
    expect(n?.type).toBe('instrument');
    expect(n?.id).toBe('i1');
  });

  it('tabMatchesViewerType excludes recordings on instruments tab (C4)', () => {
    expect(tabMatchesViewerType('instruments', 'instrument')).toBe(true);
    expect(tabMatchesViewerType('instruments', 'recording')).toBe(false);
  });
});

describe('showHighImportanceLabel (Phase 5 / audit 4.3)', () => {
  it(`uses degree >= ${HIGH_DEGREE_THRESHOLD} as hub threshold`, () => {
    const node: GraphNode = { id: 'n', name: 'N', type: 'instrument', val: 1 };
    expect(showHighImportanceLabel(node, HIGH_DEGREE_THRESHOLD - 1)).toBe(false);
    expect(showHighImportanceLabel(node, HIGH_DEGREE_THRESHOLD)).toBe(true);
  });
});
