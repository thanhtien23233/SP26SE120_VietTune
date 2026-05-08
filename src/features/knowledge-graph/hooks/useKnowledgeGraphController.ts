/**
 * Phase 3 — Knowledge Graph Controller
 *
 * Single-source-of-truth hook that owns graph state (selection, exploreTarget, history, merged
 * subgraph cache) and exposes derived selectors so consumer components can stay thin.
 *
 * Replaces the in-component state previously hosted by `ResearcherPortalGraphTab.tsx`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useKnowledgeGraphExplore,
  useKnowledgeGraphOverview,
  useKnowledgeGraphSearch,
  useKnowledgeGraphStats,
} from '@/features/knowledge-graph/hooks';
import { pickFocusDefaultNode } from '@/features/knowledge-graph/utils/graphViewerHelpers';
import {
  computeKgIntelligence,
  observationsForNode,
  type SemanticMode,
} from '@/features/knowledge-graph/utils/kgIntelligence';
import {
  apiEntityTypeToViewerType,
  apiTypesQueryForTab,
  enrichGraphWithDegreeVal,
  getRecordingNeighborNodesInGraph,
  getRelatedRecordings,
  resolveKnowledgeGraphExploreNodeId,
  tabMatchesViewerType,
  viewerTypeToApiEntityType,
  type ResearcherGraphSelection,
  type ResearcherGraphTabView,
} from '@/features/knowledge-graph/utils/researcherGraphUx';
import { useDebounce } from '@/hooks/useDebounce';
import type { Recording } from '@/types';
import type { GraphLink, GraphNode, KnowledgeGraphData } from '@/types/graph';

/** A single step in the exploration breadcrumb trail. */
export interface ExploreHistoryStep {
  /** API entity GUID used by `/explore`. */
  entityId: string;
  /** API Pascal entity type (`Recording`, `EthnicGroup`, …). */
  entityType: string;
  /** Display label captured at click time. */
  label: string;
  /** Viewer node id (`${Type}:${guid}`) for stable selection. */
  viewerNodeId: string;
}

export interface KnowledgeGraphControllerOptions {
  fallbackGraphData: KnowledgeGraphData;
  approvedRecordings: Recording[];
}

const buildExploreKey = (entityId: string, entityType: string): string =>
  `${entityType}:${entityId}`;

/**
 * Diff-merge two subgraphs into a stable union (no flicker, deterministic ordering).
 * Existing nodes retain their force-graph runtime fields (x/y/vx/vy) by reference.
 */
export function mergeSubgraph(
  acc: KnowledgeGraphData,
  next: KnowledgeGraphData,
): KnowledgeGraphData {
  if (!acc.nodes.length) return { nodes: [...next.nodes], links: [...next.links] };
  const nodeMap = new Map<string, GraphNode>();
  for (const n of acc.nodes) nodeMap.set(n.id, n);
  for (const n of next.nodes) {
    if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
    else {
      const ext = nodeMap.get(n.id)!;
      ext.val = Math.max(ext.val ?? 0, n.val ?? 0);
      if (!ext.entityId && n.entityId) ext.entityId = n.entityId;
      if (!ext.entityType && n.entityType) ext.entityType = n.entityType;
      if (!ext.explorable && n.explorable) ext.explorable = n.explorable;
    }
  }
  const linkKey = (l: GraphLink) => {
    const s = typeof l.source === 'string' ? l.source : l.source.id;
    const t = typeof l.target === 'string' ? l.target : l.target.id;
    const lo = s < t ? s : t;
    const hi = s < t ? t : s;
    return `${lo}\0${hi}\0${l.type}`;
  };
  const linkSeen = new Set<string>();
  const links: GraphLink[] = [];
  for (const l of [...acc.links, ...next.links]) {
    const k = linkKey(l);
    if (linkSeen.has(k)) continue;
    linkSeen.add(k);
    links.push(l);
  }
  return { nodes: Array.from(nodeMap.values()), links };
}

export function useKnowledgeGraphController({
  fallbackGraphData,
  approvedRecordings,
}: KnowledgeGraphControllerOptions) {
  // ── Tab + filters ───────────────────────────────────────────────────
  const [graphView, setGraphView] = useState<ResearcherGraphTabView>('overview');
  const [listQuery, setListQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // ── Selection + exploration ─────────────────────────────────────────
  const [selection, setSelection] = useState<ResearcherGraphSelection>(null);
  const [exploreTarget, setExploreTarget] = useState<{ id: string; type: string } | null>(null);
  const [history, setHistory] = useState<ExploreHistoryStep[]>([]);

  // ── Sidebar collapse state (UX) ─────────────────────────────────────
  const [leftOpen, setLeftOpen] = useState(true);

  // ── Phase 4: semantic mode (focus by relation kind) ─────────────────
  const [semanticMode, setSemanticMode] = useState<SemanticMode>('free');

  const debouncedListQuery = useDebounce(listQuery, 350);

  /** Cache of subgraphs keyed by `${type}:${guid}` so revisits are instant + merged. */
  const subgraphCacheRef = useRef<Map<string, KnowledgeGraphData>>(new Map());
  /** Accumulated merged subgraph as the user explores. Reset on tab/overview. */
  const mergedSubgraphRef = useRef<KnowledgeGraphData>({ nodes: [], links: [] });
  const [mergedTick, setMergedTick] = useState(0);

  const overview = useKnowledgeGraphOverview({ maxNodes: 100, cacheTtlMs: 45_000 });
  const stats = useKnowledgeGraphStats({ cacheTtlMs: 90_000 });

  const searchTypesParam = (typeFilter || apiTypesQueryForTab(graphView)) || undefined;
  const search = useKnowledgeGraphSearch({
    query: debouncedListQuery,
    types: searchTypesParam,
    limit: 40,
    enabled: debouncedListQuery.trim().length >= 1,
    minQueryLength: 1,
  });

  const explore = useKnowledgeGraphExplore({
    nodeId: exploreTarget?.id ?? '',
    nodeType: exploreTarget?.type ?? '',
    depth: 2,
    maxNodes: 80,
    enabled: Boolean(exploreTarget?.id && exploreTarget?.type),
  });

  // Reset selection + history when the user switches tab.
  useEffect(() => {
    setSelection(null);
    setExploreTarget(null);
    setHistory([]);
    mergedSubgraphRef.current = { nodes: [], links: [] };
    subgraphCacheRef.current.clear();
    setMergedTick((t) => t + 1);
  }, [graphView]);

  // Merge each successful explore response into the accumulated subgraph.
  useEffect(() => {
    if (!exploreTarget) return;
    if (!explore.isSuccess) return;
    const fresh = explore.data?.graph;
    if (!fresh || !fresh.nodes.length) return;
    const key = buildExploreKey(exploreTarget.id, exploreTarget.type);
    subgraphCacheRef.current.set(key, fresh);
    mergedSubgraphRef.current = mergeSubgraph(mergedSubgraphRef.current, fresh);
    setMergedTick((t) => t + 1);
  }, [exploreTarget, explore.isSuccess, explore.data]);

  const baseApiGraph = useMemo(() => {
    if (overview.isSuccess && overview.data?.graph.nodes.length) return overview.data.graph;
    return null;
  }, [overview.isSuccess, overview.data]);

  /**
   * Display graph: in overview mode → API overview (or fallback). In explore mode →
   * accumulated diff-merged subgraph (Phase 3) so users keep their context as they navigate.
   */
  const displayGraph: KnowledgeGraphData = useMemo(() => {
    if (exploreTarget && mergedSubgraphRef.current.nodes.length) {
      return enrichGraphWithDegreeVal(mergedSubgraphRef.current);
    }
    if (exploreTarget && explore.isSuccess && explore.data?.graph.nodes.length) {
      return enrichGraphWithDegreeVal(explore.data.graph);
    }
    return baseApiGraph
      ? enrichGraphWithDegreeVal(baseApiGraph)
      : enrichGraphWithDegreeVal(fallbackGraphData);
    // mergedTick triggers re-evaluation of mergedSubgraphRef.current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreTarget, explore.isSuccess, explore.data, baseApiGraph, fallbackGraphData, mergedTick]);

  const dataSourceKind: 'api' | 'local' | 'explore' = useMemo(() => {
    if (exploreTarget && (mergedSubgraphRef.current.nodes.length || explore.isSuccess)) return 'explore';
    if (baseApiGraph) return 'api';
    return 'local';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreTarget, explore.isSuccess, baseApiGraph, mergedTick]);

  // Auto-select a sensible default when nothing is selected.
  useEffect(() => {
    if (selection !== null || exploreTarget !== null) return;
    if (!displayGraph.nodes.length) return;
    const node = pickFocusDefaultNode(displayGraph, (n) => tabMatchesViewerType(graphView, n.type));
    if (!node) return;
    const apiType = node.entityType ?? node.apiEntityType ?? viewerTypeToApiEntityType(node.type);
    setSelection({
      source: 'graph',
      id: node.id,
      apiEntityType: apiType,
      label: node.name,
      viewerType: node.type,
    });
  }, [displayGraph, graphView, selection, exploreTarget]);

  // If selection no longer exists in display graph (subgraph swap), pick a new default.
  useEffect(() => {
    if (!selection) return;
    const sid = selection.source === 'graph' ? selection.id : selection.id;
    if (!sid) return;
    const stillExists = displayGraph.nodes.some((n) => n.id === sid);
    if (stillExists) return;
    const node = pickFocusDefaultNode(displayGraph, (n) => tabMatchesViewerType(graphView, n.type));
    if (node) {
      const apiType = node.entityType ?? node.apiEntityType ?? viewerTypeToApiEntityType(node.type);
      setSelection({
        source: 'graph',
        id: node.id,
        apiEntityType: apiType,
        label: node.name,
        viewerType: node.type,
      });
    } else {
      setSelection(null);
    }
  }, [displayGraph, graphView, selection]);

  // ── Derived collections ─────────────────────────────────────────────
  const listNodesFromGraph = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return displayGraph.nodes
      .filter((n) => tabMatchesViewerType(graphView, n.type))
      .filter((n) => !q || n.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [displayGraph.nodes, graphView, listQuery]);

  const related = useMemo(
    () => getRelatedRecordings(approvedRecordings, selection),
    [approvedRecordings, selection],
  );

  const graphRecordingNeighbors = useMemo(() => {
    if (!selection) return [];
    const sid =
      selection.source === 'graph'
        ? selection.id
        : selection.id ??
          displayGraph.nodes.find((n) => n.type === selection.viewerType && n.name === selection.name)
            ?.id ??
          null;
    if (!sid) return [];
    return getRecordingNeighborNodesInGraph(displayGraph, sid, 5);
  }, [displayGraph, selection]);

  const selectedNodeId = useMemo(() => {
    if (!selection) return null;
    return selection.source === 'graph' ? selection.id : selection.id ?? null;
  }, [selection]);

  // ── Imperative actions ──────────────────────────────────────────────
  const pushHistoryFromNode = useCallback((node: GraphNode, exploreId: string, apiType: string) => {
    setHistory((prev) => {
      const next: ExploreHistoryStep = {
        entityId: exploreId,
        entityType: apiType,
        label: node.name,
        viewerNodeId: node.id,
      };
      // Avoid pushing duplicate consecutive step.
      if (prev.length && prev[prev.length - 1].viewerNodeId === next.viewerNodeId) return prev;
      return [...prev, next];
    });
  }, []);

  const handleGraphNodeClick = useCallback(
    (node: GraphNode) => {
      const apiType = node.entityType ?? node.apiEntityType ?? viewerTypeToApiEntityType(node.type);
      setSelection({
        source: 'graph',
        id: node.id,
        apiEntityType: apiType,
        label: node.name,
        viewerType: node.type,
      });
      const exploreId = resolveKnowledgeGraphExploreNodeId(node);
      if (exploreId) {
        setExploreTarget({ id: exploreId, type: apiType });
        pushHistoryFromNode(node, exploreId, apiType);
      } else {
        setExploreTarget(null);
      }
    },
    [pushHistoryFromNode],
  );

  const handleSearchResultClick = useCallback(
    (hit: { id: string; type: string; label: string }) => {
      const viewerType = apiEntityTypeToViewerType(hit.type);
      const viewerNodeId = `${hit.type}:${hit.id}`;
      setSelection({
        source: 'graph',
        id: viewerNodeId,
        apiEntityType: hit.type,
        label: hit.label,
        viewerType,
      });
      setExploreTarget({ id: hit.id, type: hit.type });
      setHistory((prev) => {
        if (prev.length && prev[prev.length - 1].viewerNodeId === viewerNodeId) return prev;
        return [
          ...prev,
          {
            entityId: hit.id,
            entityType: hit.type,
            label: hit.label,
            viewerNodeId,
          },
        ];
      });
    },
    [],
  );

  const handleListNodeClick = useCallback(
    (n: GraphNode) => {
      const apiType = n.entityType ?? n.apiEntityType ?? viewerTypeToApiEntityType(n.type);
      setSelection({ source: 'list', viewerType: n.type, name: n.name, id: n.id });
      const exploreId = resolveKnowledgeGraphExploreNodeId(n);
      if (exploreId) {
        setExploreTarget({ id: exploreId, type: apiType });
        pushHistoryFromNode(n, exploreId, apiType);
      } else {
        setExploreTarget(null);
      }
    },
    [pushHistoryFromNode],
  );

  /** Walk back to the given history index (truncate history, refocus). */
  const navigateToHistoryStep = useCallback(
    (index: number) => {
      setHistory((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        return prev.slice(0, index + 1);
      });
      const step = history[index];
      if (!step) return;
      setExploreTarget({ id: step.entityId, type: step.entityType });
      const viewerType = apiEntityTypeToViewerType(step.entityType);
      setSelection({
        source: 'graph',
        id: step.viewerNodeId,
        apiEntityType: step.entityType,
        label: step.label,
        viewerType,
      });
    },
    [history],
  );

  const navigateBack = useCallback(() => {
    if (history.length <= 1) {
      // back to overview
      setHistory([]);
      setExploreTarget(null);
      return;
    }
    navigateToHistoryStep(history.length - 2);
  }, [history.length, navigateToHistoryStep]);

  const resetToOverview = useCallback(() => {
    setHistory([]);
    setExploreTarget(null);
    mergedSubgraphRef.current = { nodes: [], links: [] };
    subgraphCacheRef.current.clear();
    setMergedTick((t) => t + 1);
  }, []);

  const expandSelected = useCallback(() => {
    if (!selection || selection.source !== 'graph') return;
    const node = displayGraph.nodes.find((x) => x.id === selection.id);
    const exploreId = node ? resolveKnowledgeGraphExploreNodeId(node) : null;
    const apiType = selection.apiEntityType ?? viewerTypeToApiEntityType(selection.viewerType);
    if (!exploreId) return;
    setExploreTarget({ id: exploreId, type: apiType });
    if (node) pushHistoryFromNode(node, exploreId, apiType);
  }, [selection, displayGraph.nodes, pushHistoryFromNode]);

  const refreshAll = useCallback(() => {
    overview.refetch();
    stats.refetch();
    resetToOverview();
    search.refetch();
  }, [overview, stats, search, resetToOverview]);

  const busy = overview.isLoading || explore.isLoading;
  const exploreInFlight = explore.isLoading && Boolean(exploreTarget);

  // ── Phase 4: intelligence selector + observations for current node ──
  const intelligence = useMemo(() => computeKgIntelligence(displayGraph), [displayGraph]);

  const selectedObservations = useMemo(
    () => observationsForNode(intelligence, selectedNodeId),
    [intelligence, selectedNodeId],
  );

  return {
    // state
    graphView,
    setGraphView,
    listQuery,
    setListQuery,
    debouncedListQuery,
    typeFilter,
    setTypeFilter,
    selection,
    selectedNodeId,
    exploreTarget,
    history,
    leftOpen,
    setLeftOpen,
    semanticMode,
    setSemanticMode,
    // derived data
    displayGraph,
    listNodesFromGraph,
    related,
    graphRecordingNeighbors,
    dataSourceKind,
    intelligence,
    selectedObservations,
    // queries
    overview,
    stats,
    search,
    explore,
    // status flags
    busy,
    exploreInFlight,
    baseApiGraph,
    // actions
    handleGraphNodeClick,
    handleSearchResultClick,
    handleListNodeClick,
    navigateBack,
    navigateToHistoryStep,
    resetToOverview,
    expandSelected,
    refreshAll,
  };
}

export type KnowledgeGraphController = ReturnType<typeof useKnowledgeGraphController>;
