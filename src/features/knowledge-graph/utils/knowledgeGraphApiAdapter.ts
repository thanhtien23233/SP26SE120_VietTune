import type { ApiEntityType, GraphLink, GraphNode, GraphNodeType, KnowledgeGraphData } from '@/types/graph';
import type {
  KnowledgeGraphApiGraphResponse,
  KnowledgeGraphApiNode,
} from '@/types/knowledgeGraphApi';

const API_TYPE_TO_VIEWER: Record<string, GraphNodeType> = {
  EthnicGroup: 'ethnic_group',
  Instrument: 'instrument',
  Ceremony: 'ceremony',
  Recording: 'recording',
  Province: 'province',
  VocalStyle: 'vocal_style',
  MusicalScale: 'musical_scale',
  Tag: 'tag',
};

const VALID_API_ENTITY_TYPES: ReadonlySet<ApiEntityType> = new Set<ApiEntityType>([
  'EthnicGroup',
  'Instrument',
  'Ceremony',
  'Recording',
  'Province',
  'VocalStyle',
  'MusicalScale',
  'Tag',
]);

export function isValidApiEntityType(value: string): value is ApiEntityType {
  return VALID_API_ENTITY_TYPES.has(value as ApiEntityType);
}

function mapApiTypeToViewer(apiType: string): GraphNodeType {
  return API_TYPE_TO_VIEWER[apiType] ?? 'recording';
}

/**
 * Composite viewer node id used everywhere from Phase 2 onward.
 *  - `${entityType}:${entityId}` when GUID is known (API-sourced or matched local node).
 *  - `${entityType}:local:${slug}` for local-only fallback nodes that have no DB match.
 */
export function buildViewerNodeId(
  entityType: ApiEntityType,
  entityId: string | null | undefined,
  fallbackSlug?: string,
): string {
  if (entityId && entityId.trim()) return `${entityType}:${entityId.trim()}`;
  return `${entityType}:local:${(fallbackSlug ?? 'unknown').trim() || 'unknown'}`;
}

function summarizeProperties(properties: Record<string, unknown> | undefined): string | undefined {
  if (!properties || Object.keys(properties).length === 0) return undefined;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(properties)) {
    if (v == null) continue;
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (s.length > 80) parts.push(`${k}: ${s.slice(0, 77)}…`);
    else parts.push(`${k}: ${s}`);
    if (parts.length >= 4) break;
  }
  return parts.length ? parts.join(' · ') : undefined;
}

function imageFromProperties(properties: Record<string, unknown> | undefined): string | undefined {
  if (!properties) return undefined;
  const keys = ['imageUrl', 'ImageUrl', 'thumbnail', 'Thumbnail'];
  for (const k of keys) {
    const v = properties[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Positive numeric edge weight for viewer line width; defaults to 1. */
function linkValueFromApiProperties(properties: Record<string, unknown> | null | undefined): number {
  if (!properties) return 1;
  const raw = properties.weight ?? properties.Weight;
  if (raw == null) return 1;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

export function mapKnowledgeGraphApiNodeToGraphNode(n: KnowledgeGraphApiNode): GraphNode {
  const viewerType = mapApiTypeToViewer(n.type);
  const entityType: ApiEntityType = isValidApiEntityType(n.type) ? n.type : 'Recording';
  const entityId = n.id?.trim() || null;
  const viewerNodeId = buildViewerNodeId(entityType, entityId, n.label || n.id);
  return {
    id: viewerNodeId,
    viewerNodeId,
    entityId,
    entityType,
    explorable: !!entityId,
    backendId: entityId ?? undefined, // legacy alias
    name: n.label?.trim() ? n.label : n.id,
    type: viewerType,
    apiEntityType: n.type,
    val: 1,
    desc: summarizeProperties(n.properties),
    imgUrl: imageFromProperties(n.properties),
  };
}

/** Converts API graph payload to `KnowledgeGraphViewer` format (reused by overview + explore hooks). */
export function knowledgeGraphApiToViewerData(
  api: KnowledgeGraphApiGraphResponse,
): KnowledgeGraphData {
  const apiNodes = api.nodes ?? [];
  const nodes = apiNodes.map(mapKnowledgeGraphApiNodeToGraphNode);
  // Build a quick map: backend GUID → composite viewer id, so edges can be remapped reliably.
  const idMap = new Map<string, string>();
  for (let i = 0; i < apiNodes.length; i++) {
    const guid = apiNodes[i].id;
    if (guid && nodes[i]?.id) idMap.set(guid, nodes[i].id);
  }
  const links: GraphLink[] = (api.edges ?? []).map((e) => ({
    source: idMap.get(e.sourceId) ?? e.sourceId,
    target: idMap.get(e.targetId) ?? e.targetId,
    type: e.relation,
    value: linkValueFromApiProperties(e.properties ?? undefined),
  }));
  return { nodes, links };
}

export type KnowledgeGraphRemoteGraphPayload = {
  graph: KnowledgeGraphData;
  raw: KnowledgeGraphApiGraphResponse;
};

export function toRemoteGraphPayload(
  api: KnowledgeGraphApiGraphResponse,
): KnowledgeGraphRemoteGraphPayload {
  return {
    graph: knowledgeGraphApiToViewerData(api),
    raw: {
      nodes: api.nodes ?? [],
      edges: api.edges ?? [],
      totalNodes: api.totalNodes,
    },
  };
}
