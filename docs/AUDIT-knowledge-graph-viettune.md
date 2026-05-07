# Knowledge Graph Audit — VietTune

> **Scope:** `features/knowledge-graph/**`, `components/researcher/ResearcherPortalGraphTab.tsx`, `pages/researcher/ResearcherPortalPage.tsx`, `services/knowledgeGraphService.ts`, `types/graph.ts`, `types/knowledgeGraphApi.ts`
>
> **Files inspected:** 18 source + 5 test files (~1 500 LoC production)

---

## 1. Critical Bug List

### A. Runtime Bugs

| # | Bug | Location | Evidence |
|---|-----|----------|----------|
| A1 | **Selected node dangles after graph swap** | [`ResearcherPortalGraphTab.tsx:117-124`](src/components/researcher/ResearcherPortalGraphTab.tsx#L117-L124) | `pickFocusDefaultNode` only runs when `selection === null`. When explore succeeds and the graph swaps to a new subgraph, the old `selectedNodeId` may no longer exist in `displayGraph.nodes`. The viewer still receives it, causing a stale blue-ring on a phantom position and the detail panel showing info for a node the user cannot see. |
| A2 | **`enrichGraphWithDegreeVal` creates shallow clones with growing `val`** | [`researcherGraphUx.ts:118-122`](src/features/knowledge-graph/utils/researcherGraphUx.ts#L118-L122) | `val: 2 + Math.min(deg …)` is fine in isolation, but it runs on every `useMemo` re-derive. When the `overview` data reference is stable but `fallbackGraphData` rebuilds (new recordings array ref), val accumulates across renders via `addNode` merging in [`useKnowledgeGraphData.ts:69`](src/features/knowledge-graph/hooks/useKnowledgeGraphData.ts#L69). This is a latent re-render amplifier — not a crash, but inflates node sizes unpredictably. |
| A3 | **No guard for empty node list in `graphLayoutKey`** | [`KnowledgeGraphViewer.tsx:51`](src/features/knowledge-graph/components/KnowledgeGraphViewer.tsx#L51) | Returns `'0|0'` for empty — ✅ safe. But `sort().join(',')` on 100+ GUIDs produces a massive string every render; capped at 2000 chars, so bounded but could be optimized. **Low risk.** |

### B. Data Contract Bugs

| # | Bug | Location | Evidence |
|---|-----|----------|----------|
| B1 | **🔴 Explore API receives prefixed fallback ID, not backend GUID** | [`ResearcherPortalGraphTab.tsx:163-164`](src/components/researcher/ResearcherPortalGraphTab.tsx#L163-L164) | `handleListNodeClick` sets `setExploreTarget({ id: n.id, type: apiType })`. When the graph comes from the **fallback** path (`useKnowledgeGraphData`), node IDs are prefixed: `rec_<guid>`, `eth_<normalized>`, `inst_<normalized>`, etc. ([`useKnowledgeGraphData.ts:97-147`](src/features/knowledge-graph/hooks/useKnowledgeGraphData.ts#L97-L147)). The explore endpoint `POST /api/KnowledgeGraph/explore` expects a raw backend GUID or entity ID — it will **404 / return empty** for `eth_tay` or `inst_dan-bau`. |
| B2 | **Two different ID domains with no bridge** | [`knowledgeGraphApiAdapter.ts:45`](src/features/knowledge-graph/utils/knowledgeGraphApiAdapter.ts#L45) vs [`useKnowledgeGraphData.ts:97`](src/features/knowledge-graph/hooks/useKnowledgeGraphData.ts#L97) | API adapter: `id = n.id` (raw GUID from backend). Fallback builder: `id = "rec_" + r.id`. `GraphNode.id` is the only identifier — there is **no `backendGuid` field** to disambiguate. When the user selects a fallback-origin node and triggers explore, the wrong ID goes to the server. |
| B3 | **`apiEntityType` is absent on fallback-built nodes** | [`useKnowledgeGraphData.ts:98-104`](src/features/knowledge-graph/hooks/useKnowledgeGraphData.ts#L98-L104) | Fallback `addNode` never sets `apiEntityType`. The graph tab tries `node.apiEntityType ?? viewerTypeToApiEntityType(node.type)` as a safety net, but this produces the **Pascal-case string** (`"Recording"`, `"EthnicGroup"`) — correct for `nodeType`, yet the **`nodeId`** is still prefixed. Combined with B1, explore calls are guaranteed to fail on fallback data. |
| B4 | **Recording neighbor lookup fails across ID domains** | [`ResearcherPortalGraphTab.tsx:371`](src/components/researcher/ResearcherPortalGraphTab.tsx#L371) | `approvedRecordings.find(r => r.id === gn.id)` — the graph node has `id = "rec_<guid>"` but the Recording object has `id = "<guid>"`. Match always fails → recordings show as plain text (`gn.name`) instead of clickable buttons. |

### C. UX-Critical Bugs

| # | Bug | Location | Evidence |
|---|-----|----------|----------|
| C1 | **No visual distinction for "which graph am I seeing"** | [`ResearcherPortalGraphTab.tsx:312-313`](src/components/researcher/ResearcherPortalGraphTab.tsx#L312-L313) | A tiny `9px` label says `API · 87 nút`. During demo this is invisible. Users cannot tell if they're looking at the full overview, a local fallback, or an explore subgraph. |
| C2 | **Left sidebar closed by default** | [`ResearcherPortalGraphTab.tsx:63`](src/components/researcher/ResearcherPortalGraphTab.tsx#L63) | `leftOpen = false` — the node list is hidden. New users see only the graph with no legend or list. There is no onboarding hint. |
| C3 | **Tab filter resets selection AND explore** | [`ResearcherPortalGraphTab.tsx:88-91`](src/components/researcher/ResearcherPortalGraphTab.tsx#L88-L91) | Switching tabs clears `selection` and `exploreTarget`. This is aggressive — if user explored a subgraph and accidentally clicks another tab, all context is lost. |
| C4 | **Unrelated-node dimming only works for hover/select, not for tab filter** | [`KnowledgeGraphViewer.tsx:196-198`](src/features/knowledge-graph/components/KnowledgeGraphViewer.tsx#L196-L198) | Nodes that don't match the current tab filter (e.g. recording nodes visible in "Instruments" tab) are **full opacity**. The dimming logic only activates when there's a hovered or selected node — not based on category relevance. |
| C5 | **Edge weight / link value is never set** | [`knowledgeGraphApiAdapter.ts:58-63`](src/features/knowledge-graph/utils/knowledgeGraphApiAdapter.ts#L58-L63) | `GraphLink.value` is always `undefined`. All edges render at uniform width (0.8px or 1.8px for active). No visual hierarchy of relationships. |

### D. Interaction Bugs

| # | Bug | Location | Evidence |
|---|-----|----------|----------|
| D1 | **Graph click does NOT trigger explore — only sidebar "Mở rộng" button does** | [`ResearcherPortalGraphTab.tsx:150-154`](src/components/researcher/ResearcherPortalGraphTab.tsx#L150-L154) | `handleGraphNodeClick` updates `selection` but does **not** call `setExploreTarget`. The user must: click node → open sidebar → find and click "Mở rộng quanh nút (API)". This is unintuitive — clicking a node in the graph should optionally auto-explore. |
| D2 | **Double-click or rapid-click causes stale explore** | [`ResearcherPortalGraphTab.tsx:80-86`](src/components/researcher/ResearcherPortalGraphTab.tsx#L80-L86) | `useKnowledgeGraphExplore` properly aborts via `requestKey` changes, but `exploreTarget` state updates are not batched with `selection`. A fast click sequence can leave `exploreTarget` pointing to node A while `selection` shows node B. |
| D3 | **Hover tooltip follows mouse but can be clipped** | [`KnowledgeGraphViewer.tsx:309-310`](src/features/knowledge-graph/components/KnowledgeGraphViewer.tsx#L309-L310) | `Math.min(mousePos.y + 12, Math.max(8, height - 110))` — hardcoded 110px offset assumes tooltip is always ~110px tall. Longer tooltips (multi-line name + desc) will clip. |

---

## 2. Severity Table

| ID | Bug Summary | Severity | Rationale |
|----|-------------|----------|-----------|
| **B1** | Explore API gets prefixed ID, not GUID | **P0** | 404/empty result on every explore call from fallback graph — **demo-breaking** |
| **B2** | Two ID domains, no bridge field | **P0** | Root cause of B1 and B4 — structural |
| **A1** | Selected node dangles after graph swap | **P0** | Stale selection causes phantom highlight + wrong detail panel — **confusing during demo** |
| **B4** | Recording neighbor lookup fails (ID mismatch) | **P0** | "Related recordings" panel never links back to actual recordings from fallback data |
| **B3** | `apiEntityType` missing on fallback nodes | **P1** | Explore type parameter falls back correctly but masquerades the real problem |
| **D1** | Graph click doesn't trigger explore | **P1** | Feature works but UX is non-obvious — user must find sidebar button |
| **C4** | Tab filter doesn't dim unrelated nodes | **P1** | Graph looks identical on all tabs, defeating the tab UX purpose |
| **C1** | Data source label too small | **P1** | User can't tell which graph they're seeing during demo |
| **C2** | Left sidebar closed by default | **P2** | First-time experience is bare graph with no guidance |
| **C3** | Tab switch resets explore context | **P2** | Destructive but user-initiated — can be documented |
| **C5** | Edge weight always `undefined` | **P2** | Visual polish — all edges same width |
| **A2** | `val` accumulates across re-renders | **P2** | Latent inflation, not user-visible unless many re-renders |
| **D2** | Rapid-click stale explore | **P2** | Edge case, abort controller mitigates |
| **D3** | Tooltip clipping | **P2** | Minor visual glitch on long names |

---

## 3. Minimal Implementation Plan

### Phase 1 — Data Safety & ID Contract (fixes B1, B2, B3, B4, A1)

> [!IMPORTANT]
> This phase fixes all P0 bugs. Must be completed before any UX changes.

**Goal:** Ensure `GraphNode` always carries the backend-resolvable ID separately from the visual/display ID.

#### 1.1 Add `backendId` to `GraphNode`

```diff
// types/graph.ts
export interface GraphNode {
  id: string;
  name: string;
  type: GraphNodeType;
+ /** Original backend entity GUID — used for API calls (explore, detail).
+  *  Falls back to `id` when graph comes from API adapter. */
+ backendId?: string;
  val?: number;
  ...
}
```

#### 1.2 Set `backendId` in fallback builder

```diff
// useKnowledgeGraphData.ts — inside addNode for recordings
const recId = `rec_${r.id}`;
addNode({
  id: recId,
  name: r.title || 'Unknown',
  type: 'recording',
  val: 1,
+ backendId: r.id,    // raw GUID
  ...
});

// ethnic groups
const ethGraphId = `eth_${normalizeId(rawEthId, ethName)}`;
addNode({
  id: ethGraphId,
  name: ethName,
  type: 'ethnic_group',
+ backendId: rawEthId,  // may be undefined — explore will be disabled
+ apiEntityType: 'EthnicGroup',
  ...
});

// instruments, ceremonies — same pattern
```

#### 1.3 API adapter already uses raw IDs — just alias

```diff
// knowledgeGraphApiAdapter.ts
export function mapKnowledgeGraphApiNodeToGraphNode(n: KnowledgeGraphApiNode): GraphNode {
  return {
    id: n.id,
    name: n.label?.trim() ? n.label : n.id,
    type: viewerType,
    apiEntityType: n.type,
+   backendId: n.id,    // same as id for API-sourced nodes
    val: 1,
    ...
  };
}
```

#### 1.4 Fix explore target to use `backendId`

```diff
// ResearcherPortalGraphTab.tsx
const handleListNodeClick = useCallback((n: GraphNode) => {
  const apiType = n.apiEntityType ?? viewerTypeToApiEntityType(n.type);
+ const resolvedId = n.backendId ?? n.id;
+ if (!resolvedId || resolvedId.startsWith('rec_') || resolvedId.startsWith('eth_')) {
+   // Fallback node without backend GUID — select but don't explore
+   setSelection({ source: 'list', viewerType: n.type, name: n.name, id: n.id });
+   return;
+ }
  setSelection({ source: 'list', viewerType: n.type, name: n.name, id: n.id });
- setExploreTarget({ id: n.id, type: apiType });
+ setExploreTarget({ id: resolvedId, type: apiType });
}, []);
```

#### 1.5 Fix recording neighbor lookup (B4)

```diff
// ResearcherPortalGraphTab.tsx L371
- const rec = approvedRecordings.find((r) => r.id === gn.id);
+ const lookupId = gn.backendId ?? gn.id;
+ const rec = approvedRecordings.find((r) => r.id === lookupId
+   || r.id === gn.id
+   || `rec_${r.id}` === gn.id);
```

#### 1.6 Clear stale selection on graph swap (A1)

```diff
// ResearcherPortalGraphTab.tsx — after displayGraph useMemo
useEffect(() => {
  if (!selectedNodeId) return;
- // current auto-pick logic
+ const stillExists = displayGraph.nodes.some(n => n.id === selectedNodeId);
+ if (!stillExists) {
+   // Re-pick default instead of leaving stale
+   const node = pickFocusDefaultNode(displayGraph, (n) => tabMatchesViewerType(graphView, n.type));
+   if (node) {
+     const apiType = node.apiEntityType ?? viewerTypeToApiEntityType(node.type);
+     setSelection({ source: 'graph', id: node.id, apiEntityType: apiType, label: node.name, viewerType: node.type });
+   } else {
+     setSelection(null);
+   }
+ }
}, [displayGraph, selectedNodeId, graphView]);
```

---

### Phase 2 — Focus Graph UX (fixes C4, C1, D1)

#### 2.1 Auto-explore on graph click (opt-in)

```diff
// ResearcherPortalGraphTab.tsx
const handleGraphNodeClick = useCallback((node: GraphNode) => {
  const apiType = node.apiEntityType ?? viewerTypeToApiEntityType(node.type);
  setSelection({ source: 'graph', id: node.id, apiEntityType: apiType, label: node.name, viewerType: node.type });
+ const resolvedId = node.backendId ?? node.id;
+ if (resolvedId && !resolvedId.startsWith('rec_') && !resolvedId.startsWith('eth_')) {
+   setExploreTarget({ id: resolvedId, type: apiType });
+ }
}, []);
```

#### 2.2 Tab filter dims non-matching nodes

Pass `activeTab` / `graphView` to `KnowledgeGraphViewer` as a prop, and in `paintNode`:

```ts
// Additional dim check in KnowledgeGraphViewer
const matchesTab = !tabFilter || tabMatchesViewerType(tabFilter, node.type);
const shouldDim = (hasActive && !isHovered && !isSelected && !relatedToFocus) || !matchesTab;
```

#### 2.3 Improve data source badge

Make the data source label larger (12px), colored (green for API, amber for Local, blue for Explore), with an icon.

---

### Phase 3 — Visual Hierarchy (fixes C5, A2)

#### 3.1 Edge width by relationship weight

```diff
// knowledgeGraphApiAdapter.ts
links: (api.edges ?? []).map((e) => ({
  source: e.sourceId,
  target: e.targetId,
  type: e.relation,
+ value: e.properties?.weight != null ? Number(e.properties.weight) : 1,
}))
```

```diff
// KnowledgeGraphViewer getLinkWidth — scale by value
const edge = link as GraphLinkEdge;
const baseWidth = Math.max(0.5, Math.min(3, (edge.value ?? 1) * 0.8));
```

#### 3.2 Stable `val` computation (prevent accumulation)

```diff
// useKnowledgeGraphData.ts addNode
const addNode = (node: GraphNode) => {
  if (!node.id || !node.name) return;
  if (!nodesMap.has(node.id)) {
    nodesMap.set(node.id, node);
  } else {
    const ext = nodesMap.get(node.id)!;
-   ext.val = (ext.val || 0) + (node.val || 0);
+   ext.val = Math.max(ext.val ?? 0, node.val ?? 0);  // take max, don't accumulate
  }
};
```

---

### Phase 4 — Labels & Interaction Polish (fixes C2, D3)

#### 4.1 Open left sidebar by default

```diff
- const [leftOpen, setLeftOpen] = useState(false);
+ const [leftOpen, setLeftOpen] = useState(true);
```

#### 4.2 Tooltip clipping fix

Replace hardcoded 110px with measured tooltip ref height, or use `min(mousePos.y + 12, height - tooltipHeight - 8)`.

#### 4.3 Labels only for selected + hovered + high-degree

Already implemented in viewer ✅. Just verify `HIGH_DEGREE_THRESHOLD = 4` is reasonable (currently good for ~100 node graphs).

---

### Phase 5 — Verification Checklist

| Test Case | Expected | Bug Reference |
|-----------|----------|---------------|
| Empty graph (`nodes: [], links: []`) | Shows "Không có dữ liệu" placeholder, no crash | A3 ✅ already handled |
| Single-node graph | Renders one node, can click, detail panel shows info | — |
| Duplicate node IDs in input | `buildGraphDataSafe` deduplicates — verify via test | A2 |
| Edge references non-existent node | `buildGraphDataSafe` drops orphan edges — verify | — ✅ already handled |
| Selected node filtered out by graph swap | Selection auto-resets to new default node | A1 |
| Explore call from **API-sourced** graph | `nodeId` is raw GUID → explore succeeds | B1 |
| Explore call from **fallback** graph | `nodeId` is `backendId` (raw GUID) if available, else explore is disabled | B1, B2 |
| Recording neighbor shows clickable button | `approvedRecordings.find` matches via `backendId` fallback | B4 |
| Click node → detail panel updates | `selection` syncs immediately | D1 |
| Rapid double-click different nodes | Latest node wins, no stale panel | D2 |
| Tab switch "Instruments" → only instrument nodes full opacity | Non-instrument nodes dimmed | C4 |
| Hover tooltip on long-name node near bottom edge | No clipping | D3 |

---

## 4. Files Likely Affected

| File | Changes |
|------|---------|
| [`types/graph.ts`](src/types/graph.ts) | Add `backendId` field |
| [`useKnowledgeGraphData.ts`](src/features/knowledge-graph/hooks/useKnowledgeGraphData.ts) | Set `backendId`, `apiEntityType`, fix `val` accumulation |
| [`knowledgeGraphApiAdapter.ts`](src/features/knowledge-graph/utils/knowledgeGraphApiAdapter.ts) | Set `backendId = n.id`, edge `value` |
| [`ResearcherPortalGraphTab.tsx`](src/components/researcher/ResearcherPortalGraphTab.tsx) | Fix explore target ID, recording lookup, stale selection, auto-explore, sidebar default |
| [`KnowledgeGraphViewer.tsx`](src/features/knowledge-graph/components/KnowledgeGraphViewer.tsx) | Tab-filter dimming, tooltip clipping |
| [`graphViewerHelpers.ts`](src/features/knowledge-graph/utils/graphViewerHelpers.ts) | Minor — may add tab-aware dim helper |
| [`researcherGraphUx.ts`](src/features/knowledge-graph/utils/researcherGraphUx.ts) | No changes needed |

**Files NOT touched** (safe):

- `knowledgeGraphService.ts` — service layer is clean
- `useKnowledgeGraphOverview.ts`, `useKnowledgeGraphExplore.ts`, `useKnowledgeGraphSearch.ts`, `useKnowledgeGraphStats.ts` — hooks are correct
- `useKgAsync.ts` — async machinery is solid
- Explore search logic — out of scope

---

## 5. Risk Assessment

> [!WARNING]
> **Phase 1 is the critical path.** The ID mismatch (B1/B2) means explore calls from fallback data **always fail silently** (server returns empty graph, UI shows stale `lastGoodGraphRef`). This is invisible to the developer but obvious during demo — clicking "Mở rộng" does nothing.

> [!TIP]
> The safest approach is to add `backendId` as an **optional** field. Existing API-sourced nodes set it to `id` (identity). Fallback nodes set it to the raw entity ID when available. Explore calls prefer `backendId`, falling back to `id`. This is fully backward-compatible.

---

## 6. Summary of What Works Well

The codebase has several strong patterns already in place:

- ✅ `buildGraphDataSafe` — dedupes nodes, caps count, drops orphan edges
- ✅ `useKgAsync` — proper abort controller, stale-guard, cache
- ✅ `pickFocusDefaultNode` — degree-based auto-selection
- ✅ `DIM_NODE_ALPHA = 0.15` — neighbor dimming when a node is selected
- ✅ `clampedVisualRadius` — 4–12px range with sqrt scaling
- ✅ Canvas painting with label strategy (selected/hovered/high-degree only)
- ✅ Error banners for both overview and explore failures
- ✅ `lastGoodGraphRef` — prevents blank graph during re-fetch

The foundation is solid. The bugs are concentrated in the **ID contract layer** between the two graph data sources (API vs fallback) and in the **selection lifecycle** when the underlying graph changes.
