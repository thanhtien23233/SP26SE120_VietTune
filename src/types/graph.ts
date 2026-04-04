export type GraphNodeType = 'region' | 'ethnic_group' | 'ceremony' | 'instrument' | 'recording';

export interface GraphNode {
  id: string;
  name: string;
  type: GraphNodeType;
  val?: number; // Represents the size of the node (based on degree often)
  color?: string;
  imgUrl?: string; // Thumbnail for tooltip
  desc?: string; // Short summary
  degree?: number;

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
