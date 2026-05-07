# PLAN: Production-Ready Refactor — VietTune Frontend

> **Created:** 2026-04-12  
> **Last updated:** 2026-04-12 (**Phase 7.3** — full **`api` generics** sweep: no **`api.*<unknown>`** in `src/services` + **`ApiVoidResponse`** for void mutations; earlier: **UploadMusic** / **ResearcherPortal** / **api/storage**)  
> **Stack:** React 18 + TypeScript + Vite + Zustand + Supabase + Tailwind  
> **Scope:** Full `src/` audit — Clean Code, Performance, Error Handling, Naming, Architecture  
> **Status:** 🟢 **Phase checklist complete (§Execution Order 0–7)** — large orchestrators, §4.1–4.2 partials, and **Files Index** Tier 2/3 are **ongoing backlog**, not open phases. Branch: **`FE-API`** (see § **Next recommended steps**).

---

## Implementation status (2026-04-12)

Summary of **merged refactors** to date (not exhaustive of every commit):

| Area | Done | Notes |
|------|------|--------|
| **UploadMusic** | **Phase 1.1 done** | Hooks + `useUploadRecordingLoader`, `useUploadEditReferenceEffects`, `uploadFormValidation`, `UploadConfirmDialogs`. **`useUploadDialogChrome`** — body-scroll lock + global Escape for confirm/success dialogs (2026-04-12). **`UploadMusic.tsx` ~970 lines** (PowerShell `Measure-Object -Line`). Still in page: `handleNextStep`, `beforeunload` / `useBlocker` guards. |
| **AdminDashboard** | **Phase 1.2 done** | `useAdminDashboardData`, `adminDashboardTypes`, dropdowns, stats grids, user table, request panels, recording table extracted; page ~820 lines (PowerShell `Measure-Object -Line`). |
| **ContributionsPage** | **Phase 1.5 done** | + **`contributionFilterConstants`**, **`useContributionsStatusTabA11y`**, **`ContributionFilters`** (mobile tabs, desktop sidebar, collapsible legend). Page ~953 lines; detail modal still in page. |
| **ModerationPage** | **Phase 1.4 done** | **`ModerationDetailView`**, **`moderationDisplayMerge`**, **`ModerationPageDialogs`** (verification wizard + reject portal + confirmation modals). Page ~915 lines; state/handlers/effects stay on page. |
| **ResearcherPortalPage** | **Phase 1.3 (tabs) done** | **`useResearcherData`** + search UI; **`ResearcherPortalQATab`**, **`ResearcherPortalGraphTab`**, **`ResearcherPortalCompareTab`** (2026-04-12). Page **~605 lines**; Search tab + play modal + QA state/API glue remain on page. |
| **VideoPlayer / SearchBar** | **Phase 1.6 done** | **`useVideoPlayback`** + `useVideoDataUrlSource` (inside hook); **`searchBarConstants`**, **`searchBarDomUtils`**, **`SearchBarPrimitives`**. `VideoPlayer.tsx` ~873 lines; `SearchBar.tsx` ~419 lines (PowerShell line count). |
| **Phase 2.1 (page data hooks)** | **Done (priority routes)** | **`useRecordingDetail`**, **`useApprovedRecordings`**, **`useExploreData`**, **`useChatbotSession`**. Ethnicities / Instruments / Masters are **static** (no API). **`ProfilePage`** profile-save/delete logic still inline — optional `useProfileData` later. |
| **Phase 3.1 (bare `.then` / unhandled `await`)** | **Done (listed sites)** | **Header** + **NotificationPage**: `.catch` / `reloadNotifications` + `fetchError` UI + `try/catch` on mark-read; **ModerationVerificationWizardDialog** `.catch` on `resolveCulturalContextForDisplay`. Admin **`useAdminDashboardData`** request loads use `.catch`. **2026-04-12:** **`api.ts`** — `.then(res => res.data)` replaced with **`async unwrap`** (explicit `Promise<T>`); **`storageService`** `getStore` / `getItemAsync` / `setItem` / `removeItem` use **`async/await`** (no bare `.then` chains). Remaining `.then` in `src/`: **Footer** (clipboard), **ModerationVerificationWizardDialog**, **useAdminDashboardData** — each chained with **`.catch`**. |
| **Phase 3.2 (error boundary UI)** | **Done** | **`ErrorFallback.tsx`** (retry + home + dev message); **`LoadingState.tsx`** (spinner + optional label, a11y); **`ErrorBoundary`** composes `ErrorFallback`; **`App.tsx`** `RouteSuspense` uses **`LoadingState`**. |
| **Phase 3.3 (`useAsyncData`)** | **Done** | **`src/hooks/useAsyncData.ts`** — `{ data, loading, error, reload }`, request-id stale guard; **`useAsyncData.test.tsx`** (4 tests). Adopt incrementally in pages that still use manual `useEffect`+`useState`. |
| **Phase 4.3 (`exhaustive-deps`)** | **Done** | **`AuthContext`**, upload hooks, **`useVideoPlayback`**, **`ModerationVerificationWizardDialog`** (`itemRef` + semantic key + `item.id`), **`useAsyncData`** (optional **`dep1`…`dep5`** so `useEffect` has a literal dependency array). No `eslint-disable` for this rule under **`src/`**. **`VideoPlayer`** logic in **`useVideoPlayback`**. |
| **Phase 4.4 (`React.memo`)** | **Done** | **`ContributionCard`**, **`ContributionStatusBadge`**, **`ContributionStageBadge`**; **`ChatMessageItem`**; **`ErrorFallback`**, **`LoadingState`**. **`RecordingCard`** / **`RecordingCardCompact`** / **`ModerationDetailView`** were already wrapped. |
| **Phase 5.1 (naming)** | **Done (listed sites)** | **`resolveReferenceDisplayStrings`**: map callbacks `ethnic` / `ceremony` / `instrument` / `province` / `vocalStyle`; **`useRecordingDetail`**: `apiResponseBody`, `rootPayload`, `recordingPayload`; **`RecordingDetailPage`**: `fields` in `readExtraString` / `readExtraNumber`. |
| **Phase 5.2 (conventions)** | **Done (baseline)** | **ESLint** (see `.eslintrc.cjs`): PascalCase for **`interface`** and **`type`** aliases. **Cursor:** `.cursor/rules/viettune-naming-conventions.mdc` mirrors the §5.2 table for components, hooks, services, constants, handlers, booleans. |
| **Phase 6.1 (notification polling)** | **Done** | **`src/hooks/useNotificationPolling.ts`** — `NOTIFICATION_POLL_INTERVAL_MS` (30s), **`reloadNotifications`**, **`unreadCount`**, optional **`trackFetchError`**; **`Header`** + **`NotificationPage`** use the hook. Mark-read actions stay on the page (service + `reloadNotifications`). |
| **Phase 6.2 (re-export cleanup)** | **Done** | Removed **`src/utils/exploreRecordingsLoad.ts`** and **`src/pages/moderation/*.ts`** re-exports (callers already used **`@/features/...`**). **`.eslintrc.cjs`**: block **`@/utils/exploreRecordingsLoad`** and **`@/pages/moderation/**`**. |
| **Phase 6.3 (duplicate hooks)** | **Done** | Removed **`src/hooks/useUploadWizard.ts`** and **`src/hooks/useKnowledgeGraphData.ts`** (thin re-exports). Canonical: **`@/features/upload/hooks/useUploadWizard`**, **`@/features/knowledge-graph/hooks/useKnowledgeGraphData`**. **`.eslintrc.cjs`** blocks **`@/hooks/useUploadWizard`** and **`@/hooks/useKnowledgeGraphData`**. |
| **Phase 7 (architecture)** | **7.3 expanded (2026-04-12)** | **7.2:** **`App.tsx`** — **`React.lazy`** + **`RouteSuspense`**. **7.1:** **`feature-module-structure.mdc`**. **7.3:** **`api.ts`** — **`unwrap`**, export **`ApiVoidResponse`** (`null` \| `undefined` \| `Record<string, unknown>`) for DELETE/PATCH/POST when body ignored; **no `api.get/post/put/patch/delete<unknown>`** under **`src/services`** — domain unions / item envelopes (**`knowledgeBaseApi`**, **`expertModerationApi`**, **`adminApi`**, **`annotationApi`**, **`embargoApi`**, **`submissionVersionApi`**, **`copyrightDisputeApi`**, **`recordingService`**, **`recordingStorage`**, **`submissionService`**, **`researcherArchiveService`**, **`researcherRecordingFilterSearch`**, **`useAdminDashboardData`**, **`analyticsApi`**, **`recordingRequestService`**, …). Optional polish: add explicit generics on **`api.post('/…')`** calls that omit `<T>` (inference). |

**Verification run in dev (Phase 0, 2026-04-12):** `npx tsc --noEmit`, `npm run lint`, `npm run test:unit` (45 tests), `npm run test:e2e:ci` (8 tests) all pass. **Re-verified after Phase 7:** `tsc`, `lint`, `test:unit` green.

**Tiếng Việt:** **Phase 1.1 (`UploadMusic`)** đã tách loader chỉnh sửa, resolver ID→tên / xã–tỉnh, validation dùng chung, modal xác nhận & thành công; **`useUploadDialogChrome`** gom khóa cuộn body + phím ESC. **Phase 1.3 (`ResearcherPortalPage`):** tab QA / biểu đồ / so sánh tách thành **`ResearcherPortalQATab`**, **`ResearcherPortalGraphTab`**, **`ResearcherPortalCompareTab`**. **Phase 7.3:** lớp **`api`** có **`ApiVoidResponse`**; các service dưới **`src/services`** không còn **`api.*<unknown>`**. **Còn backlog Phase 1 / Tier 2–3:** Admin chrome, ContributionFilters chi tiết, polling, v.v.

---

## Executive Summary

The VietTune frontend has **235 files** (107 `.tsx`, 126 `.ts`) across a well-structured SPA. Refactoring work has **reduced duplication and extracted hooks/components** in several hot spots; **large god components and mixed concerns remain** in places not yet split.

| Severity | Category | Count (original audit) | Progress |
|----------|----------|-------------------------|----------|
| 🔴 Critical | God components (>1000 LOC) | 6 | Partially addressed (smaller files, not all target ~300-line orchestrators) |
| 🔴 Critical | Mixed API + UI concerns | 40+ files | Ongoing — hooks added for upload media, contributions list, etc. |
| 🟡 Major | Missing error handling (`.then` without `.catch`) | 8+ locations (original audit) | **Core paths addressed** (§3.1 + **`api`/`storage` async**); remaining `.then` sites have **`.catch`** — see Implementation status **Phase 3.1** |
| 🟡 Major | Performance (missing memoization in large components) | 10+ files | Mostly TBD |
| 🟠 Moderate | Duplicate logic (notification polling, re-exports) | 4 patterns | **Polling:** ✅ `useNotificationPolling`; **re-exports / duplicate hooks:** ✅ §6.2–6.3 (2026-04-12) |
| 🟠 Moderate | Non-descriptive variable names | 5+ files | Partial — §5.1 done (listed files) |
| 🟢 Minor | `eslint-disable` suppressions (exhaustive-deps) | **0** under `src/` (2026-04-12 follow-up) | Prior hotspots fixed; `useAsyncData` API avoids non-literal `deps` array |

---

## Phase 0 — Pre-flight Checks

Before any refactor, ensure:

- [x] **Unit tests** — `npm run test:unit` (Vitest): **45 tests passed** (2026-04-12)
- [x] **E2E smoke (CI subset)** — `npm run test:e2e:ci`: **8 tests passed** (explore-guest, toast-smoke, upload-ui, contributions-ui, moderation-ui)
- [ ] **Full Playwright** — `npx playwright test` (all projects) — optional before large releases; CI subset covers core routes
- [x] TypeScript compiles without errors (`npx tsc --noEmit`)
- [x] ESLint passes (`npm run lint`, `--max-warnings 0`) — import/order auto-fixed + `exhaustive-deps` on `UploadMusic` / `ContributionsPage` (2026-04-12)
- [ ] Create a snapshot of current behavior (screenshot key flows) — **manual / release checklist**
- [ ] Branch strategy: create `refactor/production-ready` from `FE-API` (**optional**; work may continue on `FE-API`)

---

## Phase 1 — God Component Decomposition (Priority: 🔴 CRITICAL)

These files are dangerously large and violate Single Responsibility Principle (SRP).

### 1.1 `UploadMusic.tsx` — ~1,000 lines (was ~3,410) ✅ Phase 1.1

**Current:** Orchestrator: hooks, steps, `UploadConfirmDialogs`, shared validation, edit loader + reference resolvers in dedicated modules. **Dialog chrome:** **`useUploadDialogChrome`** (`features/upload/hooks/useUploadDialogChrome.ts`) — body-scroll lock + Escape to dismiss confirm/success overlays. **Still here:** wizard `handleNextStep`, `beforeunload` / `useBlocker` guards.

**Refactor plan:**

| New File | Responsibility | Est. Lines | Status |
|----------|---------------|----------:|:------:|
| `features/upload/uploadConstants.ts` | Shared constants + small helpers | ~115 | ✅ |
| `hooks/useUploadReferenceData.ts` | Ethnicities, provinces, districts/communes, instruments API | ~180 | ✅ |
| `hooks/useMediaUpload.ts` | File selection, MIME checks, browser metadata read, AI-analysis toggle | ~260 | ✅ |
| `hooks/useUploadForm.ts` | Metadata form state, GPS + AI-suggest handlers, submit/error + GPS UI state | ~260 | ✅ |
| `features/upload/uploadFormValidation.ts` | `validateUploadFormState`, `scrollToFirstUploadError`, `isUploadFormComplete` | ~105 | ✅ |
| `features/upload/uploadRecordingTypes.ts` | `LocalRecordingStorage`, `LoadedRecording` | ~45 | ✅ |
| `hooks/useUploadRecordingLoader.ts` | Load edit recording (storage id + session) | ~320 | ✅ |
| `hooks/useUploadEditReferenceEffects.ts` | ID→name + commune/province resolution | ~165 | ✅ |
| `components/upload/UploadConfirmDialogs.tsx` | Confirm + success `createPortal` modals | ~215 | ✅ |
| `hooks/useUploadSubmission.ts` | API submission, save draft, error handling | ~320 | ✅ |
| `components/upload/UploadFormFields.tsx` | Wrapper → `MetadataStepSection` | ~10 | ✅ |
| `components/upload/UploadMediaPreview.tsx` | Audio/video preview after upload | ~60 | ✅ |
| `components/upload/UploadWizardActions.tsx` | Wizard nav + final Reset/Save/Submit | ~150 | ✅ |
| `components/upload/SearchableDropdown.tsx` | Searchable select + portal menu | ~210 | ✅ |
| `components/upload/MultiSelectTags.tsx` | Multi-select tags (instruments) | ~200 | ✅ |
| `components/upload/UploadDatePicker.tsx` | Calendar date picker | ~400 | ✅ |
| `components/upload/UploadFormPrimitives.tsx` | `TextInput`, `FormField`, `SectionHeader`, `CollapsibleSection` | ~180 | ✅ |
| `UploadMusic.tsx` (refactored) | Orchestrator + guards + wizard glue | ~970 | 🟢 (1.1 target met) |
| `hooks/useUploadDialogChrome.ts` | Body scroll lock + Escape for upload dialogs | ~60 | ✅ |

**Key actions:**
- Extract all `useState`/`useEffect` related to form fields → `useUploadForm` — **Done** for metadata/GPS/suggest; **validation** lives in `uploadFormValidation.ts` (wired with `file` / `mediaType` from `useMediaUpload`)
- Extract `handleSave`, `handleSubmit`, API calls → `useUploadSubmission` — **Done** (`handleUploadAndCreateDraft` + `handleConfirmSubmit`)
- Move inline UI primitives out of `UploadMusic.tsx` — **Done** (table above)
- Extract edit-load `useEffect` blocks → `useUploadRecordingLoader` — **Done**
- Extract confirm + success dialogs → `UploadConfirmDialogs.tsx` — **Done**
- Centralize `validateForm` / `isFormComplete` → `uploadFormValidation.ts` — **Done**
- Replace inline `style={{...}}` in modals with Tailwind / shared tokens — **Deferred** (modals still use minimal inline animation hooks; low priority)
- ~~Fix 3 `eslint-disable exhaustive-deps` suppressions~~ — **Done** for ID→name and commune resolution effects (remaining suppressions elsewhere in file if any)

---

### 1.2 `AdminDashboard.tsx` — ~820 lines (was ~2,019) ✅ Phase 1.2

**Refactor plan:**

| New File | Responsibility | Status |
|----------|---------------|:------:|
| `features/admin/hooks/useAdminDashboardData.ts` | Load all dashboard data + derived user/monthly stats | ✅ |
| `features/admin/adminDashboardTypes.ts` | Shared types, `DEMO_USERS`, role helpers | ✅ |
| `components/admin/AdminDashboardDropdowns.tsx` | `RoleSelectDropdown`, `ExpertSelectDropdown` | ✅ |
| `components/admin/AdminRecordingTable.tsx` | Recording list + remove | ✅ |
| `components/admin/AdminRequestPanel.tsx` | `AdminRecordingRequestsPanel`, `AdminExpertDeletionPanel` | ✅ |
| `components/admin/AdminUserManagement.tsx` | User table + refresh / guide | ✅ |
| `components/admin/AdminStatsCards.tsx` | `AdminAnalyticsStatGrid`, `AdminAiMonitoringStatGrid` | ✅ |

**Key actions:**
- ~~Fix cryptic variable names (`oRaw`, `o`, `dRaw`)~~ — **Done** (`usersOverridesRaw`, `parsedUsersOverrides`, `deletedUserIdsRaw`)
- ~~Add `.catch()` to bare `.then()` chains for delete/edit recording requests~~ — **Done**
- Data loading + derived lists in `useAdminDashboardData`; UI split into components above — **Done**
- Add more `useMemo`/`useCallback` in page shell — **Optional** (hook already uses `useMemo` for aggregations)

---

### 1.3 `ResearcherPortalPage.tsx` — ~605 lines (was ~1,657) ✅ Phase 1.3 (main tabs)

**Refactor plan:**

| New File | Responsibility | Status |
|----------|---------------|:------:|
| `features/researcher/hooks/useResearcherData.ts` | Data loading, filtering, search | ✅ |
| `features/researcher/researcherPortalTypes.ts` + `researcherRecordingUtils.ts` | Shared types + recording label/citation helpers; **`ResearcherPortalChatMessage`**, **`ResearcherGraphTabView`**, **`ResearcherSelectedGraphNode`** | ✅ |
| `components/researcher/ResearcherFilterBar.tsx` | Filter controls | ✅ |
| `components/researcher/ResearcherRecordingList.tsx` | Recording grid/list | ✅ |
| `components/researcher/ResearcherExportPanel.tsx` | Export/download actions | ✅ |
| `components/researcher/ResearcherPortalQATab.tsx` | VietTune Intelligence QA + quick questions + citations sidebar | ✅ |
| `components/researcher/ResearcherPortalGraphTab.tsx` | Knowledge graph views + related recordings + stat cards | ✅ |
| `components/researcher/ResearcherPortalCompareTab.tsx` | Dual recording compare, transcript diff, expert notes | ✅ |

**Still on the page:** tab shell + **Search** tab (filters, list, play modal, export dialog), **KB** tab for experts, QA/graph/compare **state** + API helpers (`sendQaQuestion`, graph `useMemo`s, `handlePlay` / `handleDetail`).

---

### 1.4 `ModerationPage.tsx` — ~915 lines (was ~1,261)

**Refactor plan:**

| New File | Responsibility | Status |
|----------|---------------|:------:|
| Already has `hooks/useExpertQueue.ts` | Queue data | ✅ (unchanged) |
| Already has `hooks/useModerationWizard.ts` | Wizard state | ✅ (unchanged) |
| `components/features/moderation/ModerationExpertTabNav.tsx` | Expert portal tab strip | ✅ |
| `components/features/moderation/ModerationPageHeader.tsx` | Page title + back | ✅ |
| `components/features/moderation/ModerationDetailView.tsx` | Selected item detail (Review tab: media, panels, embargo, timeline) | ✅ |
| `features/moderation/utils/moderationDisplayMerge.ts` | `mergeDisplayItem` + label helpers for merged list/full item | ✅ |
| `components/features/moderation/ModerationPageDialogs.tsx` | Verification wizard + reject portal + `ModerationModals` wiring | ✅ |

**Key actions:**
- ~~Fix `eslint-disable exhaustive-deps` on selected-item and dialog recording load~~ — **Done** (proper dependency arrays)
- ~~Extract review-tab detail panel~~ — **Done** (`ModerationDetailView` + display merge utils)
- ~~Extract dialog/modal layer~~ — **Done** (`ModerationPageDialogs`)

---

### 1.5 `ContributionsPage.tsx` — ~953 lines (was ~1,137)

**Refactor plan:**

| New File | Responsibility | Status |
|----------|---------------|:------:|
| `features/contributions/hooks/useContributionsData.ts` | Fetch user submissions, filter, sort, pagination | ✅ |
| `features/contributions/contributionDisplayUtils.ts` | Status/stage labels + formatters | ✅ |
| `components/features/contributions/ContributionCard.tsx` | Single contribution card + badges | ✅ |
| `features/contributions/contributionFilterConstants.ts` | `CONTRIBUTOR_STATUS_TABS`, panel id, `MODERATION_LEGEND_STEPS` | ✅ |
| `features/contributions/hooks/useContributionsStatusTabA11y.ts` | Roving tabindex + refs for mobile/desktop status tabs | ✅ |
| `components/features/contributions/ContributionFilters.tsx` | `ContributionsMobileStatusTabs`, `ContributionsDesktopFilterAside`, `ContributionsModerationLegendCollapsible` | ✅ |

---

### 1.6 `VideoPlayer.tsx` / `SearchBar.tsx` — ✅ Phase 1.6

| New file | Responsibility | Status |
|----------|---------------|:------:|
| `hooks/useVideoPlayback.ts` | Playback state, media focus, controls/fullscreen, seek/volume, `useVideoDataUrlSource` wiring | ✅ |
| `features/search/searchBarConstants.ts` | `GENRES`, `REGIONS`, `INSTRUMENTS`, `GENRE_ETHNICITY_MAP`, `REGION_TO_LABEL`, etc. | ✅ |
| `features/search/searchBarDomUtils.ts` | `isClickOnScrollbar` | ✅ |
| `components/features/search/SearchBarPrimitives.tsx` | `SearchableDropdown`, `MultiSelectTags`, `FormField`, `CollapsibleSection` | ✅ |
| `VideoPlayer.tsx` (refactored) | UI + `handleContainerClick` (navigate to detail) | ~873 lines |
| `SearchBar.tsx` (refactored) | Filter form orchestration | ~419 lines |

- **VideoPlayer:** `useVideoPlayback` owns refs, listeners, play/pause/seek/volume/fullscreen; component keeps **navigation** (`useNavigate` / `useLocation` + `handleContainerClick`).
- **SearchBar:** still uses `useButtonAnchorRect` inside **`SearchBarPrimitives`** (`SearchableDropdown`). Upload flow remains on `upload/MultiSelectTags.tsx` (separate implementation).

---

## Phase 2 — Separate Logic from UI (Priority: 🔴 CRITICAL)

### 2.1 Create custom hooks for pages with direct API calls — ✅ priority pages (2026-04-12)

Currently **40+ `.tsx` files** import from `@/services/...` and call APIs directly in component bodies. **Implemented hooks:**

| Hook | File | Notes |
|------|------|--------|
| `useRecordingDetail` | `src/hooks/useRecordingDetail.ts` | Loads recording (+ annotations, embargo, disputes); **`refetchDisputes`** after dispute modal success |
| `useApprovedRecordings` | `src/hooks/useApprovedRecordings.ts` | Approved list + 30s poll for delete/edit queues; **`refreshRequestQueues`** after mutations |
| `useExploreData` | `src/hooks/useExploreData.ts` | Wraps `loadExploreRecordings` + loading / totals / `searchError` |
| `useChatbotSession` | `src/hooks/useChatbotSession.ts` | Conversation history list + **`loadHistory`** |

**Not applicable / deferred:** `EthnicitiesPage`, `InstrumentsPage`, `MastersPage` are **static content** (no service calls). **`ProfilePage`**: auth + storage orchestration remains in the page; extract **`useProfileData`** when/if desired.

**Pattern to follow:**

```typescript
// ❌ BEFORE — API call in component
function MyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    myService.getData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return loading ? <Spinner /> : <div>{data}</div>;
}

// ✅ AFTER — Hook encapsulates data fetching
function useMyPageData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await myService.getData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, reload: load };
}

function MyPage() {
  const { data, loading, error, reload } = useMyPageData();
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (loading) return <Spinner />;
  return <div>{data}</div>;
}
```

**Files needing this treatment (priority order):**

| File | Service Imports | New Hook |
|------|----------------|----------|
| `RecordingDetailPage.tsx` | 5+ services | ✅ `useRecordingDetail` |
| `ApprovedRecordingsPage.tsx` | recording + request services | ✅ `useApprovedRecordings` |
| `ExplorePage.tsx` | explore load utils | ✅ `useExploreData` |
| `ChatbotPage.tsx` | chat services | ✅ `useChatbotSession` (history sidebar) |
| `EthnicitiesPage.tsx` | — | N/A — static page |
| `InstrumentsPage.tsx` | — | N/A — static page |
| `MastersPage.tsx` | — | N/A — static page |
| `ProfilePage.tsx` | auth + storage services | Optional — `useProfileData` TBD |

---

## Phase 3 — Error Handling (Priority: 🟡 MAJOR)

### 3.1 Fix bare `.then()` chains — add `.catch()` or convert to `async/await` with `try/catch` — ✅ priority sites (2026-04-12) + **central `api` / storage** (2026-04-12)

| Location | Current Code | Fix |
|----------|-------------|-----|
| ~~`AdminDashboard.tsx` (delete/edit request loads)~~ | ~~`.then(setDeleteRecordingRequests)`~~ | ✅ **`useAdminDashboardData`**: `.catch()` + reset to `[]` |
| ~~`Header.tsx`~~ | ~~`.then(setNotifications)`~~ | ✅ Shared `load()` with `.catch` → `console.error` + `setNotifications([])` |
| ~~`NotificationPage.tsx`~~ | ~~`.then` / bare `await`~~ | ✅ `reloadNotifications` + `fetchError` banner; mark-read / mark-all in `try/catch` + toast |
| ~~`ApprovedRecordingsPage.tsx` (expert polling)~~ | ~~bare `.then` on requests~~ | ✅ **`useApprovedRecordings`** uses `Promise.all` + `try/catch` |
| ~~`ModerationVerificationWizardDialog.tsx`~~ | ~~`void resolve(...).then(...)`~~ | ✅ `.catch` + `console.warn` on `resolveCulturalContextForDisplay` |
| ~~`NotificationPage.tsx` (mutations)~~ | ~~`await` without `try/catch`~~ | ✅ Wrapped with toast on failure |
| **`api.ts`** | ~~`.then((res) => res.data)` on every verb~~ | ✅ **`async unwrap<T>(promise)`** — returns **`Promise<T>`**; callers use **`try/catch`** or **`.catch`**; JSDoc notes reject behavior |
| **`storageService.ts`** | ~~`openDB().then` / `getStore().then`~~ | ✅ **`async` `getStore`**, **`async` `getItemAsync` / `setItem` / `removeItem`** — no promise chains without upstream error path |

### 3.2 Create a shared error boundary — ✅ (2026-04-12)

| File | Role |
|------|------|
| `components/common/ErrorBoundary.tsx` | Class boundary + `reportError`; default UI via **`ErrorFallback`** |
| `components/common/ErrorFallback.tsx` | Reusable full-page or **embedded** error UI; **Thử lại** / **Về trang chủ**; dev error message |
| `components/common/LoadingState.tsx` | **`LoadingSpinner`** + optional label, `role="status"`, used by **`App.tsx`** route `Suspense` fallback |

**Before:** `ErrorBoundary` inlined ~40 lines of fallback JSX. **After:** same behavior, shared `ErrorFallback` for manual use elsewhere.

### 3.3 Standardize loading/error state pattern — ✅ (2026-04-12)

**`src/hooks/useAsyncData.ts`** — `useAsyncData<T>(fetcher, dep1?, dep2?, …)` (up to five optional deps) returns **`{ data, loading, error, reload }`**. Stale/overlapping requests are ignored via a **monotonic request id** (not `AbortSignal`, so existing services work unchanged). Errors normalized to a string message.

**Tests:** `src/hooks/useAsyncData.test.tsx` (load success, rejection, `reload`, dep change).

---

## Phase 4 — Performance Optimization (Priority: 🟡 MAJOR)

### 4.1 Memoize expensive computations

| File | Issue | Fix |
|------|-------|-----|
| `UploadMusic.tsx` | ~1,430 lines; handlers still mostly inline | ✅ `useCallback` for media-type / reset-file / lyrics handlers passed to steps; `SearchBarPrimitives` already memoize dropdown options |
| `AdminDashboard.tsx` | ~2100 lines, only 4 memoizations | ✅ `useMemo` for `expertOptions` (from `usersOverrides`), wizard `steps`; hook already memoizes user/trend data |
| `ModerationPage.tsx` | Large render tree | Queue already `useMemo`; ✅ `ModerationDetailView` wrapped in `React.memo` |
| `SearchBar.tsx` | Portal position calculations inline | Primitives already `useMemo` `filteredOptions`; ✅ `useCallback` for search / clear / key handlers |

**2026-04-12:** Partial pass — highest-churn props stabilized; further memo on upload step children optional if profiling warrants it.

### 4.2 Eliminate inline object/array creation in JSX

| Pattern | Occurrences | Fix |
|---------|------------|-----|
| `style={{ ... }}` in JSX | Cream panel `#FFFCF5` was widespread | ✅ Tailwind `surface.panel` → `bg-surface-panel`; portal dropdowns keep only dynamic position/size in `style`; modals use `bg-surface-panel` + `animate-[slideUp_0.3s_ease-out]` where applicable; hover fills use `hover:bg-[#F5F0E8]` / `hover:bg-cream-50` instead of DOM style mutation |
| `onClick={() => { setState(...); setState(...); }}` | Common across pages | Remaining hotspots optional: extract to `useCallback` when passed to memo children (see §4.1) |
| `options={[...]}` inline arrays | Filter components | Prefer constants / `useMemo` where lists are large or unstable (incremental) |

**2026-04-12:** Theme extended with `surface.panel`; helper script `scripts/migrate-surface-panel-styles.mjs` merged many `style={{ backgroundColor: '#FFFCF5' }}` cases; **`scripts/sync-surface-panel-token.mjs`** replaced remaining arbitrary `#FFFCF5` in classes with `*-surface-panel` (gradients, ring-offset, etc.); Chatbot / Researcher compare use `from-surface-panel` in gradients instead of inline CSS.

### 4.3 Fix `eslint-disable exhaustive-deps` suppressions ✅ (2026-04-12)

| File | Line | Action |
|------|------|--------|
| `UploadMusic.tsx` | ID→name + instrument / commune chain effects | ✅ Deps expanded; inline `eslint-disable` removed for those blocks |
| `ModerationPage.tsx` | Recording load effects | ✅ Proper deps (`applyOverlayToRecording`, setters, etc.) |
| `AuthContext.tsx` | mount init | ✅ `initialize()` reads `useAuthStore.getState()` so the effect can use `[]` without stale closures |
| `useUploadRecordingLoader.ts` | edit load | ✅ `settersRef` for inline setters object; deps `[isEditModeParam, recordingId, searchParams]` |
| `useUploadReferenceData.ts` | reference load | ✅ Split: static ethnicities/instruments/provinces in `[]`; districts+communes when edit / recording id |
| `useVideoPlayback.ts` | fullscreen / playing | ✅ `useCallback` for hide-controls helpers; module-level delay constant; no suppressions |
| `ModerationVerificationWizardDialog.tsx` | cultural context | ✅ `itemRef` + effect deps `[culturalContextKey, item.id]` (no object-only dep churn) |
| `VideoPlayer.tsx` | — | — No `exhaustive-deps` disables in component; playback in `useVideoPlayback` |
| `useAsyncData.ts` | fetch / deps | ✅ Optional **`dep1`…`dep5`** — `useEffect(..., [dep1, …, dep5])` is an array literal (ESLint); `fetcher` via `fetcherRef` |

### 4.4 Consider `React.memo` for pure sub-components ✅ (2026-04-12)

| Component | Notes |
|-----------|--------|
| `RecordingCard.tsx`, `RecordingCardCompact.tsx` | Already `memo` + default export |
| `ModerationDetailView.tsx` | Already `memo` default export |
| `ContributionCard.tsx` | **`ContributionStatusBadge`**, **`ContributionStageBadge`**, **`ContributionCard`** wrapped with `memo` |
| `ChatMessageItem.tsx` | Default export wrapped with `memo` (list messages) |
| `ErrorFallback.tsx`, `LoadingState.tsx` | Default export wrapped with `memo` (shared boundary / suspense UI) |

Further optional targets (if profiling shows benefit): modal bodies inside large pages, more list rows — incrementally.

---

## Phase 5 — Naming Convention (Priority: 🟠 MODERATE)

### 5.1 Fix non-descriptive variable names ✅ (2026-04-12)

| File | Current | Proposed |
|------|---------|----------|
| ~~`AdminDashboard.tsx` (local storage overrides)~~ | ~~`oRaw`, `o`, `dRaw`~~ | ✅ `usersOverridesRaw`, `parsedUsersOverrides`, `deletedUserIdsRaw` |
| `resolveReferenceDisplayStrings.ts` (lookup maps) | `e`, `c`, `i`, `p`, `v` in `.map` | ✅ `ethnic`, `ceremony`, `instrument`, `province`, `vocalStyle` (domain-accurate vs. plan’s generic labels) |
| `useRecordingDetail.ts` (`pickRecordingFromApiBody`) | `b`, `nested` | ✅ `apiResponseBody`, `rootPayload`, `recordingPayload` |
| `RecordingDetailPage.tsx` (`readExtraString` / `readExtraNumber`) | `r` | ✅ `fields` |

### 5.2 Enforce consistent naming conventions ✅ (2026-04-12)

Reference table (human + AI agents; **`.cursor/rules/viettune-naming-conventions.mdc`**):

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UploadMediaPreview` |
| Hooks | camelCase with `use` prefix | `useUploadForm` |
| Services | camelCase with descriptive suffix | `recordingService` ✅ (already good) |
| Types/Interfaces | PascalCase, no `I` prefix | `Recording`, `UserProfile` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Event handlers | `handle` + Event | `handleSubmit`, `handleFileSelect` |
| Boolean state | `is`/`has`/`should` prefix | `isLoading`, `hasError` |

**Automated:** `.eslintrc.cjs` — `@typescript-eslint/naming-convention` **`error`** on **`interface`** and **`typeAlias`** → **PascalCase** (matches types/interfaces row). Other rows remain convention + code review / Cursor rule.

---

## Phase 6 — Eliminate Duplication (Priority: 🟠 MODERATE)

### 6.1 Notification polling — extract shared hook ✅ (2026-04-12)

**Implemented:** `src/hooks/useNotificationPolling.ts` — `NOTIFICATION_POLL_INTERVAL_MS` (30_000), initial load + interval, `reloadNotifications`, `unreadCount`, optional `trackFetchError` for **`NotificationPage`**. **`Header`** uses `enabled: isAuthenticated && !!user?.role` without surfacing fetch errors (dropdown behavior unchanged).

**Note:** `markRead` / `markAllRead` remain on **`NotificationPage`** (calls `recordingRequestService` + `reloadNotifications()`), matching the previous UX.

**Future (optional):** a single global provider could dedupe fetches when both header and `/notifications` mount; not required for Phase 6.1.

### 6.2 Clean up re-export indirection ✅ (2026-04-12)

**Done:**
- Deleted **`src/utils/exploreRecordingsLoad.ts`** (unused; **`useExploreData`** already imports **`@/features/explore/utils/exploreRecordingsLoad`**).
- Deleted eight **`src/pages/moderation/*.ts`** one-line re-exports (no remaining imports; **`ModerationPage`** and components already use **`@/features/moderation/...`**).
- **`.eslintrc.cjs`**: `no-restricted-imports` — **`@/utils/exploreRecordingsLoad`** and pattern **`@/pages/moderation/**`**.

### 6.3 Duplicate hook files ✅ (2026-04-12)

**Done:** `UploadMusic` and **`ResearcherPortalPage`** already imported from **`@/features/...`**. Removed thin **`export *`** shims:
- **`src/hooks/useUploadWizard.ts`**
- **`src/hooks/useKnowledgeGraphData.ts`**

**ESLint:** `no-restricted-imports` entries for **`@/hooks/useUploadWizard`** and **`@/hooks/useKnowledgeGraphData`** (see `.eslintrc.cjs`).

---

## Phase 7 — Architecture Improvements (Priority: 🟢 NICE-TO-HAVE)

### 7.1 Standardize feature module structure ✅ (guideline, 2026-04-12)

Target layout (for **new** work; existing code migrates incrementally):

```
src/features/{domain}/
  ├── components/       # Domain-specific UI
  ├── hooks/            # Domain-specific hooks
  ├── services/         # Optional — domain API (many APIs still under src/services/)
  ├── types/            # Optional — domain-only types
  ├── utils/            # Domain helpers
  └── index.ts          # Optional barrel
```

**`.cursor/rules/feature-module-structure.mdc`** applies when editing under **`src/features/**`**.

### 7.2 Route-level code splitting ✅ (already implemented)

**`src/App.tsx`:** route pages use **`React.lazy(() => import('./pages/...'))`** and **`RouteSuspense`** wrapping **`Suspense`** with **`LoadingState`**. No further change required for Phase 7.2.

### 7.3 API layer improvements ✅ (typed helpers + service sweep, 2026-04-12)

- **Interceptors:** **`src/services/api.ts`** — `apiClient` request (bearer token) + response (**`attachNormalizedApiError`**, 401 policy).
- **Unwrap:** **`unwrap<T>`** + **`api.get/post/put/patch/delete` → `Promise<T>`** (no `.then` in the helper).
- **`ApiVoidResponse`:** exported from **`api.ts`** — use for mutations that ignore **`res.data`** (204 / empty `{}`).
- **GET:** all former **`api.get<unknown>`** in **`src/services`** (and admin hook **`useAdminDashboardData`**) replaced with list/envelope unions or domain-specific types.
- **POST/PUT/PATCH/DELETE:** all former **`api.*<unknown>`** in **`src/services`** replaced with **`ApiVoidResponse`** or entity envelopes (e.g. **`EmbargoItemResponse`**, **`SubmissionVersionItemResponse`**, **`CopyrightDisputeItemResponse`**).
- **Cancellation:** **`config.signal`** on **`api.*`** (JSDoc on **`api`**).
- **Follow-up (optional):** calls like **`api.post('/Review', …)`** without an explicit `<T>` still rely on inference — can add generics when editing those lines.

---

## Execution Order & Estimates

| Phase | Task | Priority | Est. Effort | Dependencies |
|-------|------|----------|-------------|--------------|
| 0 | Pre-flight checks | 🟢 | — | tsc + lint + Vitest + `test:e2e:ci` verified 2026-04-12; screenshots/branch optional |
| 1.1 | Split `UploadMusic.tsx` (orchestrator + dialogs/loader) | 🟡 | polish optional | Phase 0 — **partial:** hooks + **`useUploadDialogChrome`**; orchestrator **~970 LOC** |
| 1.2 | Split `AdminDashboard.tsx` | 🔴 | 5h | Phase 0 |
| 1.3 | Split `ResearcherPortalPage.tsx` | 🟢 | — | **Search** + data hook + **QA / graph / compare** tab components (2026-04-12); page **~605 LOC**; optional: thin search tab further |
| 1.4 | Split `ModerationPage.tsx` | 🟢 | — | **`ModerationDetailView`**, **`moderationDisplayMerge`**, **`ModerationPageDialogs`** (wizard + reject portal + `ModerationModals`); page ~915 lines |
| 1.5 | Split `ContributionsPage.tsx` | 🟢 | — | Filters + a11y hook + constants extracted 2026-04-12; detail modal / list body remain |
| 1.6 | Split `VideoPlayer` + `SearchBar` | 🟢 | — | `useVideoPlayback`, `searchBarConstants`, `SearchBarPrimitives` (2026-04-12) |
| 2.1 | Hooks for priority data pages | 🟢 | — | Detail, Approved, Explore, Chatbot (2026-04-12); Profile optional |
| 3.1 | Fix bare `.then()` chains | 🟢 | — | Header, NotificationPage, wizard dialog + **`api`/`storage` async** (2026-04-12); see §3.1 |
| 3.2 | Error boundary + fallback | 🟢 | — | `ErrorFallback`, `LoadingState`, boundary refactor (2026-04-12) |
| 3.3 | `useAsyncData` utility hook | 🟢 | — | Implemented + Vitest (2026-04-12) |
| 4.1 | Add memoization | 🟢 | — | **Partial** (2026-04-12): AdminDashboard `expertOptions`/`steps`, SearchBar handlers, UploadMusic step handlers, `ModerationDetailView` memo |
| 4.2 | Fix inline objects in JSX | 🟢 | — | **Partial** (2026-04-12): `bg-surface-panel`, portal/menu cleanup, Pagination & upload labels without DOM `style` on hover |
| 4.3 | Fix exhaustive-deps | 🟢 | — | **Done** (2026-04-12): including `useAsyncData` API + wizard `itemRef`; no `eslint-disable` for this rule in `src/` |
| 4.4 | Add `React.memo` | 🟢 | — | **Done** (2026-04-12): contributions cards + badges, chat message row, `ErrorFallback` / `LoadingState`; recording cards + moderation detail already memoized |
| 5.1 | Fix non-descriptive locals (listed files) | 🟢 | — | **Done** (2026-04-12): see §5.1 |
| 5.2 | Naming conventions (enforce baseline) | 🟢 | — | **Done** (2026-04-12): ESLint interfaces + type aliases; Cursor rule §5.2 table |
| 6.1 | Notification polling hook | 🟢 | — | **Done** (2026-04-12): `useNotificationPolling` |
| 6.2 | Re-export cleanup | 🟢 | — | **Done** (2026-04-12): removed thin files + ESLint |
| 6.3 | Duplicate hook files (`useUploadWizard`, `useKnowledgeGraphData`) | 🟢 | — | **Done** (2026-04-12): deleted `src/hooks` shims + ESLint |
| 7.1 | Feature module guideline | 🟢 | — | **Done** (2026-04-12): Cursor rule `feature-module-structure.mdc` |
| 7.2 | Route-level lazy + Suspense | 🟢 | — | **Already in `App.tsx`** (2026-04-12 verified) |
| 7.3 | API interceptors + cancel + types | 🟢 | — | **2026-04-12:** **`ApiVoidResponse`** + full sweep — no **`api.*<unknown>`** under **`src/services`**; optional explicit `<T>` on bare **`api.post`** elsewhere |

**Total estimated effort: ~57 hours** (cumulative; **Phase 1 partial work already saves a fraction** of 1.1–1.6 estimates above)

**What this table does not list as separate rows (see other sections):**

| Topic | Where detailed | Notes |
|--------|----------------|--------|
| **Full Playwright** (all projects) | §Phase 0 | Optional release gate; CI uses `test:e2e:ci` only |
| **Screenshots / branch `refactor/production-ready`** | §Phase 0 | Manual / optional |
| **`useProfileData` (ProfilePage)** | §2.1 table | Optional hook — not required for “priority routes” |
| **Remaining `.then` / error-handling hotspots** | Executive Summary “Missing error handling” | **2026-04-12:** `src/` scan — only **Footer**, **ModerationVerificationWizardDialog**, **useAdminDashboardData** use `.then`; all paired with **`.catch`**. **`api`/`storage`** refactored to **`async/await`**. |
| **Further memoization / perf** | §4.1, Executive Summary | Marked **Partial** — profiling-driven follow-ups |
| **Tier 2/3 files** (AudioPlayer, MetadataStepSection, …) | §Files Index | Backlog, not phase-numbered |

**Table vs status:** Row **1.2** matches **done**; **1.1** / **1.3** rows updated for **2026-04-12** (orchestrator LOC + Researcher tab splits). **Implementation status** is authoritative for what shipped — execution table “Est. Effort” is historical / polish only.

---

## Verification Checklist (Phase X — Post-Refactor)

**Last aligned with repo scripts / CI (2026-04-12).** Re-run before each release.

- [x] `npx tsc --noEmit` — zero type errors
- [x] `npm run lint` — `--max-warnings 0` (no new warnings)
- [x] `npm run test:unit` — Vitest (45 tests in snapshot; re-run counts current)
- [x] `npm run test:e2e:ci` — Playwright **CI subset** (8 tests: explore-guest, toast-smoke, upload-ui, contributions-ui, moderation-ui)
- [ ] `npx playwright test` — **full** suite (all projects) — optional before major releases; not required for day-to-day merges if CI subset is green
- [x] No new `eslint-disable` for `react-hooks/exhaustive-deps` under `src/` (Phase 4.3 policy)
- [ ] No new `any` — spot-check when touching files; not a global gate
- [ ] Bundle size acceptable — `npm run build` before major releases
- [ ] Manual smoke — key flows (see §Phase 0 screenshots note)
- [ ] Browser console clean on smoke paths — manual

---

## Files Index — Full Refactor Targets

### Tier 1 — Must refactor (>1000 LOC or critical issues)

Line counts below are **approximate** (PowerShell `Get-Content | Measure-Object -Line`, 2026-04-12); re-run after large edits.

| File | ~Lines | Issues |
|------|------:|--------|
| `components/features/UploadMusic.tsx` | ~970 | Orchestrator + **`useUploadDialogChrome`**; still: load effects, validate, portals, nav guards |
| `pages/admin/AdminDashboard.tsx` | ~820 | Phase 1.2 split; orchestrator + moderation/AI/analytics chrome |
| `pages/researcher/ResearcherPortalPage.tsx` | ~605 | Phase 1.3: **`ResearcherPortalQATab`**, **`ResearcherPortalGraphTab`**, **`ResearcherPortalCompareTab`** + search tab / play modal on page |
| `pages/ModerationPage.tsx` | ~915 | Phase 1.4: detail + dialog layer extracted; state/effects remain on page |
| `pages/ContributionsPage.tsx` | ~953 | Phase 1.5: `ContributionFilters` + `useContributionsStatusTabA11y`; modal + pagination still in page |
| `components/features/VideoPlayer.tsx` | ~873 | Phase 1.6: `useVideoPlayback` + UI; tier-1 threshold cleared |
| `hooks/useVideoPlayback.ts` | ~416 | Playback + blob URL resolution |
| `components/features/SearchBar.tsx` | ~419 | Phase 1.6: constants + primitives extracted |
| `features/search/searchBarConstants.ts` | ~316 | Filter option lists + `REGION_TO_LABEL` |
| `components/features/search/SearchBarPrimitives.tsx` | ~382 | Dropdowns + sections |

### Tier 2 — Should refactor (300–1000 LOC or moderate issues)
| File | Lines | Issues |
|------|------:|--------|
| `components/features/AudioPlayer.tsx` | 920 | Large, performance |
| `components/features/upload/steps/MetadataStepSection.tsx` | 880 | Large form component |
| `pages/RecordingDetailPage.tsx` | 872 | 5+ service imports, cryptic names |
| `components/features/moderation/ModerationVerificationWizardDialog.tsx` | 759 | **`resolveCulturalContextForDisplay`** uses **`.catch`** (§3.1); still large — optional further split |
| `pages/ExplorePage.tsx` | 692 | Mixed concerns |
| `pages/ApprovedRecordingsPage.tsx` | 647 | Missing error handling |
| `services/expertWorkflowService.ts` | 550 | Large service file |
| `components/features/moderation/ModerationModals.tsx` | 534 | Large modal collection |
| `pages/ProfilePage.tsx` | 520 | Mixed concerns |
| `components/layout/Header.tsx` | ~517 | Uses **`useNotificationPolling`** (2026-04-12); layout + dropdowns remain |

### Tier 3 — Consider refactoring (200–300 LOC or minor issues)
- `components/features/annotation/AnnotationPanel.tsx` (457)
- `pages/HomePage.tsx` (437)
- `services/recordingRequestService.ts` (430)
- `pages/InstrumentsPage.tsx` (430)
- `components/features/upload/steps/MediaUploadStep.tsx` (411)
- And 20+ more files between 200–400 lines

---

## Notes

- **Type safety is good** — minimal `any` usage, `unknown` for error catches; **Phase 7.3:** service **`api.*`** calls no longer use **`<unknown>`**; void mutations use **`ApiVoidResponse`**
- **State management (Zustand) is clean** — 5 focused stores
- **Service layer is well-organized** — 40 service files with clear responsibilities
- **Test infrastructure exists** — Vitest + Playwright + Testing Library
- **No breaking API changes** — all refactors are internal, API contracts unchanged
- **New / moved modules (Phase 1 slice):** `src/features/upload/uploadConstants.ts`, `useUploadReferenceData.ts`, `useMediaUpload.ts`, `useUploadForm.ts`, `useUploadSubmission.ts`, **`useUploadDialogChrome.ts`**, `components/features/upload/{UploadFormFields,UploadMediaPreview,UploadWizardActions,SearchableDropdown,MultiSelectTags,UploadDatePicker,UploadFormPrimitives}.tsx`, `features/contributions/hooks/useContributionsData.ts`, `contributionFilterConstants.ts`, `useContributionsStatusTabA11y.ts`, `contributionDisplayUtils.ts`, `components/features/contributions/{ContributionCard,ContributionFilters}.tsx`, `moderation/ModerationExpertTabNav.tsx`, `ModerationPageHeader.tsx`, `ModerationDetailView.tsx`, `ModerationPageDialogs.tsx`, `features/moderation/utils/moderationDisplayMerge.ts`, `hooks/useVideoDataUrlSource.ts`, `hooks/useButtonAnchorRect.ts`, **`components/researcher/{ResearcherPortalQATab,ResearcherPortalGraphTab,ResearcherPortalCompareTab}.tsx`**

---

## Next recommended steps

1. **UploadMusic (§1.1):** optional — further shrink orchestrator (**`handleNextStep`**, step-only callbacks) if profiling or review warrants it; line-count target is a guide, not a blocker. ~~**`useUploadDialogChrome`**~~ **done.**
2. **ResearcherPortalPage (§1.3):** optional — extract **Search** tab shell (filters + list + play modal) if the page should stay under a stricter LOC budget; ~~QA / graph / compare tab components~~ **done.**
3. **ProfilePage:** optional **`useProfileData`** when/if profile save/delete logic should leave the page (§2.1).
4. **Executive Summary gaps:** **mixed API+UI** in large pages; **§4.1** memo pass on hot lists if profiling shows need. ~~`.then` audit~~ — **see §3.1** (2026-04-12).
5. **§7.3:** ~~tighten **`api.*<unknown>`** in services~~ **done (2026-04-12)** — see §7.3; optional: explicit generics on **`api.post`** / **`api.put`** lines that omit `<T>`; optional **`AbortController`** on long-running loads using **`api.*(..., { signal })`**.
6. **Release:** run **full Playwright** + **screenshot smoke** (§Phase 0) before major releases; **`npm run build`** bundle check.
