import type { GraphLink, GraphNode, GraphNodeType, KnowledgeGraphData } from '@/types/graph';

export const CANVAS_LABEL_MAX_LEN = 16;
export const CANVAS_LABEL_MAX_LEN_ACTIVE = 26;

/** Degree threshold — hubs show labels when not selected/hovered. */
export const HIGH_DEGREE_THRESHOLD = 4;

/** On `node.val` / `nodeSize` scale (incl. enriched graphs): treat as “important” for labels. */
export const LABEL_IMPORTANCE_VAL_MIN = 5.5;

/** Min / max visual pixel radius on canvas (readable but not oversized). */
export const MIN_VISUAL_RADIUS = 4;
export const MAX_VISUAL_RADIUS = 12;

/** Sqrt scaling on force value so large hubs do not explode on screen; clamped to [min,max]. */
export function clampedVisualRadius(node: GraphNode): number {
  const v = Math.max(0, nodeSize(node));
  const raw = MIN_VISUAL_RADIUS + Math.sqrt(v) * 2.05;
  return Math.min(MAX_VISUAL_RADIUS, Math.max(MIN_VISUAL_RADIUS, raw));
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
