export type GraphNodeType =
  | 'region'
  | 'ethnic_group'
  | 'ceremony'
  | 'instrument'
  | 'recording'
  | 'province'
  | 'vocal_style'
  | 'musical_scale'
  | 'tag';

/** Backend Pascal entity types from Knowledge Graph API. */
export type ApiEntityType =
  | 'EthnicGroup'
  | 'Instrument'
  | 'Ceremony'
  | 'Recording'
  | 'Province'
  | 'VocalStyle'
  | 'MusicalScale'
  | 'Tag';

export interface GraphNode {
  /**
   * Force-graph node identity (= `viewerNodeId`). Format from Phase 2:
   *  - API-sourced or matched-by-GUID: `${entityType}:${entityId}`
   *  - Local fallback (no GUID): `${entityType}:local:${slug(name)}`
   * Older synthetic prefixes (`rec_`, `eth_`, …) are still accepted by the renderer for one
   * release but no longer produced by the adapter / builder.
   */
  id: string;
  /** Alias of `id` for clarity at call sites that operate purely on viewer keys. */
  viewerNodeId?: string;
  name: string;
  type: GraphNodeType;
  /** Backend entity GUID. Null when this node is a local-only fallback node (no DB match). */
  entityId?: string | null;
  /** Backend entity type (Pascal). Always populated; needed for `/explore` API. */
  entityType?: ApiEntityType;
  /** True when `entityId` points at a real backend record and is safe to send to `/explore`. */
  explorable?: boolean;
  /**
   * @deprecated Use `entityId`. Kept for one release to avoid churn in Researcher Portal callers.
   * Adapter still populates this with the same value as `entityId`.
   */
  backendId?: string;
  val?: number;
  color?: string;
  imgUrl?: string;
  desc?: string;
  degree?: number;
  /** @deprecated Use `entityType`. Same value, exposed under a clearer name in Phase 2. */
  apiEntityType?: string;

  // Internal react-force-graph properties injected at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  index?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value?: number; // Defines line thickness/strength
  color?: string;
  type?: string; // E.g., 'belongs_to', 'played_in', 'featured_in'
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
