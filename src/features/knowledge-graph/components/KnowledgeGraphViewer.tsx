import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

import { KnowledgeGraphData, GraphLink, GraphNode } from '@/types/graph';

// Hook để auto resize canvas theo kích thước thẻ container bao bọc
const useContainerDimensions = (myRef: React.RefObject<HTMLElement>) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const getDimensions = () => ({
      width: myRef.current?.offsetWidth || 0,
      height: myRef.current?.offsetHeight || 0,
    });

    const handleResize = () => {
      setDimensions(getDimensions());
    };

    if (myRef.current) {
      setDimensions(getDimensions());
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (myRef.current) {
      resizeObserver.observe(myRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [myRef]);

  return dimensions;
};

interface KnowledgeGraphViewerProps {
  data: KnowledgeGraphData;
  onNodeClick?: (node: GraphNode) => void;
}

type GraphLinkEdge = GraphLink & {
  source: string | GraphNode;
  target: string | GraphNode;
};

function nodeIdOf(value: string | GraphNode): string {
  return typeof value === 'string' ? value : value.id;
}

const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ data, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(containerRef);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLinkEdge>>();

  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    data.nodes.forEach((n) => map.set(n.id, new Set()));
    data.links.forEach((l) => {
      const sourceId = nodeIdOf(l.source);
      const targetId = nodeIdOf(l.target);
      map.get(sourceId)?.add(targetId);
      map.get(targetId)?.add(sourceId);
    });
    return map;
  }, [data]);

  const getNodeColor = useCallback((node: GraphNode) => {
    if (node.color) return node.color;
    switch (node.type) {
      case 'region':
        return '#ff7a59';
      case 'ethnic_group':
        return '#e6194b';
      case 'ceremony':
        return '#911eb4';
      case 'instrument':
        return '#4363d8';
      case 'recording':
        return '#3cb44b';
      default:
        return '#999999';
    }
  }, []);

  const getNodeSize = useCallback((node: GraphNode) => {
    if (node.val) return node.val;
    switch (node.type) {
      case 'region':
        return 8;
      case 'ethnic_group':
        return 6;
      case 'ceremony':
        return 5;
      case 'instrument':
        return 4;
      case 'recording':
        return 3;
      default:
        return 3;
    }
  }, []);

  const handleNodeClick = useCallback(
    (graphNode: GraphNode) => {
      if (onNodeClick) {
        onNodeClick(graphNode);
      }
      if (fgRef.current && graphNode.x !== undefined && graphNode.y !== undefined) {
        fgRef.current.centerAt(graphNode.x, graphNode.y, 1000);
        fgRef.current.zoom(4, 2000);
      }
    },
    [onNodeClick],
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoverNode(node);
  }, []);

  const getLinkColor = useCallback(
    (link: GraphLinkEdge) => {
      const sourceId = nodeIdOf(link.source);
      const targetId = nodeIdOf(link.target);
      const isHoveredNodeRelated =
        hoverNode && (sourceId === hoverNode.id || targetId === hoverNode.id);
      if (!hoverNode) return link.color || '#cbd5e1';
      return isHoveredNodeRelated ? '#64748b' : '#f1f5f9';
    },
    [hoverNode],
  );

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name;
      const fontSize = 14 / globalScale;
      const nodeR = getNodeSize(node) * 1.5;
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;

      const isHovered = hoverNode?.id === node.id;
      const isNeighbor = hoverNode ? neighbors.get(hoverNode.id)?.has(node.id) : false;
      const shouldDim = hoverNode && !isHovered && !isNeighbor;

      ctx.globalAlpha = shouldDim ? 0.15 : 1.0;
      ctx.beginPath();
      ctx.arc(nx, ny, nodeR, 0, 2 * Math.PI, false);
      ctx.fillStyle = getNodeColor(node);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();

      if (globalScale > 0.8 && !shouldDim) {
        const maxLen = isHovered ? 40 : 25;
        const displayLabel = label.length > maxLen ? label.substring(0, maxLen - 3) + '...' : label;
        ctx.font = `${isHovered ? 'bold ' : ''}${fontSize}px Inter, Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#334155';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 4;
        ctx.fillText(displayLabel, nx, ny + nodeR + 2);
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1.0;
    },
    [getNodeColor, getNodeSize, hoverNode, neighbors],
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
    }
  };

  const typeLabels: Record<string, string> = {
    region: 'Vùng miền',
    ethnic_group: 'Dân tộc',
    ceremony: 'Nghi lễ',
    instrument: 'Nhạc cụ',
    recording: 'Bản thu',
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] bg-slate-50 relative rounded-xl border border-slate-200 overflow-hidden shadow-inner"
      onMouseMove={handleMouseMove}
    >
      {width > 0 && height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={width}
          height={height}
          graphData={data}
          nodeColor={getNodeColor}
          nodeVal={getNodeSize}
          nodeCanvasObject={paintNode}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          linkColor={getLinkColor}
          linkWidth={(link) => {
            const edge = link as GraphLinkEdge;
            if (!hoverNode) return 1.5;
            const sourceId = nodeIdOf(edge.source);
            const targetId = nodeIdOf(edge.target);
            return sourceId === hoverNode.id || targetId === hoverNode.id ? 2.5 : 1.5;
          }}
          d3VelocityDecay={0.3}
          cooldownTicks={150}
        />
      )}

      {hoverNode && (
        <div
          className="absolute z-10 pointer-events-none transition-opacity duration-200 bg-white shadow-xl shadow-slate-200/50 rounded-lg p-3 border border-slate-100 flex flex-col min-w-[200px]"
          style={{ top: mousePos.y + 15, left: mousePos.x + 15 }}
        >
          <div className="flex items-start gap-3">
            {hoverNode.imgUrl && (
              <div className="shrink-0">
                <img
                  src={hoverNode.imgUrl}
                  alt={hoverNode.name}
                  className="w-12 h-12 rounded object-cover border border-slate-100"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
                {typeLabels[hoverNode.type] || hoverNode.type}
              </p>
              <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2">
                {hoverNode.name}
              </h4>
              {hoverNode.desc && (
                <p className="text-xs text-slate-600 line-clamp-3">{hoverNode.desc}</p>
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-50 text-xs text-slate-500 flex justify-between">
            <span>{neighbors.get(hoverNode.id)?.size || 0} Liên kết</span>
            <span className="text-blue-500 font-medium">Nhấn để Xem</span>
          </div>
        </div>
      )}

      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
          <svg
            className="w-12 h-12 mb-3 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
            />
          </svg>
          <p className="font-medium">Không có dữ liệu đồ thị</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphViewer;
