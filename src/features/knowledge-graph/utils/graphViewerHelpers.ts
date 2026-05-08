import type { GraphLink, GraphNode, GraphNodeType, KnowledgeGraphData } from '@/types/graph';

export const CANVAS_LABEL_MAX_LEN = 16;
export const CANVAS_LABEL_MAX_LEN_ACTIVE = 26;

/** Degree threshold — hubs show labels when not selected/hovered. */
export const HIGH_DEGREE_THRESHOLD = 4;

/** On `node.val` / `nodeSize` scale (incl. enriched graphs): treat as “important” for labels. */
export const LABEL_IMPORTANCE_VAL_MIN = 5.5;

/** Min / max visual pixel radius on canvas (readable but not oversized). */
export const MIN_VISUAL_RADIUS = 4;
export const MAX_VISUAL_RADIUS = 14;

/**
 * Phase 1 radius: hybrid of degree (cognitive importance) + node.val (data weight).
 * `log10(degree+1)` chống "exploding hub" cho recordings có degree 50+.
 */
export function clampedVisualRadius(node: GraphNode, degree = 0): number {
  const v = Math.max(0, nodeSize(node));
  const importance = Math.log10(Math.max(degree, 0) + 1) * 4 + v;
  const raw = MIN_VISUAL_RADIUS + Math.sqrt(Math.max(importance, 0)) * 1.85;
  return Math.min(MAX_VISUAL_RADIUS, Math.max(MIN_VISUAL_RADIUS, raw));
}

/** 4-tier focus distance from active node (selected or hovered). */
export type FocusTier = 0 | 1 | 2 | 3;

const TIER_ALPHA: Record<FocusTier, number> = {
  0: 1,
  1: 0.85,
  2: 0.35,
  3: 0.08,
};

export function tierAlpha(tier: FocusTier): number {
  return TIER_ALPHA[tier];
}

/**
 * Returns hop distance bucket from `activeId` (0=focus, 1=neighbor, 2=2-hop, 3=unrelated).
 * If no active node, every node is tier 0 (no dimming).
 */
export function getNodeFocusTier(
  nodeId: string,
  activeId: string | null | undefined,
  neighborMap: Map<string, Set<string>>,
): FocusTier {
  if (!activeId) return 0;
  if (nodeId === activeId) return 0;
  const oneHop = neighborMap.get(activeId);
  if (oneHop?.has(nodeId)) return 1;
  if (oneHop) {
    for (const nb of oneHop) {
      const nbNeighbors = neighborMap.get(nb);
      if (nbNeighbors?.has(nodeId)) return 2;
    }
  }
  return 3;
}

/** Adaptive force-graph parameters scaled to graph size. */
export function adaptiveForceParams(nodeCount: number, compactLayout: boolean) {
  const N = Math.max(nodeCount, 4);
  // linkDistance shrinks slowly as graph grows; compact layout subtracts a fixed offset.
  const linkBase = 28 - Math.log2(N) * 1.6;
  const linkDistance = Math.min(30, Math.max(14, linkBase - (compactLayout ? 4 : 0)));
  // chargeStrength grows (more negative) for larger graphs to spread hubs.
  const chargeRaw = -55 - 220 / Math.sqrt(N);
  const charge = Math.min(-55, Math.max(-240, chargeRaw - (compactLayout ? 18 : 0)));
  const collideRadius = Math.min(16, Math.max(8, 8 + Math.log2(N) * 0.6));
  return { linkDistance, charge, collideRadius };
}

/**
 * Top-K hub ids (by degree) used for adaptive label gating.
 * K = clamp(N/15, 3, 12).
 */
export function computeTopHubIds(
  data: KnowledgeGraphData,
  neighborMap: Map<string, Set<string>>,
): Set<string> {
  if (!data.nodes.length) return new Set();
  const k = Math.min(12, Math.max(3, Math.round(data.nodes.length / 15)));
  const ranked = data.nodes
    .map((n) => ({ id: n.id, degree: neighborMap.get(n.id)?.size ?? 0, val: n.val ?? 0 }))
    .sort((a, b) => {
      if (b.degree !== a.degree) return b.degree - a.degree;
      return (b.val ?? 0) - (a.val ?? 0);
    })
    .slice(0, k);
  return new Set(ranked.map((r) => r.id));
}

/**
 * Adaptive label visibility: focus, hover, search hits and top-K hubs only.
 * Replaces the static degree/val threshold.
 */
export function shouldRenderNodeLabel(params: {
  nodeId: string;
  focusId: string | null | undefined;
  hoverId: string | null | undefined;
  searchHitIds?: ReadonlySet<string>;
  topHubIds: ReadonlySet<string>;
  scale: number;
}): boolean {
  const { nodeId, focusId, hoverId, searchHitIds, topHubIds, scale } = params;
  if (focusId === nodeId) return true;
  if (hoverId === nodeId) return true;
  if (scale < 0.55) return false;
  if (searchHitIds?.has(nodeId)) return true;
  if (scale >= 0.65 && topHubIds.has(nodeId)) return true;
  return false;
}

/** True if `nodeId` is the active focus or one hop away (full opacity in focus mode). */
export function isRelatedToActive(
  nodeId: string,
  activeId: string | null | undefined,
  neighborMap: Map<string, Set<string>>,
): boolean {
  if (!activeId) return true;
  if (nodeId === activeId) return true;
  return neighborMap.get(activeId)?.has(nodeId) ?? false;
}

/** Label for non-selected/hovered nodes: high degree or high `val`/size (importance). */
export function showHighImportanceLabel(node: GraphNode, degree: number): boolean {
  return degree >= HIGH_DEGREE_THRESHOLD || nodeSize(node) >= LABEL_IMPORTANCE_VAL_MIN;
}

/**
 * Default focus node: highest `val` first, then degree, then name.
 * If `filter` yields an empty pool, uses all nodes (same as tab UX fallback).
 */
export function pickFocusDefaultNode(
  graph: KnowledgeGraphData,
  filter?: (n: GraphNode) => boolean,
): GraphNode | null {
  if (!graph.nodes.length) return null;
  const deg = new Map<string, number>();
  for (const n of graph.nodes) deg.set(n.id, 0);
  for (const l of graph.links) {
    const s = nodeIdOf(l.source);
    const t = nodeIdOf(l.target);
    deg.set(s, (deg.get(s) ?? 0) + 1);
    deg.set(t, (deg.get(t) ?? 0) + 1);
  }
  let pool = filter ? graph.nodes.filter(filter) : [...graph.nodes];
  if (!pool.length) pool = [...graph.nodes];
  pool.sort((a, b) => {
    const vb = b.val ?? 0;
    const va = a.val ?? 0;
    if (vb !== va) return vb - va;
    const db = deg.get(b.id) ?? 0;
    const da = deg.get(a.id) ?? 0;
    if (db !== da) return db - da;
    return a.name.localeCompare(b.name, 'vi');
  });
  return pool[0] ?? null;
}

/**
 * Muted palette — fewer saturated tones, recording/tag fades into background.
 */
export const colorMap: Record<GraphNodeType, string> = {
  region: '#d97706',
  province: '#d97706',
  ethnic_group: '#b91c1c',
  ceremony: '#7c3aed',
  instrument: '#0369a1',
  recording: '#94a3b8',
  vocal_style: '#a855f7',
  musical_scale: '#65a30d',
  tag: '#9ca3af',
};

export function nodeColor(node: GraphNode): string {
  return node.color || colorMap[node.type] || '#94a3b8';
}

const NODE_SIZE_BASE: Partial<Record<GraphNodeType, number>> = {
  region: 5,
  province: 5,
  ethnic_group: 4,
  ceremony: 3.5,
  instrument: 3,
  vocal_style: 3,
  musical_scale: 3,
  recording: 2,
  tag: 2,
};

export function nodeSize(node: GraphNode): number {
  return node.val || NODE_SIZE_BASE[node.type] || 2;
}

export const TYPE_LABELS: Record<string, string> = {
  region: 'Vùng miền',
  province: 'Địa phương',
  ethnic_group: 'Dân tộc',
  ceremony: 'Nghi lễ',
  instrument: 'Nhạc cụ',
  recording: 'Bản thu',
  vocal_style: 'Giọng hát',
  musical_scale: 'Âm giai',
  tag: 'Thẻ',
};

export function truncateLabel(text: string, maxLen: number): string {
  if (maxLen < 4) return '…';
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

export function nodeIdOf(value: string | GraphNode): string {
  return typeof value === 'string' ? value : value.id;
}

export function buildNeighborMap(data: KnowledgeGraphData): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const n of data.nodes) map.set(n.id, new Set());
  for (const l of data.links) {
    const s = nodeIdOf(l.source);
    const t = nodeIdOf(l.target);
    map.get(s)?.add(t);
    map.get(t)?.add(s);
  }
  return map;
}

export function buildGraphDataSafe(data: KnowledgeGraphData, maxNodes = 100): KnowledgeGraphData {
  const seenNodes = new Map<string, GraphNode>();
  for (const n of data.nodes) {
    if (!seenNodes.has(n.id)) seenNodes.set(n.id, n);
  }
  let nodes = Array.from(seenNodes.values());

  const deg = new Map<string, number>();
  for (const n of nodes) deg.set(n.id, 0);
  for (const l of data.links) {
    const s = nodeIdOf(l.source);
    const t = nodeIdOf(l.target);
    if (!seenNodes.has(s) || !seenNodes.has(t)) continue;
    deg.set(s, (deg.get(s) ?? 0) + 1);
    deg.set(t, (deg.get(t) ?? 0) + 1);
  }

  if (nodes.length > maxNodes) {
    const capScore = (n: GraphNode) => (deg.get(n.id) ?? 0) * 10 + (n.val ?? nodeSize(n));
    nodes = [...nodes]
      .sort((a, b) => {
        const sb = capScore(b);
        const sa = capScore(a);
        if (sb !== sa) return sb - sa;
        return a.name.localeCompare(b.name, 'vi');
      })
      .slice(0, maxNodes);
  }
  const nodeIds = new Set(nodes.map((n) => n.id));

  const seenEdges = new Set<string>();
  const links: GraphLink[] = [];
  for (const l of data.links) {
    const s = nodeIdOf(l.source);
    const t = nodeIdOf(l.target);
    if (!nodeIds.has(s) || !nodeIds.has(t)) continue;
    const key = s < t ? `${s}\0${t}` : `${t}\0${s}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    links.push(l);
  }
  return { nodes, links };
}

/** @deprecated Use `buildGraphDataSafe` */
export const sanitizeGraph = buildGraphDataSafe;
