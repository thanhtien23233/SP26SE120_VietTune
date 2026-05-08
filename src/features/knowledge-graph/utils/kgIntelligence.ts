/**
 * Phase 4 — Knowledge Graph Intelligence selector.
 *
 * Computes researcher-facing insights over the displayed graph:
 *   • metadata gaps (recordings missing important relations)
 *   • isolated entities (low-degree nodes)
 *   • cross-region or cross-ethnicity bridges (multi-cultural connectors)
 *   • global hubs (highest-degree nodes)
 *
 * Pure, memoizable; do not import React here.
 */
import type { GraphLink, GraphNode, KnowledgeGraphData } from '@/types/graph';

/** Minimal `GraphLink` reference to keep the type imported (used by helper signatures below). */
export type KgLink = GraphLink;

export type SemanticMode = 'free' | 'ethnicity' | 'region' | 'ceremony' | 'hub';

export interface IntelligenceObservation {
  /** Stable id for React key + selector pinning. */
  id: string;
  kind: 'gap' | 'isolated' | 'cross-region' | 'hub';
  /** Viewer node id (`${Type}:${guid}`) the observation refers to. */
  nodeId: string;
  label: string;
  /** Short Vietnamese explanation rendered in the details panel. */
  message: string;
  /** Optional severity sort key (higher = more notable). */
  weight: number;
}

export interface KgIntelligenceResult {
  /** Per-node degree map for downstream consumers (label gating, viewer overlays). */
  degree: Map<string, number>;
  /** Per-node neighbor set; reused by viewer + selectors. */
  neighbors: Map<string, Set<string>>;
  /** Top hub viewer node ids (degree-ranked, capped). */
  topHubs: string[];
  /** Recording nodes missing one of: ethnicity, region, ceremony, instrument. */
  metadataGaps: IntelligenceObservation[];
  /** Nodes with degree ≤ 1 that aren't recordings (probable orphan reference data). */
  isolated: IntelligenceObservation[];
  /** Nodes connecting >1 distinct region or ethnic group. */
  crossRegion: IntelligenceObservation[];
  /** Top-K hub observations (one per hub). */
  hubObservations: IntelligenceObservation[];
}

const HUB_TOP_K = 6;

function endpointId(end: string | { id: string }): string {
  return typeof end === 'string' ? end : end.id;
}

function buildNeighborMap(graph: KnowledgeGraphData): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const n of graph.nodes) map.set(n.id, new Set());
  for (const l of graph.links) {
    const s = endpointId(l.source);
    const t = endpointId(l.target);
    if (s === t) continue;
    map.get(s)?.add(t);
    map.get(t)?.add(s);
  }
  return map;
}

function neighborTypes(node: GraphNode, neighbors: Map<string, Set<string>>, lookup: Map<string, GraphNode>): Set<string> {
  const set = new Set<string>();
  for (const id of neighbors.get(node.id) ?? []) {
    const t = lookup.get(id)?.type;
    if (t) set.add(t);
  }
  return set;
}

function neighborLabelsByType(
  node: GraphNode,
  neighbors: Map<string, Set<string>>,
  lookup: Map<string, GraphNode>,
  type: GraphNode['type'],
): string[] {
  const out: string[] = [];
  for (const id of neighbors.get(node.id) ?? []) {
    const n = lookup.get(id);
    if (n && n.type === type && n.name) out.push(n.name);
  }
  return out;
}

/** Rank nodes by degree, breaking ties by `val` then label. */
function rankByDegree(graph: KnowledgeGraphData, degree: Map<string, number>): GraphNode[] {
  return [...graph.nodes].sort((a, b) => {
    const d = (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0);
    if (d !== 0) return d;
    const v = (b.val ?? 0) - (a.val ?? 0);
    if (v !== 0) return v;
    return a.name.localeCompare(b.name, 'vi');
  });
}

export function computeKgIntelligence(graph: KnowledgeGraphData): KgIntelligenceResult {
  const neighbors = buildNeighborMap(graph);
  const degree = new Map<string, number>();
  for (const [id, set] of neighbors) degree.set(id, set.size);

  const lookup = new Map<string, GraphNode>(graph.nodes.map((n) => [n.id, n]));

  // ── Metadata gaps (recordings missing required relations) ──────────
  const metadataGaps: IntelligenceObservation[] = [];
  for (const n of graph.nodes) {
    if (n.type !== 'recording') continue;
    const types = neighborTypes(n, neighbors, lookup);
    const missing: string[] = [];
    if (!types.has('ethnic_group')) missing.push('Dân tộc');
    if (!types.has('instrument')) missing.push('Nhạc cụ');
    if (!types.has('ceremony')) missing.push('Nghi lễ');
    if (missing.length === 0) continue;
    metadataGaps.push({
      id: `gap:${n.id}`,
      kind: 'gap',
      nodeId: n.id,
      label: n.name,
      message: `Bản thu thiếu: ${missing.join(', ')}`,
      weight: missing.length,
    });
  }
  metadataGaps.sort((a, b) => b.weight - a.weight);

  // ── Isolated reference entities (degree ≤ 1, not recordings) ───────
  const isolated: IntelligenceObservation[] = [];
  for (const n of graph.nodes) {
    if (n.type === 'recording') continue;
    const d = degree.get(n.id) ?? 0;
    if (d > 1) continue;
    const typeLabel = n.entityType ?? n.apiEntityType ?? n.type;
    isolated.push({
      id: `iso:${n.id}`,
      kind: 'isolated',
      nodeId: n.id,
      label: n.name,
      message: `Chỉ có ${d} liên kết — có thể là dữ liệu ${typeLabel} ít được dùng.`,
      weight: 1 - d,
    });
  }
  isolated.sort((a, b) => b.weight - a.weight);

  // ── Cross-region / cross-ethnic bridges ────────────────────────────
  const crossRegion: IntelligenceObservation[] = [];
  for (const n of graph.nodes) {
    if (n.type === 'recording' || n.type === 'region' || n.type === 'province') continue;
    const regions = new Set(neighborLabelsByType(n, neighbors, lookup, 'region'));
    const ethnics = new Set(neighborLabelsByType(n, neighbors, lookup, 'ethnic_group'));
    if (regions.size >= 2 || ethnics.size >= 2) {
      const parts: string[] = [];
      if (regions.size >= 2) parts.push(`${regions.size} vùng`);
      if (ethnics.size >= 2) parts.push(`${ethnics.size} dân tộc`);
      crossRegion.push({
        id: `cross:${n.id}`,
        kind: 'cross-region',
        nodeId: n.id,
        label: n.name,
        message: `Liên kết ${parts.join(' & ')} — cầu nối liên văn hóa.`,
        weight: regions.size + ethnics.size,
      });
    }
  }
  crossRegion.sort((a, b) => b.weight - a.weight);

  // ── Global hubs ────────────────────────────────────────────────────
  const ranked = rankByDegree(graph, degree);
  const hubObservations: IntelligenceObservation[] = [];
  const topHubs: string[] = [];
  for (const n of ranked) {
    const d = degree.get(n.id) ?? 0;
    if (d < 2) break;
    if (hubObservations.length >= HUB_TOP_K) break;
    topHubs.push(n.id);
    hubObservations.push({
      id: `hub:${n.id}`,
      kind: 'hub',
      nodeId: n.id,
      label: n.name,
      message: `${d} liên kết — nút trung tâm của đồ thị hiện tại.`,
      weight: d,
    });
  }

  return {
    degree,
    neighbors,
    topHubs,
    metadataGaps,
    isolated,
    crossRegion,
    hubObservations,
  };
}

/**
 * Returns observations relevant to the currently-selected node, in priority order,
 * for use in the "Quan sát" / "Bạn có biết" cards.
 */
export function observationsForNode(
  intelligence: KgIntelligenceResult,
  selectedNodeId: string | null | undefined,
): IntelligenceObservation[] {
  if (!selectedNodeId) return [];
  const out: IntelligenceObservation[] = [];
  const all: IntelligenceObservation[] = [
    ...intelligence.crossRegion,
    ...intelligence.hubObservations,
    ...intelligence.metadataGaps,
    ...intelligence.isolated,
  ];
  for (const obs of all) {
    if (obs.nodeId === selectedNodeId) out.push(obs);
  }
  return out;
}

/** Returns total node-pair count contributed by `ofType` to this graph (for stats). */
export function countByType(graph: KnowledgeGraphData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const n of graph.nodes) counts[n.type] = (counts[n.type] ?? 0) + 1;
  return counts;
}

/**
 * Apply a semantic-mode filter: returns the subset of viewer node ids the user is asking
 * the canvas to spotlight. Empty set ⇒ no filter (all nodes visible).
 */
export function nodeIdsForMode(
  graph: KnowledgeGraphData,
  mode: SemanticMode,
  intelligence: KgIntelligenceResult,
): Set<string> {
  if (mode === 'free') return new Set();
  if (mode === 'hub') return new Set(intelligence.topHubs);
  if (mode === 'ethnicity') {
    const ids = new Set<string>();
    for (const n of graph.nodes) {
      if (n.type === 'ethnic_group') ids.add(n.id);
      else if (n.type === 'recording' || n.type === 'instrument') {
        const types = new Set<string>();
        for (const nb of intelligence.neighbors.get(n.id) ?? []) {
          const t = graph.nodes.find((x) => x.id === nb)?.type;
          if (t) types.add(t);
        }
        if (types.has('ethnic_group')) ids.add(n.id);
      }
    }
    return ids;
  }
  if (mode === 'region') {
    const ids = new Set<string>();
    for (const n of graph.nodes) {
      if (n.type === 'region' || n.type === 'province') ids.add(n.id);
    }
    return ids;
  }
  if (mode === 'ceremony') {
    const ids = new Set<string>();
    for (const n of graph.nodes) {
      if (n.type === 'ceremony') ids.add(n.id);
    }
    return ids;
  }
  return new Set();
}
