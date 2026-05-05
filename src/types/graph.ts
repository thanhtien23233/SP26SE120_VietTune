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

export interface GraphNode {
  id: string;
  name: string;
  type: GraphNodeType;
  /**
   * Backend entity id / GUID for Knowledge Graph API (explore, detail).
   * May differ from `id` when the viewer uses prefixed local graph ids (`rec_…`, `inst_…`, etc.).
   * For API-sourced nodes this matches `id`.
   */
  backendId?: string;
  val?: number; // Represents the size of the node (based on degree often)
  color?: string;
  imgUrl?: string; // Thumbnail for tooltip
  desc?: string; // Short summary
  degree?: number;
  /** Original backend entity type from Knowledge Graph API (e.g. `EthnicGroup`). */
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
