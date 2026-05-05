import { ChevronLeft, ChevronRight, Cloud, Laptop, Loader2, Network, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import KnowledgeGraphViewer from '@/features/knowledge-graph/components/KnowledgeGraphViewer';
import {
  useKnowledgeGraphExplore,
  useKnowledgeGraphOverview,
  useKnowledgeGraphSearch,
  useKnowledgeGraphStats,
} from '@/features/knowledge-graph/hooks';
import { pickFocusDefaultNode } from '@/features/knowledge-graph/utils/graphViewerHelpers';
import {
  apiEntityTypeToViewerType,
  apiTypesQueryForTab,
  enrichGraphWithDegreeVal,
  getRecordingNeighborNodesInGraph,
  getRelatedRecordings,
  nodeMatchesListSelection,
  resolveKnowledgeGraphExploreNodeId,
  tabMatchesViewerType,
  type ResearcherGraphSelection,
  type ResearcherGraphTabView,
  viewerTypeToApiEntityType,
} from '@/features/knowledge-graph/utils/researcherGraphUx';
import { useDebounce } from '@/hooks/useDebounce';
import type { Recording } from '@/types';
import type { GraphNode } from '@/types/graph';
import type { KnowledgeGraphData } from '@/types/graph';

const TAB_CLASS =
  'px-2.5 py-1.5 rounded-lg font-medium text-xs cursor-pointer transition-colors whitespace-nowrap';
const TAB_ACTIVE = 'bg-primary-600 text-white shadow-sm';
const TAB_IDLE = 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200';

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'EthnicGroup', label: 'Dân tộc' },
  { value: 'Instrument', label: 'Nhạc cụ' },
  { value: 'Ceremony', label: 'Nghi lễ' },
  { value: 'Recording', label: 'Bản thu' },
  { value: 'Province', label: 'Địa phương' },
];

export interface ResearcherPortalGraphTabProps {
  fallbackGraphData: KnowledgeGraphData;
  approvedRecordings: Recording[];
  onRecordingDetail: (recording: Recording) => void;
}

function normalizeLabel(s: string): string {
  return s.trim().toLowerCase();
}

export default function ResearcherPortalGraphTab({
  fallbackGraphData,
  approvedRecordings,
  onRecordingDetail,
}: ResearcherPortalGraphTabProps) {
  const [graphView, setGraphView] = useState<ResearcherGraphTabView>('overview');
  const [listQuery, setListQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selection, setSelection] = useState<ResearcherGraphSelection>(null);
  const [exploreTarget, setExploreTarget] = useState<{ id: string; type: string } | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const lastGoodGraphRef = useRef<KnowledgeGraphData | null>(null);

  const debouncedListQuery = useDebounce(listQuery, 350);

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

  useEffect(() => {
    setSelection(null);
    setExploreTarget(null);
  }, [graphView]);

  const baseApiGraph = useMemo(() => {
    if (overview.isSuccess && overview.data?.graph.nodes.length) return overview.data.graph;
    return null;
  }, [overview.isSuccess, overview.data]);

  const displayGraph: KnowledgeGraphData = useMemo(() => {
    if (exploreTarget && explore.isSuccess && explore.data?.graph.nodes.length) {
      const graph = enrichGraphWithDegreeVal(explore.data.graph);
      lastGoodGraphRef.current = graph;
      return graph;
    }
    if (exploreTarget && explore.isSuccess && !explore.data?.graph.nodes.length && lastGoodGraphRef.current) {
      return lastGoodGraphRef.current;
    }
    if (exploreTarget && (explore.isLoading || explore.isError) && lastGoodGraphRef.current) {
      return lastGoodGraphRef.current;
    }
    const graph = baseApiGraph
      ? enrichGraphWithDegreeVal(baseApiGraph)
      : enrichGraphWithDegreeVal(fallbackGraphData);
    lastGoodGraphRef.current = graph;
    return graph;
  }, [exploreTarget, explore.isSuccess, explore.isLoading, explore.isError, explore.data, baseApiGraph, fallbackGraphData]);

  useEffect(() => {
    if (selection !== null || exploreTarget !== null) return;
    if (!displayGraph.nodes.length) return;
    const node = pickFocusDefaultNode(displayGraph, (n) => tabMatchesViewerType(graphView, n.type));
    if (!node) return;
    const apiType = node.apiEntityType ?? viewerTypeToApiEntityType(node.type);
    setSelection({ source: 'graph', id: node.id, apiEntityType: apiType, label: node.name, viewerType: node.type });
  }, [displayGraph, graphView, selection, exploreTarget]);

  const dataSourceKind = useMemo<'api' | 'local' | 'explore'>(() => {
    if (exploreTarget && explore.isSuccess && explore.data?.graph.nodes.length) return 'explore';
    if (baseApiGraph) return 'api';
    return 'local';
  }, [exploreTarget, explore.isSuccess, explore.data, baseApiGraph]);

  const dataSourceBadge = useMemo(() => {
    if (dataSourceKind === 'explore') {
      return {
        Icon: Network,
        label: 'Mở rộng',
        className: 'text-blue-800 bg-blue-50/95 border-blue-200/90 shadow-sm',
      } as const;
    }
    if (dataSourceKind === 'api') {
      return {
        Icon: Cloud,
        label: 'API',
        className: 'text-emerald-900 bg-emerald-50/95 border-emerald-200/90 shadow-sm',
      } as const;
    }
    return {
      Icon: Laptop,
      label: 'Cục bộ',
      className: 'text-amber-900 bg-amber-50/95 border-amber-200/90 shadow-sm',
    } as const;
  }, [dataSourceKind]);

  const GraphDataSourceIcon = dataSourceBadge.Icon;

  const listNodesFromGraph = useMemo(() => {
    const q = normalizeLabel(listQuery);
    return displayGraph.nodes
      .filter((n) => tabMatchesViewerType(graphView, n.type))
      .filter((n) => !q || normalizeLabel(n.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [displayGraph.nodes, graphView, listQuery]);

  const refreshAll = useCallback(() => {
    overview.refetch();
    stats.refetch();
    setExploreTarget(null);
    search.refetch();
  }, [overview, stats, search]);

  const busy = overview.isLoading || explore.isLoading;
  const exploreInFlight = explore.isLoading && Boolean(exploreTarget);

  const handleGraphNodeClick = useCallback((node: GraphNode) => {
    const apiType = node.apiEntityType ?? viewerTypeToApiEntityType(node.type);
    setSelection({ source: 'graph', id: node.id, apiEntityType: apiType, label: node.name, viewerType: node.type });
    const exploreId = resolveKnowledgeGraphExploreNodeId(node);
    if (exploreId) setExploreTarget({ id: exploreId, type: apiType });
    else setExploreTarget(null);
  }, []);

  const handleSearchResultClick = useCallback((hit: { id: string; type: string; label: string }) => {
    setSelection({ source: 'graph', id: hit.id, apiEntityType: hit.type, label: hit.label, viewerType: apiEntityTypeToViewerType(hit.type) });
    setExploreTarget({ id: hit.id, type: hit.type });
  }, []);

  const handleListNodeClick = useCallback((n: GraphNode) => {
    const apiType = n.apiEntityType ?? viewerTypeToApiEntityType(n.type);
    setSelection({ source: 'list', viewerType: n.type, name: n.name, id: n.id });
    const exploreId = resolveKnowledgeGraphExploreNodeId(n);
    if (exploreId) setExploreTarget({ id: exploreId, type: apiType });
    else setExploreTarget(null);
  }, []);

  const selectedNodeId = useMemo(() => {
    if (!selection) return null;
    return selection.source === 'graph' ? selection.id : (selection.id ?? null);
  }, [selection]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const stillExists = displayGraph.nodes.some((n) => n.id === selectedNodeId);
    if (stillExists) return;
    const node = pickFocusDefaultNode(displayGraph, (n) => tabMatchesViewerType(graphView, n.type));
    if (node) {
      const apiType = node.apiEntityType ?? viewerTypeToApiEntityType(node.type);
      setSelection({ source: 'graph', id: node.id, apiEntityType: apiType, label: node.name, viewerType: node.type });
    } else {
      setSelection(null);
    }
  }, [displayGraph, selectedNodeId, graphView]);

  const related = useMemo(() => getRelatedRecordings(approvedRecordings, selection), [approvedRecordings, selection]);

  const graphRecordingNeighbors = useMemo(() => {
    if (!selection) return [];
    const sid = selection.source === 'graph'
      ? selection.id
      : (selection.id ?? displayGraph.nodes.find((n) => n.type === selection.viewerType && n.name === selection.name)?.id ?? null);
    if (!sid) return [];
    return getRecordingNeighborNodesInGraph(displayGraph, sid, 5);
  }, [displayGraph, selection]);

  const overviewErrorBanner =
    overview.isError && !baseApiGraph ? (
      <p className={`text-xs rounded-lg px-3 py-1.5 mb-2 border ${fallbackGraphData.nodes.length > 0 ? 'text-amber-700 bg-amber-50/80 border-amber-200' : 'text-red-700 bg-red-50 border-red-200'
        }`}>
        {fallbackGraphData.nodes.length > 0 ? 'Dùng dữ liệu cục bộ.' : 'Không tải được. Nhấn Làm mới.'}
      </p>
    ) : null;

  const exploreErrorBanner =
    explore.isError && exploreTarget ? (
      <p className="text-xs text-red-600 bg-red-50/80 border border-red-200 rounded-lg px-3 py-1.5 mb-2">
        Không mở rộng được nút. Thử nút khác.
      </p>
    ) : null;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-sm backdrop-blur-sm p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base sm:text-lg font-semibold text-primary-800">Biểu đồ tri thức</h2>
          <button
            type="button"
            onClick={refreshAll}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 shadow-sm hover:bg-primary-50 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
            Làm mới
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3" role="tablist" aria-label="Chế độ đồ thị">
          {([['overview', 'Tổng quan'], ['instruments', 'Nhạc cụ'], ['ethnicity', 'Dân tộc'], ['ceremony', 'Nghi lễ'], ['recordings', 'Bản thu']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={graphView === id}
              className={`${TAB_CLASS} ${graphView === id ? TAB_ACTIVE : TAB_IDLE}`}
              onClick={() => setGraphView(id)}
            >{label}</button>
          ))}
        </div>

        {overviewErrorBanner}
        {exploreErrorBanner}

        {/* ── 3-col: list / graph / detail ──────────────────────────── */}
        <div className="flex gap-3 mt-3">
          {/* Left panel — collapsible */}
          {leftOpen ? (
            <aside className="w-[11.5rem] shrink-0 rounded-xl border border-neutral-200/80 bg-white/90 p-2 flex flex-col max-h-[min(500px,64vh)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
                  <input type="search" value={listQuery} onChange={(e) => setListQuery(e.target.value)}
                    placeholder="Tìm nút..."
                    className="w-full rounded-md border border-neutral-200 bg-white py-1.5 pl-7 pr-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none"
                    aria-label="Tìm kiếm nút" />
                </div>
                <button type="button" onClick={() => setLeftOpen(false)} className="ml-1 p-1 rounded hover:bg-neutral-100 text-neutral-400" title="Thu gọn">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="mb-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">
                {TYPE_FILTER_OPTIONS.map((o) => <option key={o.value || '_'} value={o.value}>{o.label}</option>)}
              </select>
              <ul className="flex-1 overflow-y-auto space-y-px text-xs min-h-[80px]">
                {debouncedListQuery.trim().length >= 1 ? (
                  search.isLoading ? (
                    <li className="flex items-center gap-1.5 text-neutral-400 py-3 px-2"><Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />Đang tìm...</li>
                  ) : search.isError ? (
                    <li className="text-red-500 text-[11px] px-2 py-2">Lỗi. Thử lại.</li>
                  ) : !search.data?.length ? (
                    <li className="text-neutral-400 text-[11px] px-2 py-2">Không có kết quả.</li>
                  ) : (
                    search.data.map((hit) => {
                      const active = selection?.source === 'graph' && selection.id === hit.id && selection.apiEntityType === hit.type;
                      return (
                        <li key={`${hit.type}-${hit.id}`}>
                          <button type="button" onClick={() => handleSearchResultClick(hit)}
                            className={`w-full truncate text-left px-2 py-1 rounded-md transition-colors ${active ? 'bg-primary-100 text-primary-900 font-semibold' : 'hover:bg-neutral-50'}`}
                            title={hit.label}>
                            <span className="text-[9px] uppercase text-neutral-400 block leading-none mb-px">{hit.type}</span>
                            {hit.label}
                          </button>
                        </li>
                      );
                    })
                  )
                ) : listNodesFromGraph.length === 0 ? (
                  <li className="text-neutral-400 text-[11px] px-2 py-2">Trống.</li>
                ) : (
                  listNodesFromGraph.map((n) => {
                    const active = nodeMatchesListSelection(selection, n);
                    return (
                      <li key={n.id}>
                        <button type="button" onClick={() => handleListNodeClick(n)}
                          className={`w-full truncate text-left px-2 py-1 rounded-md transition-colors ${active ? 'bg-primary-100 text-primary-900 font-semibold' : 'hover:bg-neutral-50'}`}
                          title={n.name}>{n.name}</button>
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>
          ) : (
            <button type="button" onClick={() => setLeftOpen(true)}
              className="shrink-0 self-start mt-1 p-1 rounded-lg border border-neutral-200 bg-white/90 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 shadow-sm"
              title="Mở danh sách">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Graph */}
          <section className="flex-1 min-w-0 relative min-h-[min(480px,64vh)] rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
            {busy && (
              <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[11px] text-neutral-500 shadow-sm border border-neutral-200">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                {exploreInFlight ? 'Mở rộng...' : 'Tải...'}
              </div>
            )}
            {exploreInFlight && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 backdrop-blur-[1px] pointer-events-none">
                <div className="flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 shadow border border-neutral-200 text-xs font-medium text-neutral-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600 shrink-0" aria-hidden />
                  Đang mở rộng...
                </div>
              </div>
            )}
            <div
              className={`absolute left-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold tracking-tight ${dataSourceBadge.className}`}
              title="Nguồn dữ liệu đồ thị"
            >
              <GraphDataSourceIcon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              <span>
                {dataSourceBadge.label}
                <span className="font-medium text-neutral-600"> · {displayGraph.nodes.length} nút</span>
              </span>
            </div>
            <div className="w-full h-[min(560px,68vh)] min-h-[min(420px,55vh)] pt-9">
              <KnowledgeGraphViewer
                data={displayGraph}
                onNodeClick={handleGraphNodeClick}
                selectedNodeId={selectedNodeId}
                maxNodes={100}
                compactLayout={!exploreTarget}
                tabFilter={graphView}
              />
            </div>
          </section>

          {/* Right detail */}
          <aside className="w-44 shrink-0 rounded-xl border border-neutral-200/80 bg-white/95 p-2.5 flex flex-col gap-2 min-h-[200px] max-h-[min(500px,64vh)] overflow-y-auto">
            <h3 className="text-xs font-semibold text-primary-800 border-b border-neutral-100 pb-1.5">Chi tiết</h3>
            {!selection ? (
              <p className="text-xs text-neutral-400">Chọn nút trên đồ thị.</p>
            ) : (
              <div className="text-xs space-y-1.5">
                <p className="font-semibold text-neutral-900 break-words leading-snug">
                  {selection.source === 'graph' ? selection.label : selection.name}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {selection.source === 'graph' ? selection.apiEntityType : viewerTypeToApiEntityType(selection.viewerType)}
                </p>
                {selection.source === 'graph' && !exploreTarget && (
                  <button
                    type="button"
                    className="w-full rounded-md border border-primary-200 bg-primary-50/80 px-2 py-1.5 text-[11px] font-semibold text-primary-800 hover:bg-primary-100/90"
                    onClick={() => {
                      const node = displayGraph.nodes.find((x) => x.id === selection.id);
                      const exploreId = node ? resolveKnowledgeGraphExploreNodeId(node) : null;
                      if (!exploreId) return;
                      setExploreTarget({
                        id: exploreId,
                        type: selection.apiEntityType ?? viewerTypeToApiEntityType(selection.viewerType),
                      });
                    }}
                  >
                    Mở rộng quanh nút (API)
                  </button>
                )}
                {exploreTarget && (
                  <button type="button" className="text-[11px] font-medium text-primary-600 hover:underline"
                    onClick={() => setExploreTarget(null)}>
                    ← Tổng quan
                  </button>
                )}
              </div>
            )}

            <div className="border-t border-neutral-100 pt-2 mt-auto space-y-2">
              <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Bản thu liên quan</h4>
              {!selection ? (
                <p className="text-[11px] text-neutral-400">Chọn nút để xem.</p>
              ) : (
                <>
                  {graphRecordingNeighbors.length > 0 && (
                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                      {graphRecordingNeighbors.map((gn) => {
                        const lookupId = gn.backendId ?? gn.id;
                        const rec = approvedRecordings.find(
                          (r) => r.id === lookupId || r.id === gn.id || `rec_${r.id}` === gn.id,
                        );
                        return (
                          <li key={gn.id}>
                            {rec ? (
                              <button type="button" onClick={() => onRecordingDetail(rec)}
                                className="w-full text-left text-[11px] px-1.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-neutral-800 truncate">
                                {rec.title}
                              </button>
                            ) : (
                              <span className="block text-[11px] text-neutral-500 px-1.5 py-0.5 truncate">{gn.name}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {related.length > 0 && (
                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                      {related.slice(0, 5).map((r) => (
                        <li key={r.id}>
                          <button type="button" onClick={() => onRecordingDetail(r)}
                            className="w-full text-left text-[11px] px-1.5 py-1 rounded-md bg-primary-50/60 hover:bg-primary-100 text-primary-900 truncate">
                            {r.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {graphRecordingNeighbors.length === 0 && related.length === 0 && (
                    <p className="text-[11px] text-neutral-400">Chưa có bản thu liên quan.</p>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ── Compact stats bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-neutral-200/80 bg-white/80 px-4 py-2 text-[11px] text-neutral-600">
        {stats.isSuccess && stats.data ? (
          <>
            <Stat label="Dân tộc" value={stats.data.totalEthnicGroups} />
            <Stat label="Nhạc cụ" value={stats.data.totalInstruments} />
            <Stat label="Nghi lễ" value={stats.data.totalCeremonies} />
            <Stat label="Bản thu" value={stats.data.totalRecordings} />
            <Stat label="Cạnh" value={stats.data.totalEdges} />
            <Stat label="Hiển thị" value={displayGraph.nodes.length} />
          </>
        ) : (
          <>
            <Stat label="Nút" value={displayGraph.nodes.length} />
            <Stat label="Cạnh" value={displayGraph.links.length} />
            {stats.isError && <span className="text-red-400">Thống kê lỗi</span>}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <span>
      <span className="text-neutral-400">{label}</span>{' '}
      <span className="font-semibold text-neutral-800">{value}</span>
    </span>
  );
}
