# PLAN — Explore Search Production Refactor

**Trạng thái:** Draft  
**Tạo:** 2026-05-04  
**Tác giả:** Architect agent  
**Phạm vi:** 10 lỗi thiết kế trong trang Explore + Knowledge Graph frontend  
**Nguồn ngữ cảnh:** `docs/EXPLORE-CODE-SKELETON.md`

---

## Executive Summary

Trang **`/explore`** hoạt động nhờ một pipeline monolith (`loadExploreRecordings`) chứa **5 nhánh lồng nhau** với 3 lớp try/catch. Kiến trúc này gây ra 10 lỗi vận hành thực tế:

| # | Vấn đề | Mức nghiêm trọng | Sprint fix |
|---|--------|------------------|------------|
| 1 | Semantic chỉ trả 10 kết quả, không phân trang | **P1** — user thấy "Tìm thấy 10 bản thu" dù có 200 khớp | Phase 1 |
| 2 | Guest pagination bị lọc client → `totalPages: 1`, mất dữ liệu trang 2+ | **P1** — 80% traffic | Phase 1 |
| 3 | Semantic fallback dùng `applyGuestFilters` (substring) giả danh "ngữ nghĩa" | **P1** — UX sai | Phase 1 |
| 4 | `sortByUploadedDesc` xóa thứ tự semantic score | **P2** — ranking mất ý nghĩa | Phase 1 |
| 5 | 3 effect cùng ghi URL → cascade `setSearchParams` gây fetch trùng | **P2** — race, flash load | Phase 2 |
| 6 | `applyGuestFilters` + `recordingFacetHaystack` tạo string mới mỗi row, O(N·K) | **P3** — > 500 rows laggy | Phase 2 |
| 7 | `fetchFullCatalog` tải tới 500 bản + fallback IDB mỗi lần page change | **P2** — N+1, bandwidth | Phase 2 |
| 8 | `ethnicityIds` dùng **nhãn text** làm id, trùng với `tags` | **P2** — filter phantom | Phase 2 |
| 9 | `dataSource` telemetry sai: semantic fallback gán `'searchApi'`, auth no-filter gán `'recordingApi'` dù thực tế từ catalog | **P3** — metrics vô nghĩa | Phase 1 |
| 10 | `buildKnowledgeGraphData` chạy O(N²) link dedup trên main thread | **P2** — > 500 recordings = freeze | Phase 3 |

**Chiến lược:** Phase 1 = smallest safe patches (logic-only, không đổi giao diện); Phase 2 = refactor cấu trúc state & data; Phase 3 = kiến trúc dài hạn.

---

## Root Cause Analysis

### Issue 1 — Semantic pagination cứng `topK: 10`

**File:** `exploreRecordingsLoad.ts:124-134`

```typescript
// BEFORE — luôn chỉ lấy 10 kết quả
const semanticResponse = await semanticSearchService.searchSemantic({
  q: sqActive,
  topK: 10,  // ← hardcoded
});
// ...
response = { items: pooled, total: pooled.length, totalPages: 1 };
```

**Root cause:** `topK: 10` cố định; `totalPages: 1`; `currentPage` bị bỏ qua hoàn toàn. User gọi semantic search cho dataset 300 bản thu → chỉ thấy 10, không có nút Sau.

**Fix (Phase 1 — safe patch):**

```typescript
// AFTER — tải nhiều hơn, paginate client-side
const SEMANTIC_POOL_SIZE = 100;
const semanticResponse = await semanticSearchService.searchSemantic({
  q: sqActive,
  topK: SEMANTIC_POOL_SIZE,
});
const ranked = semanticResponse.map((r) => ({
  ...r.recording,
  _semanticScore: r.similarityScore,
}));
const needFacet = !isAuthenticated || Object.keys(facetOnly).length > 0;
const filtered = needFacet ? applyGuestFilters(ranked, facetOnly) : ranked;
// DO NOT re-sort by uploadedDate — preserve semantic ranking
const pageSize = 20;
const start = Math.max(0, (currentPage - 1) * pageSize);
const paged = filtered.slice(start, start + pageSize);
response = {
  items: paged,
  total: filtered.length,
  totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
};
```

**Fix (Phase 3 — long-term):** Backend semantic endpoint hỗ trợ `offset` / `page` + server-side facet filter.

---

### Issue 2 — Guest pagination/data loss

**File:** `exploreRecordingsLoad.ts:148-159`

```typescript
// BEFORE — lấy trang N từ API, rồi lọc client → kết quả co lại, totalPages: 1
const guestRes = await recordingService.getGuestRecordings(currentPage, 20, apiOpts);
const filteredGuestItems = applyGuestFilters(
  Array.isArray(guestRes?.items) ? guestRes.items : [],
  activeFilters,
);
response = {
  items: filteredGuestItems,
  total: filteredGuestItems.length,  // ← sai: total sau lọc page, không phải total dataset
  totalPages: 1,                     // ← luôn 1 → không có phân trang
};
```

**Root cause:** API trả trang 20 bản thu → client lọc → có thể còn 3 → user thấy 3, không biết còn trang 2. Nguyên nhân sâu: guest API không hỗ trợ filter server-side.

**Fix (Phase 1 — safe patch):** Khi guest có filter, tải pool lớn hơn thay vì chỉ 1 trang:

```typescript
// AFTER
if (Object.keys(activeFilters).length > 0) {
  // Guest + filters: fetch larger pool, filter client, paginate client
  const poolRes = await recordingService.getGuestRecordings(1, 200, apiOpts);
  const pool = Array.isArray(poolRes?.items) ? poolRes.items : [];
  const filtered = applyGuestFilters(pool, activeFilters);
  const sorted = sortByUploadedDesc(filtered);
  const pageSize = 20;
  const start = Math.max(0, (currentPage - 1) * pageSize);
  response = {
    items: sorted.slice(start, start + pageSize),
    total: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
} else {
  // Guest + no filters: pass-through API pagination
  const guestRes = await recordingService.getGuestRecordings(currentPage, 20, apiOpts);
  const items = Array.isArray(guestRes?.items) ? guestRes.items : [];
  const apiTotal = typeof guestRes?.total === 'number' ? guestRes.total : items.length;
  response = {
    items,
    total: apiTotal,
    totalPages: typeof guestRes?.totalPages === 'number' ? guestRes.totalPages : 1,
  };
}
```

**Fix (Phase 3):** Backend `GET /api/Recording/guest` nhận filter params (region, type, ethnicity), trả `{ items, total, totalPages }` chính xác.

---

### Issue 3 — Semantic fallback giả danh "ngữ nghĩa"

**File:** `exploreRecordingsLoad.ts:136-144`

```typescript
// BEFORE — fallback khi semantic API lỗi
const catalog = await fetchFullCatalog(signal);
const clientFiltered = applyGuestFilters(catalog, { ...facetOnly, query: sqActive });
// ↑ query bây giờ là chuỗi tự nhiên "đàn bầu miền Bắc" dùng substring match
// user vẫn thấy heading "Kết quả theo ngữ nghĩa" — MISLEADING
```

**Root cause:** Fallback dùng `applyGuestFilters` (substring trên `normalizeSearchText`) cho chuỗi ngữ nghĩa dài nhiều từ. Chuỗi "đàn bầu miền Bắc" sẽ không khớp substring nào trên haystack vì `includes` đòi toàn bộ chuỗi liền. Kết quả: **0 kết quả hoặc false positives**, nhưng UI nói "Kết quả theo ngữ nghĩa".

**Fix (Phase 1):**

1. Thay `applyGuestFilters` trong fallback bằng `rankRecordingsBySemanticQuery` (file đã tồn tại: `exploreSemanticRank.ts`):

```typescript
import { rankRecordingsBySemanticQuery } from '@/features/explore/utils/exploreSemanticRank';

// AFTER
catch (semErr) {
  if (isExploreRequestAborted(semErr)) throw semErr;
  const catalog = await fetchFullCatalog(signal);
  // Token-overlap ranking instead of broken substring
  let clientRanked = rankRecordingsBySemanticQuery(catalog, sqActive);
  // Still apply facet filters (region, type, etc.) but NOT query
  if (Object.keys(facetOnly).length > 0) {
    clientRanked = applyGuestFilters(clientRanked, facetOnly);
  }
  const pageSize = 20;
  const start = Math.max(0, (currentPage - 1) * pageSize);
  response = {
    items: clientRanked.slice(start, start + pageSize),
    total: clientRanked.length,
    totalPages: Math.max(1, Math.ceil(clientRanked.length / pageSize)),
  };
  fetchWarning = clientRanked.length > 0
    ? 'Tìm ngữ nghĩa tạm lỗi — hiển thị kết quả xếp theo từ khóa.'
    : 'Hệ thống tìm kiếm ngữ nghĩa tạm thời không khả dụng.';
}
```

2. **`fetchWarning` text phải nói rõ** đây là xếp hạng từ khóa, không phải ngữ nghĩa thật.

---

### Issue 4 — `sortByUploadedDesc` phá thứ tự semantic

**File:** `exploreRecordingsLoad.ts:245`

```typescript
return {
  recordings: sortByUploadedDesc(apiItems),  // ← ALWAYS sorts by date, even semantic
  totalResults: apiTotal,
  dataSource,
  fetchWarning,
};
```

**Root cause:** Hàm trả kết quả **luôn** sort theo ngày upload. Với semantic search, kết quả API đã xếp theo `similarityScore` giảm dần → sort lại theo ngày phá ranking.

**Fix (Phase 1):** Sort có điều kiện:

```typescript
// AFTER
const shouldPreserveRanking = exploreMode === 'semantic' && sqActive;
return {
  recordings: shouldPreserveRanking ? apiItems : sortByUploadedDesc(apiItems),
  totalResults: apiTotal,
  dataSource,
  fetchWarning,
};
```

---

### Issue 5 — URL / filter / input race condition

**File:** `ExplorePage.tsx` — 3 effect ghi `setSearchParams`

| Effect | Trigger | Hành vi |
|--------|---------|---------|
| Debounce effect (L219-230) | `debouncedSemanticInput` đổi | `setSearchParams(...)` |
| URL→filters (L247-251) | `searchParams` đổi | `setFilters(...)`, `setCurrentPage(1)` |
| filters→facetDraft (L258-260) | `filters` đổi | `setFacetDraft(...)` |

**Cascade:** User gõ semantic → debounce → effect 1 ghi URL → effect 2 đọc URL → `setFilters` → `setCurrentPage(1)` → useExploreData re-fire → effect 3 ghi facetDraft. Mỗi `setSearchParams` kích lại render + effect chain → **2-3 fetch requests** cho một keystroke.

**Fix (Phase 2) — Hợp nhất thành single source of truth:**

```
BEFORE (3 writes):
  debounce → setSearchParams
  searchParams → setFilters + setCurrentPage
  filters → setFacetDraft

AFTER (1 write, 1 derive):
  debounce → setSearchParams (unchanged)
  searchParams → derive filters, facetDraft, currentPage via useMemo
  (remove setFilters/setFacetDraft effects — compute them synchronously from searchParams)
```

Cụ thể:

```typescript
// AFTER — ExplorePage.tsx
// filters is derived, NOT state
const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
const facetDraft = useMemo(
  () => searchFiltersToExploreDraft(filters, EXPLORE_FILTER_OPTIONS),
  [filters],
);
// facetDraft edits: local state for draft only, separate from filters
const [localDraft, setLocalDraft] = useState<ExploreFacetDraft>(facetDraft);
// Sync when URL changes (user navigates back, etc.)
useEffect(() => { setLocalDraft(facetDraft); }, [facetDraft]);
```

Kết quả: `useExploreData` chỉ fire khi `searchParams` (URL) thực sự đổi, không còn cascade.

---

### Issue 6 — `applyGuestFilters` performance

**File:** `exploreGuestFilters.ts:15-51`

**Root cause:** Mỗi row tạo 6+ chuỗi `normalizeSearchText(...)` rồi nối rồi `includes()`. Với 500 rows × 6 fields = 3000 normalize calls per filter pass. `recordingFacetHaystack` tạo thêm chuỗi mỗi row mỗi lần gọi.

**Fix (Phase 2):** Pre-compute haystack khi pool load, cache lên recording object:

```typescript
// AFTER — trong exploreRecordingsLoad.ts khi lấy được pool
function attachSearchHaystack(items: Recording[]): Recording[] {
  return items.map((r) => ({
    ...r,
    _haystack: buildHaystack(r),  // compute once
  }));
}

// applyGuestFilters kiểm tra r._haystack thay vì tính lại
```

**Estimate:** Giảm ~80% CPU trên pool 500+ rows.

---

### Issue 7 — `fetchFullCatalog` gọi lại mỗi lần

**File:** `exploreRecordingsLoad.ts:91-105`

```typescript
async function fetchFullCatalog(signal?: AbortSignal): Promise<Recording[]> {
  // Mỗi lần user đổi page / filter → gọi lại, tải lại 500 bản
}
```

**Root cause:** Không có cache. Auth default view (no filters) gọi `fetchFullCatalog` **mỗi lần** đổi trang. 3 fallback chain (submissions → filter API → IDB) chạy tuần tự.

**Fix (Phase 2) — Module-level cache:**

```typescript
let cachedCatalog: { data: Recording[]; timestamp: number } | null = null;
const CATALOG_TTL = 60_000; // 1 minute

async function fetchFullCatalog(signal?: AbortSignal): Promise<Recording[]> {
  if (cachedCatalog && Date.now() - cachedCatalog.timestamp < CATALOG_TTL) {
    return cachedCatalog.data;
  }
  // ... existing fetch logic ...
  cachedCatalog = { data: pool, timestamp: Date.now() };
  return pool;
}

export function invalidateCatalogCache() {
  cachedCatalog = null;
}
```

**Fix (Phase 3):** Backend endpoint trả paginated verified recordings với filter server-side → loại bỏ `fetchFullCatalog` hoàn toàn.

---

### Issue 8 — Ethnicity/tag data modeling flaw

**File:** `exploreFacetDraft.ts:29-41`

```typescript
export function exploreDraftToSearchFilters(d: ExploreFacetDraft): SearchFilters {
  const ethnicityNames = d.ethnicityIds.filter(Boolean);  // ← "ids" nhưng thực ra là text labels
  const tags = [...facetTags, ...ethnicityNames];          // ← ethnicity names trộn vào tags!
  // ...
  if (ethnicityNames.length) out.ethnicityIds = [...ethnicityNames];
  // ...
  if (tags.length) out.tags = tags;  // ← "Kinh" xuất hiện cả trong ethnicityIds VÀ tags
}
```

**Root cause:** `EXPLORE_FILTER_OPTIONS.ethnicities` có `{ id: label, label }` — id **bằng** label. Khi commit, cùng giá trị `"Kinh"` vào cả `ethnicityIds` (server filter) và `tags` (client filter haystack). Server có thể match `ethnicityIds` theo UUID nếu API đổi schema → filter sẽ hỏng. Ngoài ra `searchFiltersToExploreDraft` phải dò lại `ethnicityLabels` set để phân loại tag → **tag không phải ethnicity nhưng trùng tên sẽ bị nuốt**.

**Fix (Phase 2):**

1. `EXPLORE_FILTER_OPTIONS.ethnicities` nên dùng `{ id: UUID, label: name }` nếu backend hỗ trợ.
2. `exploreDraftToSearchFilters`: **không** đưa ethnicity names vào `tags`. Tách rõ:

```typescript
// AFTER
export function exploreDraftToSearchFilters(d: ExploreFacetDraft): SearchFilters {
  const facetTags = [...d.genreTags, ...d.instrumentTags, ...d.culturalTags];
  const out: SearchFilters = {};
  const q = d.query.trim();
  if (q) out.query = q;
  if (d.ethnicityIds.length) out.ethnicityIds = [...d.ethnicityIds];
  if (d.recordingTypes.length) out.recordingTypes = [...d.recordingTypes];
  if (d.region) out.regions = [d.region];
  if (facetTags.length) out.tags = facetTags;
  // ↑ ethnicityIds NO LONGER merged into tags
  return out;
}
```

3. `applyGuestFilters`: ethnicity filter (`ethnicityIds`) đã kiểm tra `r.ethnicity.id / name / nameVietnamese` riêng → **không cần** trộn vào tags.

---

### Issue 9 — `dataSource` telemetry không chính xác

**File:** `exploreRecordingsLoad.ts:232-242`

```typescript
// BEFORE — gán dataSource cuối hàm, bất kể data thực sự đến từ đâu
if (exploreMode === 'semantic' && sqActive) {
  dataSource = apiItems.length > 0 ? 'searchApi' : 'empty';
  // ↑ sai: nếu semantic lỗi → catalog fallback vẫn gán 'searchApi'
} else {
  dataSource = apiItems.length > 0 ? 'recordingApi' : 'empty';
  // ↑ sai: auth default đi qua fetchFullCatalog (submissions/filter/IDB) nhưng gán 'recordingApi'
}
```

**Fix (Phase 1) — Track source trong quá trình fetch:**

```typescript
// AFTER — khai báo dataSource = 'empty' đầu hàm, gán đúng tại mỗi nhánh
let dataSource: ExploreDataSource = 'empty';

// Trong nhánh semantic success:
dataSource = 'searchApi';
// Trong nhánh semantic fallback:
dataSource = 'archiveFallback';
// Trong nhánh guest:
dataSource = 'recordingGuest';
// Trong nhánh auth + searchRecordings:
dataSource = 'searchApi';
// Trong nhánh auth + searchRecordings fallback catalog:
dataSource = 'archiveFallback';
// Trong nhánh auth default (fetchFullCatalog):
dataSource = 'archiveFallback';
// Trong catch tổng:
dataSource = pool.length > 0 ? 'archiveFallback' : 'empty';
```

Xóa block gán `dataSource` ở cuối hàm.

---

### Issue 10 — `buildKnowledgeGraphData` O(N²) link dedup

**File:** `useKnowledgeGraphData.ts:71-78`

```typescript
const addLink = (source: string, target: string, type: string) => {
  if (!source || !target) return;
  const exists = links.find(            // ← O(L) per call
    (l) =>
      (l.source === source && l.target === target) ||
      (l.source === target && l.target === source),
  );
  if (!exists) links.push({ source, target, type });
};
```

**Root cause:** `addLink` gọi `Array.find` trên toàn bộ `links[]` mỗi lần → O(L) per call. Mỗi recording tạo ~4 links → N recordings = ~4N calls × O(L) = O(N²). Với 1000 recordings (4000 links): ~16M comparisons.

**Fix (Phase 1 — safe patch):**

```typescript
// AFTER — Set-based dedup
const linkSet = new Set<string>();

const addLink = (source: string, target: string, type: string) => {
  if (!source || !target) return;
  const fwd = `${source}→${target}`;
  const rev = `${target}→${source}`;
  if (linkSet.has(fwd) || linkSet.has(rev)) return;
  linkSet.add(fwd);
  links.push({ source, target, type });
};
```

O(1) per call → tổng O(N).

**Fix (Phase 3):** Chuyển graph computation sang backend `GET /api/KnowledgeGraph/overview` (đã có endpoint). Frontend chỉ render.

---

## Phase Plan

### Phase 1 — Safe patches (không đổi API contract, không đổi UI layout)

**Thời gian ước tính:** 1–2 ngày  
**Rủi ro rollback:** Thấp — mỗi patch độc lập, có thể revert riêng

| Task | File | Thay đổi |
|------|------|----------|
| 1a. Semantic pool size | `exploreRecordingsLoad.ts` | `topK: 10` → `100`; client-paginate kết quả; giữ score order |
| 1b. Preserve semantic ranking | `exploreRecordingsLoad.ts:245` | Conditional `sortByUploadedDesc` — skip khi semantic |
| 1c. Semantic fallback dùng token rank | `exploreRecordingsLoad.ts` catch | Thay `applyGuestFilters(catalog, { query: sqActive })` → `rankRecordingsBySemanticQuery` + facet-only filter |
| 1d. Fallback warning text | `exploreRecordingsLoad.ts` | Nói rõ "xếp hạng từ khóa" thay vì im lặng |
| 1e. `dataSource` tracking | `exploreRecordingsLoad.ts` | Gán `dataSource` tại mỗi nhánh, xóa block cuối |
| 1f. KG link dedup | `useKnowledgeGraphData.ts` | `links.find` → `Set<string>` |

**Tests cần thêm:**

```
exploreRecordingsLoad.test.ts:
  - semantic path returns paginated results (page 1, page 2)
  - semantic path preserves score order (no date re-sort)
  - semantic fallback uses token ranking, not substring
  - semantic fallback dataSource === 'archiveFallback'
  - guest path with filters fetches larger pool

useKnowledgeGraphData.test.ts:
  - no duplicate links in output
  - performance: 1000 recordings < 50ms
```

### Phase 2 — Structural refactor

**Thời gian ước tính:** 3–5 ngày  
**Rủi ro:** Trung bình — đổi state model ExplorePage

| Task | File | Thay đổi |
|------|------|----------|
| 2a. Derive `filters`+`facetDraft` từ URL | `ExplorePage.tsx` | `filters` thành `useMemo` từ `searchParams`; loại 2 effect sync |
| 2b. Guest filter pagination | `exploreRecordingsLoad.ts` | Guest + có filter → pool lớn + paginate client |
| 2c. Catalog cache | `exploreRecordingsLoad.ts` | Module-level cache 60s + `invalidateCatalogCache` |
| 2d. Haystack pre-compute | `exploreGuestFilters.ts` | `_haystack` field trên Recording sau khi load pool |
| 2e. Ethnicity/tag tách rõ | `exploreFacetDraft.ts`, `exploreFilterOptions.ts` | Không trộn ethnicity vào tags; dùng UUID nếu có |

**Tests cần thêm:**

```
ExplorePage.test.tsx:
  - URL change triggers exactly 1 fetch (no cascade)
  - facetDraft syncs from URL without extra render

exploreRecordingsLoad.test.ts:
  - catalog cache returns same reference within TTL
  - invalidateCatalogCache forces re-fetch

exploreFacetDraft.test.ts:
  - ethnicity NOT duplicated in tags array
  - round-trip: draft → filters → draft preserves all fields
```

### Phase 3 — Architecture (backend changes required)

**Thời gian ước tính:** 1–2 sprint  
**Rủi ro:** Cao — cần backend team

| Task | Backend | Frontend |
|------|---------|----------|
| 3a. Server-side semantic pagination | `SemanticSearchController`: add `offset`, `limit`, `filters` params | Simplify semantic branch to pass-through |
| 3b. Server-side guest filters | `RecordingController.GetGuest`: accept `region`, `type`, `ethnicity` query params | Remove `applyGuestFilters` from guest path |
| 3c. Unified catalog endpoint | New `GET /api/Recording/verified?page=&size=&region=&...` | Replace `fetchFullCatalog` entirely |
| 3d. KG backend rendering | Use existing `GET /api/KnowledgeGraph/overview` | Replace `buildKnowledgeGraphData` with API call |

---

## Rollout Risks

| Risk | Mitigation |
|------|------------|
| Phase 1 `topK: 100` gây backend slow | Kiểm tra latency semantic API với 100; fallback giữ `topK: 50` nếu > 3s |
| Phase 1 guest pool `pageSize: 200` gây payload lớn | Đo response size; nếu > 1MB thì giảm 100 |
| Phase 2 derive `filters` từ `useMemo` gây re-render toàn bộ | `useMemo` đã stable nếu `searchParams` ref không đổi; verify với React Profiler |
| Phase 2 catalog cache stale sau upload mới | `invalidateCatalogCache` khi user vừa submit upload thành công (gọi từ `useUploadSubmission`) |
| Phase 3 backend breaking change | Feature flag `VITE_EXPLORE_V2=true` để chuyển nhánh fetch mới; deploy song song |

---

## Verification Checklist

- [ ] Phase 1: Semantic search trang 1 hiện 20, trang 2 hiện tiếp, thứ tự theo score
- [ ] Phase 1: Semantic fallback heading nói "xếp theo từ khóa" (không phải "ngữ nghĩa")
- [ ] Phase 1: KG Researcher > 500 recordings không lag khi mở tab đồ thị
- [ ] Phase 1: Telemetry `dataSource` khớp nguồn thật (`archiveFallback` khi dùng catalog)
- [ ] Phase 2: Guest + filter "Kinh" hiển thị đúng tổng, có nút phân trang
- [ ] Phase 2: Gõ semantic input nhanh → chỉ 1 fetch (không flash loading)
- [ ] Phase 2: `ethnicityIds` không xuất hiện trong `tags` trên URL
- [ ] Phase 3: Backend semantic endpoint trả `{ items, total, page }` chuẩn
- [ ] E2E: `tests/e2e/14-explore-full.spec.ts` pass + thêm case semantic pagination

---

*Plan hoàn tất. Bắt đầu với Phase 1 task 1a–1f cho sprint hiện tại.*
