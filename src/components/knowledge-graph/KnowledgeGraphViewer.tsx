import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { KnowledgeGraphData, GraphNode } from '../../types/graph';

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

const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ data, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(containerRef);
  const fgRef = useRef<ForceGraphMethods>();

  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Tính toán trước các node nội hàm (láng giềng) để Focus O(1)
  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    data.nodes.forEach(n => map.set(n.id, new Set()));
    data.links.forEach(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source as string;
      const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target as string;
      map.get(sourceId)?.add(targetId);
      map.get(targetId)?.add(sourceId);
    });
    return map;
  }, [data]);

  const getNodeColor = useCallback((node: GraphNode) => {
    if (node.color) return node.color;
    switch (node.type) {
      case 'region': return '#ff7a59'; // Cam đất (Vùng miền)
      case 'ethnic_group': return '#e6194b'; // Đỏ (Dân tộc)
      case 'ceremony': return '#911eb4'; // Tím (Nghi lễ)
      case 'instrument': return '#4363d8'; // Xanh dương (Nhạc cụ)
      case 'recording': return '#3cb44b'; // Xanh lá (Bản thu)
      default: return '#999999';
    }
  }, []);

  const getNodeSize = useCallback((node: GraphNode) => {
    if (node.val) return node.val;
    switch (node.type) {
      case 'region': return 8;
      case 'ethnic_group': return 6;
      case 'ceremony': return 5;
      case 'instrument': return 4;
      case 'recording': return 3;
      default: return 3;
    }
  }, []);

  const handleNodeClick = useCallback(
    (node: object) => {
      const graphNode = node as GraphNode;
      if (onNodeClick) {
        onNodeClick(graphNode);
      }
      if (fgRef.current && graphNode.x !== undefined && graphNode.y !== undefined) {
        fgRef.current.centerAt(graphNode.x, graphNode.y, 1000);
        fgRef.current.zoom(4, 2000); 
      }
    },
    [onNodeClick]
  );
  
  const handleNodeHover = useCallback((node: object | null) => {
    setHoverNode((node as GraphNode) || null);
  }, []);

  const getLinkColor = useCallback((link: any) => {
    const isHoveredNodeRelated = hoverNode && (link.source.id === hoverNode.id || link.target.id === hoverNode.id);
    if (!hoverNode) return link.color || '#cbd5e1'; 
    return isHoveredNodeRelated ? '#64748b' : '#f1f5f9'; // Làm mờ đường liên kết không viền
  }, [hoverNode]);

  // Custom painter
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 14 / globalScale;
    const nodeR = getNodeSize(node) * 1.5;

    // Xem node này có bị làm mờ (focus mode) hay không
    const isHovered = hoverNode?.id === node.id;
    const isNeighbor = hoverNode ? neighbors.get(hoverNode.id)?.has(node.id) : false;
    const shouldDim = hoverNode && !isHovered && !isNeighbor;

    ctx.globalAlpha = shouldDim ? 0.15 : 1.0;

    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    if (globalScale > 0.8 && !shouldDim) {
        // Truncate long labels unless it's highlighted
        const maxLen = isHovered ? 40 : 25;
        const displayLabel = label.length > maxLen ? label.substring(0, maxLen - 3) + '...' : label;

        ctx.font = `${isHovered ? 'bold ' : ''}${fontSize}px Inter, Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#334155';
        
        ctx.shadowColor = "white";
        ctx.shadowBlur = 4;
        ctx.fillText(displayLabel, node.x, node.y + nodeR + 2);
        ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1.0; 
  }, [getNodeColor, getNodeSize, hoverNode, neighbors]);

  // Lắng nghe chuột di chuyển toàn container để Tooltip đi theo
  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top
        });
    }
  };

  const typeLabels: Record<string, string> = {
    'region': 'Vùng miền',
    'ethnic_group': 'Dân tộc',
    'ceremony': 'Nghi lễ',
    'instrument': 'Nhạc cụ',
    'recording': 'Bản thu'
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[500px] bg-slate-50 relative rounded-xl border border-slate-200 overflow-hidden shadow-inner"
      onMouseMove={handleMouseMove}
    >
      {width > 0 && height > 0 && (
        <ForceGraph2D
          ref={fgRef as any}
          width={width}
          height={height}
          graphData={data}
          // Tắt nodeLabel gốc để xài Custom HTML Tooltip
          // nodeLabel="name"
          nodeColor={getNodeColor as any}
          nodeVal={getNodeSize as any}
          nodeCanvasObject={paintNode}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          linkColor={getLinkColor}
          linkWidth={(link: any) => (hoverNode && (link.source.id === hoverNode.id || link.target.id === hoverNode.id)) ? 2.5 : 1.5}
          d3VelocityDecay={0.3}
          cooldownTicks={150}
        />
      )}
      
      {/* HTML Custom Tooltip Override */}
      {hoverNode && (
        <div 
          className="absolute z-10 pointer-events-none transition-opacity duration-200 bg-white shadow-xl shadow-slate-200/50 rounded-lg p-3 border border-slate-100 flex flex-col min-w-[200px]"
          style={{ top: mousePos.y + 15, left: mousePos.x + 15 }}
        >
          <div className="flex items-start gap-3">
             {hoverNode.imgUrl && (
               <div className="shrink-0">
                 <img src={hoverNode.imgUrl} alt={hoverNode.name} className="w-12 h-12 rounded object-cover border border-slate-100" />
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
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {hoverNode.desc}
                  </p>
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
            <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
            <p className="font-medium">Không có dữ liệu đồ thị</p>
         </div>
      )}
    </div>
  );
};

export default KnowledgeGraphViewer;
