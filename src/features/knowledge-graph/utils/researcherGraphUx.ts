import type { Recording } from '@/types';
import type { GraphNode, GraphNodeType, KnowledgeGraphData } from '@/types/graph';

export type ResearcherGraphTabView =
  | 'overview'
  | 'instruments'
  | 'ethnicity'
  | 'ceremony'
  | 'recordings';

/** Selection from list or graph (for details + related recordings). */
export type ResearcherGraphSelection =
  | null
  | {
      source: 'graph';
      id: string;
      apiEntityType: string;
      label: string;
      viewerType: GraphNodeType;
    }
  | {
      source: 'list';
      viewerType: GraphNodeType;
      name: string;
      id?: string;
    };

export function apiEntityTypeToViewerType(api: string): GraphNodeType {
  switch (api) {
    case 'EthnicGroup':
      return 'ethnic_group';
    case 'Instrument':
      return 'instrument';
    case 'Ceremony':
      return 'ceremony';
    case 'Recording':
      return 'recording';
    case 'Province':
      return 'province';
    case 'VocalStyle':
      return 'vocal_style';
    case 'MusicalScale':
      return 'musical_scale';
    case 'Tag':
      return 'tag';
    default:
      return 'recording';
  }
}

/**
 * @deprecated Phase 2 introduces explicit `entityId` + `explorable` flags on `GraphNode`.
 * Kept as a fallback for one release while old callers migrate. Will be removed in Phase 5.
 */
const LEGACY_SYNTHETIC_NODE_ID_PREFIX = /^(rec_|eth_|reg_|cer_|inst_)/;

/**
 * Composite viewer node id format: `${EntityType}:${entityId | "local:slug"}`.
 * Local-only nodes (no backend GUID) cannot be explored on the server.
 */
const LOCAL_VIEWER_ID_MARKER = ':local:';

/**
 * Returns the GUID to send to `GET /api/KnowledgeGraph/explore/{nodeId}`,
 * or `null` if the node has no backend identity (= local fallback).
 *
 * Phase 2 source of truth: `entityId` + `explorable`. Falls back to legacy `backendId` /
 * raw GUID-shaped `id` for nodes still produced by older code paths.
 */
export function resolveKnowledgeGraphExploreNodeId(n: GraphNode): string | null {
  if (n.explorable && n.entityId?.trim()) return n.entityId.trim();
  if (n.entityId === null && n.viewerNodeId?.includes(LOCAL_VIEWER_ID_MARKER)) return null;

  // Legacy paths (pre-Phase 2 nodes still in caches):
  const legacyBackend = n.backendId?.trim();
  if (legacyBackend) return legacyBackend;
  const id = n.id?.trim();
  if (!id) return null;
  if (LEGACY_SYNTHETIC_NODE_ID_PREFIX.test(id)) return null;
  if (id.includes(LOCAL_VIEWER_ID_MARKER)) return null;
  // Composite `${Type}:${guid}` form: extract guid suffix.
  const colonIdx = id.indexOf(':');
  if (colonIdx > 0 && !id.includes(LOCAL_VIEWER_ID_MARKER)) {
    return id.slice(colonIdx + 1).trim() || null;
  }
  return id;
}

/** Stable selection key combining viewer id + entity id (avoids ambiguity for stale nodes). */
export function selectionKeyOf(n: { viewerNodeId?: string; id: string; entityId?: string | null }): string {
  return `${n.viewerNodeId ?? n.id}|${n.entityId ?? ''}`;
}

export function viewerTypeToApiEntityType(t: GraphNodeType): string {
  switch (t) {
    case 'ethnic_group':
      return 'EthnicGroup';
    case 'instrument':
      return 'Instrument';
    case 'ceremony':
      return 'Ceremony';
    case 'recording':
      return 'Recording';
    case 'province':
      return 'Province';
    case 'vocal_style':
      return 'VocalStyle';
    case 'musical_scale':
      return 'MusicalScale';
    case 'tag':
      return 'Tag';
    case 'region':
      return 'Province';
    default:
      return 'Recording';
  }
}

export function tabMatchesViewerType(tab: ResearcherGraphTabView, t: GraphNodeType): boolean {
  switch (tab) {
    case 'overview':
      return true;
    case 'instruments':
      return t === 'instrument';
    case 'ethnicity':
      return t === 'ethnic_group';
    case 'ceremony':
      return t === 'ceremony';
    case 'recordings':
      return t === 'recording';
    default:
      return true;
  }
}

export function apiTypesQueryForTab(tab: ResearcherGraphTabView): string | undefined {
  switch (tab) {
    case 'instruments':
      return 'Instrument';
    case 'ethnicity':
      return 'EthnicGroup';
    case 'ceremony':
      return 'Ceremony';
    case 'recordings':
      return 'Recording';
    default:
      return undefined;
  }
}

/** Degree-based `val` for force layout (importance). */
export function enrichGraphWithDegreeVal(data: KnowledgeGraphData): KnowledgeGraphData {
  const deg = new Map<string, number>();
  for (const n of data.nodes) deg.set(n.id, 0);
  for (const l of data.links) {
    const s = typeof l.source === 'string' ? l.source : l.source.id;
    const t = typeof l.target === 'string' ? l.target : l.target.id;
    deg.set(s, (deg.get(s) ?? 0) + 1);
    deg.set(t, (deg.get(t) ?? 0) + 1);
  }
  const nodes = data.nodes.map((n) => ({
    ...n,
    val: 2 + Math.min(deg.get(n.id) ?? 0, 12),
  }));
  return { nodes, links: data.links };
}

/** Neighbor node IDs of `selectedId` (one hop). */
function neighborIdsOf(graph: KnowledgeGraphData, selectedId: string): Set<string> {
  const ids = new Set<string>();
  for (const l of graph.links) {
    const s = typeof l.source === 'string' ? l.source : l.source.id;
    const t = typeof l.target === 'string' ? l.target : l.target.id;
    if (s === selectedId && t !== selectedId) ids.add(t);
    else if (t === selectedId && s !== selectedId) ids.add(s);
  }
  return ids;
}

/** Recording-type graph nodes directly linked to the selected node (max 5). */
export function getRecordingNeighborNodesInGraph(
  graph: KnowledgeGraphData,
  selectedId: string | null | undefined,
  max = 5,
): GraphNode[] {
  if (!selectedId) return [];
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const out: GraphNode[] = [];
  for (const id of neighborIdsOf(graph, selectedId)) {
    const n = nodeMap.get(id);
    if (n?.type === 'recording') out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

/** Default focus node: highest degree in tab filter, else global hub. Does not mutate graph. */
export function pickDefaultGraphNodeForTab(
  graph: KnowledgeGraphData,
  tab: ResearcherGraphTabView,
): GraphNode | null {
  if (!graph.nodes.length) return null;
  const deg = new Map<string, number>();
  for (const n of graph.nodes) deg.set(n.id, 0);
  for (const l of graph.links) {
    const s = typeof l.source === 'string' ? l.source : l.source.id;
    const t = typeof l.target === 'string' ? l.target : l.target.id;
    deg.set(s, (deg.get(s) ?? 0) + 1);
    deg.set(t, (deg.get(t) ?? 0) + 1);
  }
  let pool = graph.nodes.filter((n) => tabMatchesViewerType(tab, n.type));
  if (!pool.length) pool = [...graph.nodes];
  pool.sort((a, b) => {
    const d = (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0);
    if (d !== 0) return d;
    const v = (b.val ?? 0) - (a.val ?? 0);
    if (v !== 0) return v;
    return a.name.localeCompare(b.name, 'vi');
  });
  return pool[0] ?? null;
}

export function getRelatedRecordings(
  recordings: Recording[],
  sel: ResearcherGraphSelection,
): Recording[] {
  if (!sel) return [];
  if (sel.source === 'graph') {
    if (sel.viewerType === 'recording') {
      return recordings.filter((r) => r.id === sel.id);
    }
    if (sel.viewerType === 'instrument') {
      return recordings.filter((r) =>
        r.instruments?.some((i) => (i.nameVietnamese ?? i.name) === sel.label),
      );
    }
    if (sel.viewerType === 'ethnic_group') {
      return recordings.filter(
        (r) => (r.ethnicity?.nameVietnamese ?? r.ethnicity?.name) === sel.label,
      );
    }
    if (sel.viewerType === 'ceremony') {
      const q = sel.label.trim().toLowerCase();
      return recordings.filter((r) => {
        const tags = (r.tags ?? []).join(' ').toLowerCase();
        const ritual = (r.metadata?.ritualContext ?? '').toLowerCase();
        return tags.includes(q) || ritual.includes(q) || (r.title ?? '').toLowerCase().includes(q);
      });
    }
  }
  if (sel.source === 'list') {
    if (sel.viewerType === 'instrument') {
      return recordings.filter((r) =>
        r.instruments?.some((i) => (i.nameVietnamese ?? i.name) === sel.name),
      );
    }
    if (sel.viewerType === 'ethnic_group') {
      return recordings.filter(
        (r) => (r.ethnicity?.nameVietnamese ?? r.ethnicity?.name) === sel.name,
      );
    }
    if (sel.viewerType === 'ceremony') {
      const q = sel.name.trim().toLowerCase();
      return recordings.filter((r) => {
        const tags = (r.tags ?? []).join(' ').toLowerCase();
        const ritual = (r.metadata?.ritualContext ?? '').toLowerCase();
        return tags.includes(q) || ritual.includes(q);
      });
    }
    if (sel.viewerType === 'recording' && sel.id) {
      return recordings.filter((r) => r.id === sel.id);
    }
  }
  return [];
}

export function nodeMatchesListSelection(
  sel: ResearcherGraphSelection,
  n: { id: string; name: string; type: GraphNodeType },
): boolean {
  if (!sel) return false;
  if (sel.source === 'graph') return sel.id === n.id;
  return sel.viewerType === n.type && (sel.id ? sel.id === n.id : sel.name === n.name);
}
