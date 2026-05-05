/**
 * Knowledge Graph REST API payloads (backend DTOs, JSON camelCase).
 * @see backend/VietTuneArchive.Application/Mapper/DTOs/KnowledgeGraph/
 */

export interface KnowledgeGraphApiNode {
  id: string;
  type: string;
  label: string;
  properties?: Record<string, unknown>;
}

export interface KnowledgeGraphApiEdge {
  sourceId: string;
  targetId: string;
  relation: string;
  properties?: Record<string, unknown> | null;
}

export interface KnowledgeGraphApiGraphResponse {
  nodes: KnowledgeGraphApiNode[];
  edges: KnowledgeGraphApiEdge[];
  totalNodes?: number;
}

export interface KnowledgeGraphExploreRequestBody {
  nodeId: string;
  nodeType: string;
  depth?: number;
  maxNodes?: number;
  filterTypes?: string[] | null;
}

export interface KnowledgeGraphStats {
  totalEthnicGroups: number;
  totalInstruments: number;
  totalCeremonies: number;
  totalRecordings: number;
  totalVocalStyles: number;
  totalMusicalScales: number;
  totalTags: number;
  totalProvinces: number;
  totalEdges: number;
}
