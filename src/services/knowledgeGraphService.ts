import { apiFetch, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import type { components } from '@/api/generated';
import type {
  KnowledgeGraphApiEdge,
  KnowledgeGraphApiGraphResponse,
  KnowledgeGraphApiNode,
  KnowledgeGraphExploreRequestBody,
  KnowledgeGraphStats,
} from '@/types/knowledgeGraphApi';

type GraphExploreBody = components['schemas']['VietTuneArchive.Application.Mapper.DTOs.KnowledgeGraph.GraphExploreRequest'];

function pickRecord<T extends object>(row: unknown, keys: (keyof T)[]): Partial<T> {
  if (!row || typeof row !== 'object') return {};
  const o = row as Record<string, unknown>;
  const out: Partial<T> = {};
  for (const k of keys) {
    const camel = String(k);
    const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
    const v = o[camel] ?? o[pascal];
    if (v !== undefined) (out as Record<string, unknown>)[camel] = v;
  }
  return out;
}

function asNodeDto(raw: unknown): KnowledgeGraphApiNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = pickRecord<KnowledgeGraphApiNode>(raw, ['id', 'type', 'label', 'properties']);
  const id = typeof p.id === 'string' ? p.id : '';
  const type = typeof p.type === 'string' ? p.type : '';
  const label = typeof p.label === 'string' ? p.label : '';
  if (!id || !type) return null;
  return {
    id,
    type,
    label,
    properties:
      p.properties && typeof p.properties === 'object' && !Array.isArray(p.properties)
        ? (p.properties as Record<string, unknown>)
        : undefined,
  };
}

function asEdgeDto(raw: unknown): KnowledgeGraphApiEdge | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = pickRecord<KnowledgeGraphApiEdge>(raw, [
    'sourceId',
    'targetId',
    'relation',
    'properties',
  ]);
  const sourceId = typeof p.sourceId === 'string' ? p.sourceId : '';
  const targetId = typeof p.targetId === 'string' ? p.targetId : '';
  const relation = typeof p.relation === 'string' ? p.relation : '';
  if (!sourceId || !targetId || !relation) return null;
  return {
    sourceId,
    targetId,
    relation,
    properties:
      p.properties && typeof p.properties === 'object' && !Array.isArray(p.properties)
        ? (p.properties as Record<string, unknown>)
        : p.properties === null
          ? null
          : undefined,
  };
}

/** Normalizes overview/explore JSON (camel or Pascal keys). */
export function parseKnowledgeGraphApiResponse(raw: unknown): KnowledgeGraphApiGraphResponse {
  if (raw == null || typeof raw !== 'object') {
    return { nodes: [], edges: [], totalNodes: 0 };
  }
  const o = raw as Record<string, unknown>;
  const nodesRaw = o.nodes ?? o.Nodes;
  const edgesRaw = o.edges ?? o.Edges;
  const totalRaw = o.totalNodes ?? o.TotalNodes;
  const nodes = Array.isArray(nodesRaw)
    ? (nodesRaw.map(asNodeDto).filter(Boolean) as KnowledgeGraphApiNode[])
    : [];
  const edges = Array.isArray(edgesRaw)
    ? (edgesRaw.map(asEdgeDto).filter(Boolean) as KnowledgeGraphApiEdge[])
    : [];
  const totalNodes = typeof totalRaw === 'number' && Number.isFinite(totalRaw) ? totalRaw : nodes.length;
  return { nodes, edges, totalNodes };
}

function parseSearchNodes(raw: unknown): KnowledgeGraphApiNode[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asNodeDto).filter(Boolean) as KnowledgeGraphApiNode[];
}

function parseStats(raw: unknown): KnowledgeGraphStats {
  if (!raw || typeof raw !== 'object') {
    return {
      totalEthnicGroups: 0,
      totalInstruments: 0,
      totalCeremonies: 0,
      totalRecordings: 0,
      totalVocalStyles: 0,
      totalMusicalScales: 0,
      totalTags: 0,
      totalProvinces: 0,
      totalEdges: 0,
    };
  }
  const p = pickRecord<KnowledgeGraphStats>(raw, [
    'totalEthnicGroups',
    'totalInstruments',
    'totalCeremonies',
    'totalRecordings',
    'totalVocalStyles',
    'totalMusicalScales',
    'totalTags',
    'totalProvinces',
    'totalEdges',
  ]);
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    totalEthnicGroups: n(p.totalEthnicGroups),
    totalInstruments: n(p.totalInstruments),
    totalCeremonies: n(p.totalCeremonies),
    totalRecordings: n(p.totalRecordings),
    totalVocalStyles: n(p.totalVocalStyles),
    totalMusicalScales: n(p.totalMusicalScales),
    totalTags: n(p.totalTags),
    totalProvinces: n(p.totalProvinces),
    totalEdges: n(p.totalEdges),
  };
}

function toExploreBody(req: KnowledgeGraphExploreRequestBody): GraphExploreBody {
  return {
    nodeId: req.nodeId,
    nodeType: req.nodeType,
    depth: req.depth,
    maxNodes: req.maxNodes,
    filterTypes: req.filterTypes ?? null,
  };
}

export const knowledgeGraphService = {
  async getOverview(params: { maxNodes?: number; signal?: AbortSignal }): Promise<KnowledgeGraphApiGraphResponse> {
    const maxNodes = params.maxNodes ?? 100;
    const raw = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/KnowledgeGraph/overview', {
          params: { query: openApiQueryRecord({ maxNodes }) },
          signal: params.signal,
        }),
      ),
    );
    return parseKnowledgeGraphApiResponse(raw);
  },

  async exploreNode(
    body: KnowledgeGraphExploreRequestBody,
    signal?: AbortSignal,
  ): Promise<KnowledgeGraphApiGraphResponse> {
    const raw = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.POST('/api/KnowledgeGraph/explore', {
          body: toExploreBody(body) as GraphExploreBody,
          signal,
        }),
      ),
    );
    return parseKnowledgeGraphApiResponse(raw);
  },

  async searchNodes(params: {
    query: string;
    types?: string;
    limit?: number;
    signal?: AbortSignal;
  }): Promise<KnowledgeGraphApiNode[]> {
    const raw = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/KnowledgeGraph/search', {
          params: {
            query: openApiQueryRecord({
              query: params.query,
              types: params.types,
              limit: params.limit ?? 20,
            }),
          },
          signal: params.signal,
        }),
      ),
    );
    return parseSearchNodes(raw);
  },

  async getStats(signal?: AbortSignal): Promise<KnowledgeGraphStats> {
    const raw = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/KnowledgeGraph/stats', {
          signal,
        }),
      ),
    );
    return parseStats(raw);
  },
};
