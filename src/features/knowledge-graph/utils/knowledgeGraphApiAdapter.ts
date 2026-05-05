import type { GraphLink, GraphNode, GraphNodeType, KnowledgeGraphData } from '@/types/graph';
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

function mapApiTypeToViewer(apiType: string): GraphNodeType {
  return API_TYPE_TO_VIEWER[apiType] ?? 'recording';
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
  return {
    id: n.id,
    backendId: n.id,
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
  const nodes = (api.nodes ?? []).map(mapKnowledgeGraphApiNodeToGraphNode);
  const links: GraphLink[] = (api.edges ?? []).map((e) => ({
    source: e.sourceId,
    target: e.targetId,
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
