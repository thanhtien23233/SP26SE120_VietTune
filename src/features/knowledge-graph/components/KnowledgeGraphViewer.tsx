import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

import {
  buildGraphDataSafe,
  buildNeighborMap,
  CANVAS_LABEL_MAX_LEN,
  CANVAS_LABEL_MAX_LEN_ACTIVE,
  clampedVisualRadius,
  isRelatedToActive,
  nodeColor,
  nodeIdOf,
  nodeSize,
  showHighImportanceLabel,
  truncateLabel,
  TYPE_LABELS,
} from '@/features/knowledge-graph/utils/graphViewerHelpers';
import {
  tabMatchesViewerType,
  type ResearcherGraphTabView,
} from '@/features/knowledge-graph/utils/researcherGraphUx';
import type { GraphLink, GraphNode, KnowledgeGraphData } from '@/types/graph';

const ZOOM_PADDING = 60;
const ZOOM_DURATION_MS = 500;
const CHARGE_COMPACT = -72;
const CHARGE_EXPANDED = -100;
/** Unrelated nodes when another node is selected / hovered */
const DIM_NODE_ALPHA = 0.15;
const FOCUS_ZOOM = 2.35;

function useContainerDimensions(myRef: React.RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const read = () => ({
      width: myRef.current?.offsetWidth ?? 0,
      height: myRef.current?.offsetHeight ?? 0,
    });
    const ro = new ResizeObserver(() => setDimensions(read()));
    if (myRef.current) {
      setDimensions(read());
      ro.observe(myRef.current);
    }
    const onWin = () => setDimensions(read());
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('resize', onWin);
      ro.disconnect();
    };
  }, [myRef]);
  return dimensions;
}

function graphLayoutKey(g: KnowledgeGraphData): string {
  if (!g.nodes.length) return '0|0';
  const ids = g.nodes.map((n) => n.id).sort().join(',');
  const es = g.links
    .map((l) => `${nodeIdOf(l.source)}>${nodeIdOf(l.target)}`)
    .sort()
    .join(',');
  return `${g.nodes.length}|${g.links.length}|${ids.slice(0, 2000)}|${es.slice(0, 2000)}`;
}

export interface KnowledgeGraphViewerProps {
  data: KnowledgeGraphData;
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
  maxNodes?: number;
  compactLayout?: boolean;
  /** Tab from researcher portal — nodes that do not belong to the tab are dimmed (overview = no extra dim). */
  tabFilter?: ResearcherGraphTabView | null;
}

type GraphLinkEdge = GraphLink & {
  source: string | GraphNode;
  target: string | GraphNode;
};

const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({
  data,
  onNodeClick,
  selectedNodeId,
  maxNodes = 100,
  compactLayout = true,
  tabFilter = 'overview',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(containerRef);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLinkEdge>>();

  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [clickPulseId, setClickPulseId] = useState<string | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ w: 200, h: 100 });

  const cleanData = useMemo(() => buildGraphDataSafe(data, maxNodes), [data, maxNodes]);
  const neighbors = useMemo(() => buildNeighborMap(cleanData), [cleanData]);

  const layoutKey = useMemo(() => graphLayoutKey(cleanData), [cleanData]);
  const pendingZoomRef = useRef(true);
  useEffect(() => { pendingZoomRef.current = true; }, [layoutKey, width, height]);

  /** Selection from parent (e.g. auto-pick) does not fire `onNodeClick` — refocus after sim assigns x/y on same node refs as `cleanData`. */
  useEffect(() => {
    if (!selectedNodeId || cleanData.nodes.length === 0) return;
    const t = window.setTimeout(() => {
      const fg = fgRef.current;
      const n = cleanData.nodes.find((x) => x.id === selectedNodeId);
      if (fg && n && typeof n.x === 'number' && typeof n.y === 'number') {
        try {
          fg.centerAt(n.x, n.y, 420);
          fg.zoom(FOCUS_ZOOM, 520);
        } catch {
          /* ignore */
        }
      }
    }, 200);
    return () => clearTimeout(t);
  }, [selectedNodeId, layoutKey, cleanData.nodes]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || cleanData.nodes.length === 0) return;

    const linkDist = compactLayout ? 22 : 36;
    const linkForce = fg.d3Force('link') as unknown as {
      distance?: (d: number | ((link: GraphLinkEdge) => number)) => unknown;
    } | undefined;
    if (linkForce?.distance) linkForce.distance(linkDist);

    /* Avoid importing `d3-force` (optional dep — missing install breaks Vite). */
    const charge = fg.d3Force('charge') as unknown as { strength?: (v: number) => unknown } | undefined;
    if (charge?.strength) charge.strength(compactLayout ? CHARGE_COMPACT : CHARGE_EXPANDED);

    fg.d3ReheatSimulation();
  }, [layoutKey, cleanData.nodes.length, compactLayout, width, height]);

  const runZoomToFit = useCallback(() => {
    const fg = fgRef.current;
    if (!fg || cleanData.nodes.length === 0) return;
    try { fg.zoomToFit(ZOOM_DURATION_MS, ZOOM_PADDING); } catch { /* ignore */ }
  }, [cleanData.nodes.length]);

  const onEngineStop = useCallback(() => {
    if (!pendingZoomRef.current) return;
    pendingZoomRef.current = false;
    requestAnimationFrame(runZoomToFit);
  }, [runZoomToFit]);

  const handleNodeClick = useCallback(
    (graphNode: GraphNode) => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      setClickPulseId(graphNode.id);
      pulseTimerRef.current = setTimeout(() => { setClickPulseId(null); pulseTimerRef.current = null; }, 480);
      onNodeClick?.(graphNode);
      if (fgRef.current && graphNode.x !== undefined && graphNode.y !== undefined) {
        fgRef.current.centerAt(graphNode.x, graphNode.y, 480);
        fgRef.current.zoom(FOCUS_ZOOM + 0.15, 560);
      }
    },
    [onNodeClick],
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => setHoverNode(node), []);

  /* ── link styling: lighter, thinner ─────────────────────────────── */

  const getLinkColor = useCallback(
    (link: GraphLinkEdge) => {
      if (!hoverNode && !selectedNodeId) return link.color || '#e2e8f0';
      const activeId = hoverNode?.id ?? selectedNodeId;
      const s = nodeIdOf(link.source);
      const t = nodeIdOf(link.target);
      return s === activeId || t === activeId ? '#94a3b8' : '#f1f5f9';
    },
    [hoverNode, selectedNodeId],
  );

  const getLinkWidth = useCallback(
    (link: unknown) => {
      const edge = link as GraphLinkEdge;
      const strength = Math.max(0.5, Math.min(3, (edge.value ?? 1) * 0.8));
      const activeId = hoverNode?.id ?? selectedNodeId;
      if (!activeId) return strength;
      const s = nodeIdOf(edge.source);
      const t = nodeIdOf(edge.target);
      if (s === activeId || t === activeId) return Math.max(strength, 1.5);
      return Math.max(0.35, strength * 0.45);
    },
    [hoverNode, selectedNodeId],
  );

  /* ── node painting ──────────────────────────────────────────────── */

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = clampedVisualRadius(node);
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;

      const isHovered = hoverNode?.id === node.id;
      const isSelected = selectedNodeId === node.id;
      const isPulse = clickPulseId === node.id;
      const activeId = hoverNode?.id ?? selectedNodeId;
      const relatedToFocus = isRelatedToActive(node.id, activeId, neighbors);
      const hasActive = Boolean(hoverNode || selectedNodeId);
      const matchesTab =
        tabFilter == null || tabFilter === 'overview' || tabMatchesViewerType(tabFilter, node.type);
      const dimForTab = !matchesTab && !isHovered && !isSelected;
      const dimForFocus =
        matchesTab && hasActive && !isHovered && !isSelected && !relatedToFocus;
      const shouldDim = dimForTab || dimForFocus;

      ctx.globalAlpha = shouldDim ? DIM_NODE_ALPHA : 1;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + 3.5 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.2 / globalScale;
        ctx.setLineDash([4 / globalScale, 3 / globalScale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isPulse) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + 7 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
        ctx.lineWidth = 1.6 / globalScale;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor(node);
      ctx.fill();
      ctx.strokeStyle = isSelected || isPulse ? '#2563eb' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = (isSelected || isPulse ? 2 : 1) / globalScale;
      ctx.stroke();

      /* Labels: selected, hovered, or high importance (val / degree) only */
      const degree = neighbors.get(node.id)?.size ?? 0;
      const highImportance = showHighImportanceLabel(node, degree);
      const showLabel = isHovered || isSelected || highImportance;
      const labelDimmed = shouldDim && highImportance && !isHovered && !isSelected;
      if (showLabel && globalScale > 0.55 && (!shouldDim || isHovered || isSelected || highImportance)) {
        const maxLen = isHovered || isSelected ? CANVAS_LABEL_MAX_LEN_ACTIVE : CANVAS_LABEL_MAX_LEN;
        const fontSize = 11 / globalScale;
        ctx.font = `${isHovered || isSelected ? '600 ' : ''}${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = labelDimmed ? '#64748b' : isHovered || isSelected ? '#0f172a' : '#475569';
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 3;
        ctx.fillText(truncateLabel(node.name, maxLen), nx, ny + r + 2);
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
    },
    [hoverNode, selectedNodeId, clickPulseId, neighbors, tabFilter],
  );

  /* ── pointer area: larger than visual node for easier clicking ──── */

  const paintPointerArea = useCallback(
    (node: GraphNode, paintColor: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = clampedVisualRadius(node);
      const hitR = Math.max(r + 6 / globalScale, 10 / globalScale);
      ctx.fillStyle = paintColor;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, hitR, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMousePos({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
  }, []);

  useLayoutEffect(() => {
    if (!hoverNode) return;
    const el = tooltipRef.current;
    if (!el) return;
    const read = () => {
      setTooltipSize({ w: el.offsetWidth, h: el.offsetHeight });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hoverNode]);

  useEffect(() => () => { if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); }, []);

  const tooltipPad = 8;
  const tooltipOffset = 12;
  const tooltipTop =
    height > 0
      ? Math.min(mousePos.y + tooltipOffset, Math.max(tooltipPad, height - tooltipSize.h - tooltipPad))
      : 0;
  const tooltipLeft =
    width > 0
      ? Math.min(mousePos.x + tooltipOffset, Math.max(tooltipPad, width - tooltipSize.w - tooltipPad))
      : 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-0 bg-slate-50 relative rounded-xl border border-slate-200 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {width > 0 && height > 0 && cleanData.nodes.length > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={width}
          height={height}
          graphData={cleanData}
          nodeColor={nodeColor}
          nodeVal={nodeSize}
          nodeCanvasObjectMode="replace"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkDirectionalParticles={0}
          d3VelocityDecay={0.38}
          d3AlphaDecay={0.045}
          warmupTicks={50}
          cooldownTicks={90}
          onEngineStop={onEngineStop}
          enableNodeDrag
          minZoom={0.3}
          maxZoom={10}
        />
      )}

      {hoverNode && (
        <div
          ref={tooltipRef}
          className="absolute z-10 pointer-events-none bg-white/95 shadow-md rounded-lg px-3 py-2.5 border border-slate-100 flex flex-col min-w-[180px] max-w-[260px]"
          style={{
            top: tooltipTop,
            left: tooltipLeft,
          }}
          role="tooltip"
        >
          <div className="flex items-start gap-2">
            {hoverNode.imgUrl && (
              <img
                src={hoverNode.imgUrl}
                alt=""
                className="w-9 h-9 rounded object-cover border border-slate-100 shrink-0"
                onLoad={() => {
                  const el = tooltipRef.current;
                  if (el) setTooltipSize({ w: el.offsetWidth, h: el.offsetHeight });
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                {TYPE_LABELS[hoverNode.type] || hoverNode.type}
              </p>
              <p className="font-semibold text-slate-800 text-[13px] leading-snug break-words">{hoverNode.name}</p>
            </div>
          </div>
          <div className="mt-1.5 pt-1 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
            <span>{neighbors.get(hoverNode.id)?.size ?? 0} liên kết</span>
            <span className="text-blue-500 font-medium">Nhấn để xem</span>
          </div>
        </div>
      )}

      {cleanData.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none px-6 text-center">
          <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
          <p className="text-sm font-medium text-slate-500">Không có dữ liệu</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphViewer;
