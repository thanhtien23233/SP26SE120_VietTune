# PLAN: Code Quality & Performance Audit

> **Generated**: 2026-04-17  
> **Scope**: Toàn bộ `src/` — React 18 + TypeScript + Vite  
> **Method**: Static analysis codebase + pattern matching  

---

## Mục lục

- [Tổng quan đánh giá](#tổng-quan-đánh-giá)
- [P0 — Critical Performance](#p0--critical-performance)
- [P1 — High-Impact Quality](#p1--high-impact-quality)
- [P2 — Medium Optimizations](#p2--medium-optimizations)
- [P3 — Low Priority / Nice-to-Have](#p3--low-priority--nice-to-have)
- [Phase X — Verification](#phase-x--verification)

---

## Tổng quan đánh giá

### Điểm mạnh hiện tại
- TypeScript **strict mode** bật đầy đủ (`noUnusedLocals`, `noUnusedParameters`)
- Hầu hết **zero `@ts-ignore`** — chỉ 2 chỗ `as any` (upload multipart)
- Tất cả page route đều **lazy-loaded** (`React.lazy`)
- `date-fns` import named (tree-shakable), `lucide-react` import icon cụ thể
- Nhiều interval/listener có **cleanup đúng** trong useEffect
- Admin dashboard đã dùng **`Promise.allSettled`** cho parallel fetch
- Có `rollup-plugin-visualizer` sẵn (`npm run build:analyze`)

### Điểm yếu cần cải thiện

| Lĩnh vực | Mức độ | Tóm tắt |
|-----------|--------|---------|
| React re-render | **Cao** | AuthProvider tạo `value={{}}` mới mỗi render; Zustand subscribe toàn store |
| Hai HTTP stack | **Cao** | axios + openapi-fetch song song → interceptor/error handling khác nhau |
| Không có data cache | **Cao** | Reference data đã cache TTL 10 phút trong `referenceDataService`; chưa React Query/SWR cho toàn app |
| Tính toán trong render | **Trung bình** | SearchableDropdown sort/filter mỗi render; ExplorePage list nặng không memo |
| ESLint thiếu rule | **Trung bình** | Không có react core, jsx-a11y, no-console, type-aware rules |
| Console.* tràn lan | **Trung bình** | `no-console` (chỉ cảnh báo); build gỡ `log`/`info`/`debug`; còn `warn`/`error` có chủ đích |
| Không virtualization | **Thấp-TB** | FlaggedResponseList đã ảo hóa (`@tanstack/react-virtual`); Explore/Sidebar… chưa |
| Test coverage mỏng | **Thấp-TB** | E2E mạnh (Playwright), unit test hooks/services yếu |
| Dependencies dư | **Thấp** | `react-force-graph` (chỉ dùng `-2d`), có thể `d3-force` |

---

## P0 — Critical Performance

### P0.1 — Fix AuthProvider re-render cascade

**File**: `src/contexts/AuthContext.tsx`

**Vấn đề**: `AuthContext.Provider value={{...}}` tạo object mới mỗi lần `AuthProvider` render → tất cả consumer `useAuth()` re-render.

**Giải pháp**:
```tsx
const value = useMemo(
  () => ({ user: store.user, isAuthenticated: store.isAuthenticated, isLoading: store.isLoading, login, logout, setUser }),
  [store.user, store.isAuthenticated, store.isLoading, login, logout, setUser],
);
return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

**Effort**: ~15 phút  
**Impact**: Giảm re-render cascade cho mọi component dùng `useAuth()`

---

### P0.2 — Zustand selector thay vì subscribe toàn store

**Files**: Mọi file import `useAuthStore()` không selector

**Vấn đề**: `const { user } = useAuthStore()` → component re-render khi **bất kỳ** field trong store đổi (isLoading, isAuthenticated, ...) dù chỉ cần `user`.

**Giải pháp**: Thay `useAuthStore()` bằng selector cụ thể:
```tsx
// Trước
const { user } = useAuthStore();
// Sau
const user = useAuthStore((s) => s.user);
```

**Files cần sửa** (ước tính):
- `src/components/layout/MainLayout.tsx`
- `src/pages/ModerationPage.tsx`
- `src/contexts/AuthContext.tsx`
- Các file khác dùng `useAuthStore()` — grep toàn bộ

**Effort**: ~1 giờ  
**Impact**: Giảm đáng kể re-render không cần thiết ở shell/layout level

---

### P0.3 — Song song hóa sequential API calls

**File**: `src/features/researcher/hooks/useResearcherData.ts`

**Vấn đề**: 4 API call reference data chạy **tuần tự** (`await getEthnicGroups()` → `getCeremonies()` → `getInstruments()` → `getCommunes()`) dù hoàn toàn **độc lập**.

**Giải pháp**:
```tsx
const [ethnicGroups, ceremonies, instruments, communes] = await Promise.all([
  referenceDataService.getEthnicGroups(),
  referenceDataService.getCeremonies(),
  referenceDataService.getInstruments(),
  referenceDataService.getCommunes(),
]);
```

**Files khác cần kiểm tra**: Grep `await.*get.*\n.*await.*get` pattern trong hooks/

**Effort**: ~30 phút  
**Impact**: Giảm thời gian load trang Researcher từ ~4x sequential → ~1x parallel

---

### P0.4 — Memo hóa ExplorePage list rendering

**File**: `src/pages/ExplorePage.tsx` (~634 dòng)

**Vấn đề**: Mỗi item trong `deferredRecordings.map()` render JSX nặng (metadata pairs, display pairs, nhiều helper call) → mỗi lần parent re-render, tất cả item tính lại.

**Giải pháp**:
1. Tách `ExploreResultRow` component riêng
2. Bọc `React.memo(ExploreResultRow)`
3. Ổn định handler props với `useCallback`

**Effort**: ~1.5 giờ  
**Impact**: Giảm đáng kể render cost cho trang Explore (trang chính của app)

---

## P1 — High-Impact Quality

### P1.1 — Thống nhất HTTP client (migrate axios → apiFetch)

**Vấn đề**: Hai stack HTTP song song:
- **openapi-fetch** (`apiFetch` + `apiOk`) — type-safe, dùng cho phần lớn service
- **axios** (`api` từ `src/services/api.ts`) — legacy, interceptors khác

**Files còn dùng axios**:
| File | Endpoints |
|------|-----------|
| `src/services/authService.ts` | `/auth/me`, verify OTP, profile, đổi mật khẩu |
| `src/services/geocodeService.ts` | Geocoding |
| `src/services/metadataSuggestService.ts` | Metadata suggest |
| `src/features/admin/hooks/useAdminDashboardData.ts` | `/Instrument`, `/Recording`, `/EthnicGroup`, `/Admin/submissions` |
| `src/features/upload/hooks/useUploadSubmission.ts` | `/AIAnalysis/analyze-only` (multipart) |
| `src/services/recordingService.ts` | Guest API client |
| `src/services/researcherChatService.ts` | AI chat (via `aiApiClient`) |

**Giải pháp**: Migrate từng file sang `apiFetch` + `apiOk`, ưu tiên:
1. `authService.ts` (dùng nhiều nhất)
2. `useAdminDashboardData.ts` (nhiều endpoint)
3. Các service nhỏ còn lại

**Effort**: ~4–6 giờ (chia nhỏ theo service)  
**Impact**: Một stack HTTP duy nhất → error handling nhất quán, giảm bundle (loại bỏ axios)

---

### P1.2 — ESLint rules bổ sung

**File**: `.eslintrc.cjs` + `tsconfig.eslint.json` (project cho type-aware rules)

**Đã triển khai**:
- DevDependency: `eslint-plugin-react`, `eslint-plugin-jsx-a11y`
- `extends`: thêm `plugin:react/jsx-runtime` (không bật `plugin:react/recommended` / `plugin:jsx-a11y/recommended` toàn phần — tránh hàng trăm vi phạm UI/media; có thể bật dần sau)
- Rules: `react/jsx-key`, `react/jsx-no-target-blank`, `jsx-a11y/alt-text`, `jsx-a11y/anchor-is-valid`, `no-console: ["error", { allow: ["warn", "error"] }]`
- Type-aware (theo `tsconfig.eslint.json`): `@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises` (với `checksVoidReturn.attributes: false` cho handler React)
- `src/api/generated.d.ts`: tắt `@typescript-eslint/naming-convention` (schema OpenAPI dùng tên `paths`, `components`, …)

**Effort**: ~2 giờ  
**Impact**: Bắt lỗi sớm hơn, promise/console nhất quán; a11y theo subset có kiểm soát

---

### P1.3 — Giảm `as unknown as` trong lớp API

**Vấn đề**: Nhiều service gọi `apiFetch` + `apiOk` với `as unknown as Promise<{ data?; error?; response }>` lặp lại.

**Đã triển khai** (`src/api/client.ts`):
- `ApiEnvelope<T>` + `apiOk<T>(Promise<ApiEnvelope<T>>)` (cùng shape với trước)
- `asApiEnvelope<T>(promise: unknown)` — **một chỗ** ép kiểu sang envelope thay cho `as unknown as Promise<{...}>` rải rác
- `openApiQueryRecord<T>(query)` — thay `params as unknown as Record<string, unknown>` khi query không khớp generated
- `apiFetchLoose` — `GET/POST/PUT/DELETE/PATCH` dạng `(path, init?)` cho path chưa có / khác trong OpenAPI
- Các service (`recordingService`, `submissionService`, `knowledgeBaseApi`, `recordingRequestService`, …) gọi `asApiEnvelope` / `openApiQueryRecord` / `apiFetchLoose` thay vì double-cast dài.

**Còn lại có chủ đích**: vài chỗ UI/DTO (`as unknown as Record`, DTO runtime) hoặc `as unknown as CopyrightDisputeDto` khi schema không overlap — có thể thu hẹp sau khi chỉnh Swagger/types.

**Effort**: ~3–4 giờ  
**Impact**: Một pattern gọi API; dễ tìm và thay khi `generated.d.ts` khớp BE hơn

---

### P1.4 — Thêm useMemo cho SearchableDropdown

**File**: `src/components/common/SearchableDropdown.tsx`

**Vấn đề**: `.map().filter().sort()` chain chạy **mỗi lần render** dù `options` và `debouncedSearch` chưa đổi.

**Đã triển khai**: `filteredOptions` bọc trong `useMemo`, phụ thuộc `[options, normalizedQuery]` (sau `normalizeSearchText(debouncedSearch)`); bên trong memo: `sanitized` → lọc/sắp theo score khi có query.

**Effort**: ~20 phút  
**Impact**: Dropdown mượt hơn khi có nhiều options

---

### P1.5 — Hợp nhất 2 SearchableDropdown

**Files**:
- `src/components/common/SearchableDropdown.tsx`
- ~~`src/components/features/upload/SearchableDropdown.tsx`~~ (đã xóa)

**Vấn đề**: Hai component gần giống nhau, API hơi khác → maintenance gấp đôi, behavior không nhất quán.

**Đã triển khai**: Một component ở `common/SearchableDropdown.tsx` với `variant?: 'default' | 'upload'`. `upload` giữ styling panel/nút/dòng chọn (gradient) và chọn lại cùng giá trị để xóa; lọc dùng chung `normalizeSearchText` + `scoreSearchOption` + debounce như `default`. `UploadMusic` bọc `UploadSearchableDropdown` (`variant="upload"`) truyền vào `MetadataStepSection`.

**Effort**: ~1.5 giờ  
**Impact**: DRY, một nơi chỉnh hành vi tìm kiếm/portal

---

## P2 — Medium Optimizations

### P2.1 — Vite manualChunks cho vendor splitting

**File**: `vite.config.ts`

**Vấn đề**: Không có `build.rollupOptions.output.manualChunks` → Vite/Rollup tự tách chunk nhưng có thể gom vendor lớn vào 1 chunk.

**Đã triển khai**: `manualChunks(id)` theo đường dẫn module (ổn với Windows/npm): `vendor-react` (react, react-dom, scheduler, react-router*), `vendor-charts` (recharts), `vendor-editor` (@tiptap + prosemirror), `vendor-xlsx` (xlsx).

**Verification**: `npm run build:analyze` → so sánh chunk sizes trước/sau

**Effort**: ~30 phút  
**Impact**: Cache hiệu quả hơn (vendor ít đổi → cache lâu hơn); initial load nhỏ hơn

---

### P2.2 — Virtualization cho danh sách dài

**Vấn đề**: Không có thư viện virtualization; `FlaggedResponseList` fetch 500 rows render **hết**.

**Files cần xem xét**:
- ~~`src/components/features/ai/FlaggedResponseList.tsx`~~ — đã dùng `@tanstack/react-virtual` (`useVirtualizer`, `measureElement`, `gap: 12`, vùng cuộn `max-h-[min(70vh,36rem)]`)
- `src/pages/ExplorePage.tsx` (20/trang nhưng JSX nặng)
- `src/components/features/moderation/ModerationQueueSidebar.tsx`

**Đã triển khai**: `npm install @tanstack/react-virtual`; chỉ render các hàng trong viewport (+ overscan).

**Effort**: ~2 giờ  
**Impact**: DOM nhẹ hơn nhiều cho danh sách hàng trăm mục; Explore/Sidebar vẫn có thể áp dụng sau

---

### P2.3 — Dọn console.* trong production

**Vấn đề**: Nhiều `console.log/warn/error/info/debug` rải rác — ồn log, có thể lộ thông tin.

**Đã triển khai**:
1. ESLint `no-console: ["warn", { allow: ["warn", "error"] }]` — còn `warn`/`error` hợp lệ; vi phạm `log`/`info`/`debug` là **cảnh báo** (không chặn build).
2. `logServiceError` / `logServiceWarn` / `logServiceInfo` trong `src/services/serviceLogger.ts` — dùng khi báo lỗi domain có gửi Sentry (error) hoặc chỉ DEV (warn/info).
3. Build production: `@rollup/plugin-strip` trong `vite.config.ts` (khi `command === 'build'`) gỡ `console.log`, `console.info`, `console.debug` và `debugger`; bỏ qua `node_modules` / `.vite`.

**Effort**: ~1.5 giờ  
**Impact**: Bundle prod không còn lệnh debug/info/log; `console.warn`/`error` giữ cho xử lý lỗi tại chỗ

---

### P2.4 — Reference data caching layer

**Vấn đề**: `referenceDataService.getInstruments()`, `getEthnicGroups()`, `getCeremonies()`, `getCommunes()` được gọi từ **nhiều trang** mà không cache → mỗi trang navigate fetch lại.

**Đã triển khai** (`src/services/referenceDataService.ts`): cache module-level theo key + `cachedFetch` (phân trang đầy đủ); `getDistrictsByProvince` / `getCommunesByDistrict` cache theo id; TTL **10 phút**; `clearCache()`.

**Lưu ý**: `expertModerationApi.ts` có lookup TTL 15 phút — tách domain.

**Effort**: ~1 giờ  
**Impact**: Giảm đáng kể request trùng khi chuyển trang dùng cùng reference data

---

### P2.5 — Tách/giảm file page lớn

**Trạng thái**: ✅ Hoàn tất (theo phạm vi batch 1 + 2; các page còn >800 dòng vẫn có thể tách thêm khi cần).

**Snapshot kích thước** (ước lượng theo số dòng file, cập nhật 2026-04-18):

| File | ~Dòng | Ghi chú |
|------|-------|---------|
| `src/components/features/UploadMusic.tsx` | ~972 | Đã tách `UploadSearchableDropdown`; có thể tách thêm wizard/preview/metadata. |
| `src/pages/ContributionsPage.tsx` | ~379 | Đã tách list + modal chi tiết (xem batch 2). |
| `src/pages/ModerationPage.tsx` | ~700 | Luồng approve/reject đã tách sang `src/features/moderation/utils/moderationApproveReject.ts` (`confirmModerationApprove`, `executeModerationReject`); page còn wizard/overlay/dialog. |
| `src/pages/admin/AdminDashboard.tsx` | ~520 | Đã tách tab panels (batch 1). |

**Đã triển khai (batch 1)**:
- **AdminDashboard**: `AdminDashboardAnalyticsPanel`, `AdminDashboardAiMonitoringPanel`, `AdminDashboardModerationPanel` (`src/components/admin/`) — page chỉ còn wiring + dialog/guide/footer.
- **ContributionsPage**: format/type media (`formatRecordingDurationLabel`, `formatRecordingFileSizeMb`, `SubmissionRecordingMedia`) chuyển sang `contributionDisplayUtils.ts`.
- **UploadMusic**: `UploadSearchableDropdown` tách sang `components/features/upload/UploadSearchableDropdown.tsx`.
- **ModerationPage**: đã có nhiều module con (`ModerationPageDialogs`, `ModerationDetailView`, …); logic approve/reject dài vẫn trong page — có thể tách thêm sau.

**Đã triển khai (batch 2)**:
- **ContributionsPage**: `ContributionsListSection` (`src/components/features/contributions/ContributionsListSection.tsx`) — lỗi/loading/empty/cards/phân trang; `ContributionsDetailModal` (`ContributionsDetailModal.tsx`) — toàn bộ modal chi tiết (media, metadata, timeline phiên bản, nút Sửa/Cập nhật/Đóng). Trang chỉ giữ state, fetch, filter tabs, `ConfirmationDialog` xóa.

**Effort**: ~4–6 giờ tổng  
**Impact**: Dễ maintain, review, test; giảm re-render scope

---

### P2.6 — Unit test coverage cho hooks/services quan trọng

**Trạng thái**: ✅ Batch đầu đã triển khai (Vitest + Testing Library).

**Vấn đề**: Unit test mỏng — chủ yếu utils + vài component. Hooks/services core **không có test**.

**Đã triển khai (batch 1)**:
| Mục | File test | Nội dung chính |
|-----|-----------|----------------|
| `httpError` | `src/utils/httpError.test.ts` | `getHttpStatus`, `getHttpUrl`, `getErrorMessage` |
| `embargoApi` | `src/services/embargoApi.test.ts` | Circuit breaker sau 404; `resetEmbargoUnavailableForTests()` trong `embargoApi.ts` để reset giữa test |
| `expertQueueProjection` | `src/features/moderation/utils/expertQueueProjection.test.ts` | `normalizeQueueStatus`, `projectModerationLists` (filter + sort) |
| `useExploreData` | `src/hooks/useExploreData.test.tsx` | Mock `loadExploreRecordings` — success, lỗi hiển thị, bỏ qua khi abort |
| `authStore` | `src/stores/authStore.test.ts` | Mock `authService` — login OK/lỗi, logout, `fetchCurrentUser` (skip / success), `clearError` |

**Có thể mở rộng sau**: coverage `setUser` (IndexedDB), thêm case `fetchCurrentUser` khi API lỗi nhưng còn stored user.

**Framework**: Vitest + `@testing-library/react` (đã cài)

**Effort**: ~3–4 giờ cho batch đầu  
**Impact**: Confidence khi refactor; catch regression sớm

---

## P3 — Low Priority / Nice-to-Have

**Trạng thái**: Đã triển khai batch đầu (P3.1–P3.3 + ghi nhận P3.4); các file còn lại trong P3.2 có thể xử lý dần.

### P3.1 — Loại bỏ dependencies dư

| Package | Lý do nghi dư |
|---------|---------------|
| `react-force-graph` | Chỉ dùng `react-force-graph-2d` trong src |
| `d3-force` | Không import trực tiếp (có thể transitive) |
| `axios` | Sau khi P1.1 hoàn tất, có thể gỡ hoàn toàn |

**Đã triển khai**: Gỡ `react-force-graph`, `d3-force`, `@types/d3-force` khỏi `package.json` (đã xác nhận không dùng trong `src`). `axios` không còn trong dependencies — bỏ qua.

**Verification**: `npx knip` hoặc `npx depcheck` (tùy chọn định kỳ)

---

### P3.2 — Inline style → CSS/className

**Vấn đề**: Nhiều `style={{...}}` tạo object mới mỗi render → memo con mất tác dụng.

**Files**: `MainLayout.tsx`, `VideoPlayer.tsx`, `AudioPlayer.tsx`, `SearchBarPrimitives.tsx`, `Header.tsx`

**Giải pháp**: Chuyển sang Tailwind classes hoặc `useMemo` cho stable reference.

**Đã triển khai (một phần)**: `MainLayout.tsx` — nền cream `bg-[#FFF2D6]`; object style cho `main` bọc `useMemo` theo `backgroundAttachment`.

---

### P3.3 — Polling → Visibility-aware

**Files**: `ModerationPage.tsx` (8s), `useAdminDashboardData.ts` (30s), `useNotificationFeedEngine.ts`

**Vấn đề**: Polling chạy ngay cả khi tab không active → wasted bandwidth/battery.

**Giải pháp**: Wrap interval với `document.visibilityState === 'visible'` check hoặc dùng `Page Visibility API`.

**Đã triển khai**:
- Hook `src/hooks/usePollWhileVisible.ts` — chạy ngay khi mount; interval chỉ gọi khi tab **visible**; `visibilitychange` → chạy lại khi quay lại tab.
- `ModerationPage`, `useAdminDashboardData` dùng hook này (8s / 30s).
- `useNotificationFeedEngine` — `pollUnreadTick` + bỏ qua khi `hidden`, refresh khi tab **visible**.

---

### P3.4 — Accessibility audit

**Vấn đề**: Cần quy tắc a11y nhất quán cho JSX.

**Đã có trong repo**: `eslint-plugin-jsx-a11y` (devDependency) + plugin trong `.eslintrc.cjs`; rules bật: `jsx-a11y/alt-text`, `jsx-a11y/anchor-is-valid` (cùng các rule ESLint/React core).

**Có thể mở rộng sau**: bật thêm rule từ `plugin:jsx-a11y/recommended` từng nhóm và sửa vi phạm (có thể nhiều).

---

## Phase X — Verification

### Checklist sau mỗi phase

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero warnings (hoặc chỉ pre-existing)
- [ ] `npm run build` — success
- [ ] `npm run build:analyze` — so sánh chunk sizes với baseline
- [ ] `npm run test` — all tests pass
- [ ] Manual smoke test: Explore, Upload, Moderation, Admin pages
- [ ] Lighthouse Performance score (trước/sau)

### Công cụ đo lường khuyến nghị

| Công cụ | Mục đích |
|---------|----------|
| `npm run build:analyze` | Bundle size visualization |
| React DevTools Profiler | Component re-render count |
| Lighthouse (Chrome) | Performance/Accessibility score |
| `npx knip` | Unused exports/dependencies |
| `vitest --coverage` | Unit test coverage % |
| Chrome Performance tab | Runtime performance profiling |

### Thứ tự thực hiện khuyến nghị

```
P0.1 (AuthProvider memo)
  → P0.2 (Zustand selectors)
    → P0.3 (Parallel API calls)
      → P0.4 (ExplorePage memo)
        → P1.1 (Migrate axios → batch 1: auth)
          → P1.2 (ESLint rules)
            → P1.4 (SearchableDropdown useMemo)
              → P2.1 (Vite manualChunks)
                → P2.4 (Reference data cache)
                  → P2.2 (Virtualization)
                    → P2.5 (Tách file lớn) ✓
                      → P1.1 cont. (Migrate axios → batch 2+)
                        → P2.6 (Unit tests) ✓
                          → P3 (batch 1) ✓
```

---

## Ước tính tổng effort

| Phase | Effort | Items |
|-------|--------|-------|
| P0 | ~3.5 giờ | 4 items |
| P1 | ~11–13 giờ | 5 items |
| P2 | ~12–14 giờ | 6 items |
| P3 | ~4–5 giờ | 4 items |
| **Tổng** | **~30–35 giờ** | **19 items** |
