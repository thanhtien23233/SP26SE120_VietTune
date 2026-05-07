# PLAN — Frontend Full-Source Refactoring

> **Scope:** entire `src/` directory (React + TypeScript + Vite SPA)
> **Branch:** `FE-API`
> **Created:** 2026-04-04
> **Status:** IMPLEMENTED through Phase 7 (remaining cleanup/verification items tracked below)

---

## 0. Current State Snapshot

| Metric | Value |
|--------|-------|
| Total files under `src/` | 148 (76 `.ts`, 70 `.tsx`, 2 other) |
| Largest file | `UploadMusic.tsx` — **4 673 lines** |
| Files > 500 lines | 8 (listed in §1) |
| Zustand stores | 5 (`auth`, `player`, `media`, `notification`, `search`) |
| Service files | 31 |
| Custom hooks | 3 |
| Unit tests | 2 (both in `uiToast/__tests__/`) |
| `any` / `as unknown as` escapes | ~6 locations |
| Duplicated utilities | `safeArray` × 4, `SearchableDropdown` × 2 |

---

## 1. Priority Matrix

Outcomes ranked by impact × effort (H = high, M = medium, L = low):

| # | Outcome | Impact | Effort | Priority |
|---|---------|--------|--------|----------|
| 1 | **Architecture — break God components** | H | H | P0 |
| 2 | **Readability — consistent patterns** | H | M | P0 |
| 3 | **API layer cleanup** | H | M | P1 |
| 4 | **Typing — eliminate `any`, split types** | M | M | P1 |
| 5 | **Folder structure** | M | M | P1 |
| 6 | **Testability** | M | H | P2 |
| 7 | **Performance** | M | L–M | P2 |

---

## 2. Phase Breakdown

### Phase 1 — God Component Decomposition (P0)

The top priority: files that are unmaintainably large.

#### 1A. `UploadMusic.tsx` (4 673 lines → target < 300 each)

**Current state:** Single monolith mixing form state, validation, multi-step wizard UI, file handling, API calls, toast logic, and conditional rendering for audio/video/YouTube.

**Refactoring plan:**

| New file | Responsibility | Est. lines |
|----------|---------------|------------|
| `src/components/features/upload/UploadWizard.tsx` | Top-level wizard shell (step navigation, progress bar) | 80–120 |
| `src/components/features/upload/steps/BasicInfoStep.tsx` | Title, artist, genre, date fields | 120–180 |
| `src/components/features/upload/steps/CulturalContextStep.tsx` | Region, ethnicity, instruments, event type | 120–180 |
| `src/components/features/upload/steps/MediaUploadStep.tsx` | Audio/video file picker, YouTube URL input, preview | 150–200 |
| `src/components/features/upload/steps/MetadataStep.tsx` | Lyrics, transcription, tuning, modal structure | 120–160 |
| `src/components/features/upload/steps/ReviewStep.tsx` | Summary preview before submit | 100–140 |
| `src/hooks/useUploadWizard.ts` | Multi-step wizard state machine (current step, validation, navigation) | 80–120 |
| `src/hooks/useFileUpload.ts` | File selection, size validation, preview URL management | 60–100 |
| `src/services/uploadOrchestrator.ts` | Coordinates `uploadService` + `submissionService` calls | 60–80 |

**Approach:**
1. Extract the custom hook first (state + logic) — the component becomes purely presentational.
2. Split UI into step components.
3. Keep `UploadMusic.tsx` as a thin re-export or delete it, updating `UploadPage.tsx` to use `UploadWizard`.

#### 1B. `ModerationPage.tsx` (1 744 lines → target < 250 each)

**Current state:** Mixes queue list, detail panel, verification wizard trigger, reject form, claim actions, and 6+ dialog states in one component.

**Refactoring plan:**

| New file | Responsibility |
|----------|---------------|
| `src/pages/ModerationPage.tsx` | Thin shell: layout + routes between queue and detail |
| `src/components/features/moderation/ModerationLayout.tsx` | Two-panel layout (sidebar + detail) |
| `src/hooks/useModerationQueue.ts` | Queue fetching, filtering, pagination, claim/unclaim |
| `src/hooks/useModerationDetail.ts` | Single-submission detail state, approve/reject actions |

Most moderation sub-components already exist (`ModerationClaimActions`, `ModerationQueueSidebar`, etc.). The page just needs to delegate to them instead of inlining everything.

#### 1C. `AdminDashboard.tsx` (1 683 lines)

**Refactoring plan:**

| New file | Responsibility |
|----------|---------------|
| `src/pages/admin/AdminDashboard.tsx` | Thin shell with tab navigation |
| `src/components/admin/tabs/OverviewTab.tsx` | Stats cards, charts |
| `src/components/admin/tabs/UsersTab.tsx` | User management table |
| `src/components/admin/tabs/RecordingsTab.tsx` | Recording management |
| `src/components/admin/tabs/RequestsTab.tsx` | Delete/edit requests panel |
| `src/hooks/useAdminDashboard.ts` | Data fetching, tab state, CRUD actions |

#### 1D. `ResearcherPortalPage.tsx` (1 572 lines)

**Refactoring plan:**

| New file | Responsibility |
|----------|---------------|
| `src/pages/researcher/ResearcherPortalPage.tsx` | Layout shell |
| `src/components/researcher/RecordingExplorer.tsx` | Filter + table for researcher recordings |
| `src/components/researcher/ResearcherChat.tsx` | Chat panel (currently inline axios calls → use `researcherChatService`) |
| `src/components/researcher/ArchivePanel.tsx` | Archive view |
| `src/hooks/useResearcherPortal.ts` | Data, filters, state |

#### 1E. `VideoPlayer.tsx` (1 240 lines) & `AudioPlayer.tsx` (856 lines)

**Refactoring plan:**

| New file | Responsibility |
|----------|---------------|
| `src/components/features/player/VideoPlayer.tsx` | Video-specific rendering |
| `src/components/features/player/AudioPlayer.tsx` | Audio-specific rendering |
| `src/components/features/player/PlayerControls.tsx` | Shared play/pause/seek/volume UI |
| `src/components/features/player/WaveformDisplay.tsx` | Waveform rendering (extracted from AudioPlayer) |
| `src/hooks/useMediaPlayer.ts` | Shared playback state, time tracking, keyboard shortcuts |

---

### Phase 2 — API Layer Cleanup (P1)

#### 2A. Eliminate dual HTTP clients

**Problem:** `qaMessageService`, `qaConversationService`, `researcherChatService`, and inline calls in `ResearcherPortalPage` use raw `axios` instead of the shared `api` wrapper.

**Action:**
- Replace all `axios.get/post(...)` with `api.get/post(...)` from `@/services/api`.
- Remove direct `axios` imports from service files.
- This ensures consistent auth headers, error normalization, and 401 handling everywhere.

#### 2B. Consolidate response envelope parsing

**Problem:** `safeArray` / `safeObject` duplicated in `adminApi.ts`, `analyticsApi.ts`, `knowledgeBaseApi.ts`, `recordingRequestService.ts`, plus `extractSubmissionRows` / `pickRecordingRows` elsewhere.

**Action:**
- Create `src/utils/apiHelpers.ts`:
  ```ts
  export function unwrapItems<T>(data: unknown): T[]
  export function unwrapData<T>(data: unknown): T
  export function unwrapPaginated<T>(data: unknown): PaginatedResponse<T>
  ```
- Replace all inline `safeArray` / `safeObject` / `extractSubmissionRows` variants with unified helpers.

#### 2C. Deduplicate status mapping

**Problem:** `submissionApiMapper.mapApiSubmissionStatusToModeration` and `expertQueueProjection.normalizeQueueStatus` do the same conceptual mapping.

**Action:** Keep one canonical function in `submissionApiMapper.ts`, import it in `expertQueueProjection.ts`.

---

### Phase 3 — Typing & Type Safety (P1)

#### 3A. Split `types/index.ts` (363 lines → domain modules)

| New file | Contents |
|----------|----------|
| `src/types/user.ts` | `User`, `UserRole`, auth form types |
| `src/types/recording.ts` | `Recording`, `RecordingMetadata`, `LocalRecording`, enums |
| `src/types/reference.ts` | `Ethnicity`, `Region`, `Instrument`, `Performer` |
| `src/types/api.ts` | `ApiResponse`, `PaginatedResponse`, `SearchFilters`, `SearchResult` |
| `src/types/moderation.ts` | `ModerationStatus`, moderation-related request types |
| `src/types/notification.ts` | `AppNotification`, `DeleteRecordingRequest`, etc. |
| `src/types/index.ts` | Re-exports everything (barrel file for backward compat) |

#### 3B. Remove `any` escapes

| Location | Fix |
|----------|-----|
| `KnowledgeGraphViewer.tsx` (`any` × 4) | Type `node` as `GraphNode`, `link` as `GraphLink`; use `ForceGraphMethods` from `react-force-graph` for ref |
| `submissionApiMapper.ts` (`as unknown as LocalRecording`) | Build object incrementally with proper field mapping instead of blanket cast |

#### 3C. Consistent enum usage

- Some services pass raw strings (`"PENDING_REVIEW"`) where `ModerationStatus.PENDING_REVIEW` should be used.
- Add ESLint rule or review pass to ensure enum references are used consistently.

---

### Phase 4 — Folder Structure Realignment (P1)

**Current structure issues:**
- `src/config/` AND `src/constants/` both hold configuration (redundant split).
- `src/pages/moderation/` has hooks that belong in `src/hooks/` or `src/hooks/moderation/`.
- No `features/` grouping beyond `components/features/` — services and hooks are flat.

**Proposed structure:**

```
src/
├── app/                          # App shell
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx                # Route definitions extracted from App.tsx
├── components/
│   ├── common/                   # Generic reusable (Button, Input, Badge, etc.)
│   ├── layout/                   # Header, Footer, MainLayout
│   └── ui/                       # Merge BackgroundPatterns, etc.
├── features/                     # Feature modules (co-located)
│   ├── upload/
│   │   ├── components/           # UploadWizard, steps
│   │   ├── hooks/                # useUploadWizard, useFileUpload
│   │   └── services/             # uploadOrchestrator
│   ├── moderation/
│   │   ├── components/           # ModerationQueue, DetailPanel, etc.
│   │   ├── hooks/                # useModerationQueue, useModerationDetail
│   │   ├── types/                # localRecordingQueue.types.ts
│   │   └── utils/                # queueStatusMeta, expertQueueProjection
│   ├── player/
│   │   ├── components/           # AudioPlayer, VideoPlayer, PlayerControls
│   │   └── hooks/                # useMediaPlayer
│   ├── chatbot/
│   │   ├── components/           # ChatMessageItem, ChatSidebar
│   │   └── hooks/
│   ├── researcher/
│   │   ├── components/
│   │   └── hooks/
│   ├── admin/
│   │   ├── components/           # Dashboard tabs, Guards
│   │   └── hooks/
│   ├── explore/
│   │   └── utils/                # exploreRecordingsLoad, exploreGuestFilters, etc.
│   └── knowledge-graph/
│       ├── components/
│       └── hooks/
├── hooks/                        # Truly generic hooks (useDebounce, useMediaQuery)
├── pages/                        # Thin page shells only (import from features/)
│   ├── admin/
│   ├── auth/
│   └── researcher/
├── services/                     # Shared API services (api.ts, authService, storageService, etc.)
├── stores/                       # Zustand stores
├── types/                        # Shared domain types (split per §3A)
├── config/                       # Merge constants/ into config/
├── uiToast/                      # Toast system (already self-contained)
└── utils/                        # Generic utilities (apiHelpers, validation, etc.)
```

**Key principle:** Feature modules are **co-located** (component + hook + service + type live together). Shared/cross-feature code stays in top-level `services/`, `types/`, `hooks/`, `utils/`.

> **Migration note:** This is a big structural change. Use `git mv` to preserve history. Update all `@/` imports. Can be done incrementally, feature by feature.

---

### Phase 5 — Readability & Consistency (P0)

#### 5A. Formatting & imports

- [ ] Enforce consistent quote style (single quotes — align with ESLint + Prettier).
- [ ] Add **Prettier** (not currently in `package.json`) with `.prettierrc`:
  ```json
  { "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
  ```
- [ ] Sort imports: add `eslint-plugin-import` with `import/order` rule.
- [ ] Run `prettier --write src/` once to normalize everything.

#### 5B. Remove dead code

- `clearAllLocalRecordings` in `recordingStorage.ts` — logs and returns; either implement or delete.
- `BackgroundPatterns.jsx` — legacy JSX duplicate of `.tsx` version; delete.
- Unused `eslint-disable` comments — audit after Prettier pass.

#### 5C. Eliminate `SearchableDropdown` duplicate

- Keep `src/components/common/SearchableDropdown.tsx` as the single source.
- Delete `src/components/features/moderation/SearchableDropdown.tsx`.
- Update moderation imports.

#### 5D. Console cleanup

- Replace `console.error` / `console.warn` in services with `errorReporting.ts` (Sentry).
- Gate remaining `console.*` behind `import.meta.env.DEV`.

#### 5E. Auth pattern unification

- Some pages use `useAuth()` (from `AuthContext`), others use `useAuthStore` directly.
- **Decision:** Keep `useAuth()` as the public API; deprecate direct `useAuthStore` imports outside `AuthContext.tsx` and `authService.ts`.

---

### Phase 6 — Testability (P2)

#### 6A. Unit test coverage targets

| Module | Current | Target | Strategy |
|--------|---------|--------|----------|
| `uiToast` | 2 tests | 6+ | Add edge cases for `normalizeApiError`, `uiToast` |
| Hooks (new) | 0 | 1 per hook | Use `@testing-library/react-hooks` or Vitest + `renderHook` |
| API helpers | 0 | 4+ | Test `unwrapItems`, `unwrapPaginated`, status mappers |
| Utils | 0 | 6+ | `validation.ts`, `searchText.ts`, `youtube.ts`, `routeAccess.ts` |

#### 6B. Dependency injection for services

- Status: completed for first service batch (`qaConversationService`, `qaMessageService`, `metadataSuggestService`, `geocodeService`).
- Introduced service factories that accept injected clients while preserving existing function exports for runtime compatibility.
- Added factory-level tests that inject mocked clients directly (no module mocking).

#### 6C. Component testing

- After God component decomposition, add Vitest + `@testing-library/react` for:
  - `UploadWizard` step navigation
  - `ModerationLayout` panel toggling
  - `PlayerControls` play/pause behavior

Status: completed.

- Added `src/components/features/moderation/ModerationQueueSidebar.test.tsx` for moderation queue panel interactions (filter pills, keyboard selection, empty-state messaging).
- Added `src/components/researcher/SingleTrackPlayer.test.tsx` for play/pause control behavior with WaveSurfer event mocking and missing-audio fallback.

---

### Phase 7 — Performance (P2)

#### 7A. Code splitting (lazy routes)

Currently all pages are eagerly imported in `App.tsx`. Switch to:

```tsx
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const ModerationPage = lazy(() => import('@/pages/ModerationPage'));
// ... etc.
```

Wrap in `<Suspense fallback={<LoadingSpinner />}>`.

**Expected impact:** Initial bundle drops significantly; admin/researcher/moderation pages only load when visited.

Status: completed.

- Converted route pages in `src/App.tsx` to `lazy()` imports with shared `<Suspense>` fallback.
- Verified build output now emits route-level chunks (no single monolithic app chunk for pages).

#### 7B. Memoization

- Heavy list renderers (`ExplorePage`, `ContributionsPage`) should use `React.memo` on card components and `useMemo` for filtered/sorted arrays.
- `RecordingCardCompact` and `RecordingCard` are good candidates for `React.memo`.

Status: completed.

- Added `React.memo` wrappers for `RecordingCard` and `RecordingCardCompact`.
- Added memoized instrument lookup map in `ContributionsPage` and removed repeated linear lookups while rendering list cards.

#### 7C. Image optimization

- Evaluate adding `loading="lazy"` to cover images in recording cards.
- Consider `srcset` / responsive images if cover images are served in multiple sizes.

Status: completed.

- Added `loading="lazy"` + `decoding="async"` for list/detail media surfaces (`RecordingCard`, `RecordingCardCompact`, `SingleTrackPlayer`) with explicit `width`/`height` hints to reduce layout shift.
- Added `loading="eager"` + `fetchPriority="high"` for above-the-fold brand logos (`Header`, `HomePage`, auth pages) to keep first paint stable.
- `srcset`/responsive image sizing remains a future enhancement once backend serves multiple image sizes.

#### 7D. Bundle analysis

- Add `rollup-plugin-visualizer` to `vite.config.ts` (dev only) to identify heavy dependencies.
- `react-force-graph` and `d3-force` are heavy — ensure they're only loaded on the knowledge graph page (lazy import).

Status: completed.

- Added `rollup-plugin-visualizer` to `vite.config.ts`, gated by `BUNDLE_ANALYZE=true` or `--mode analyze`.
- Added script `build:analyze` in `package.json` to generate `dist/bundle-report.html`.

### Phase X — Final Quality Gate Closeout (P0)

Goal: close the remaining automated verification gaps and produce a stable handoff baseline.

Status: completed.

- Cleared all remaining lint import-order warnings across touched files (including large page/components).
- Re-ran full quality gates after cleanup:
  - `npm run lint`
  - `npm run test:unit`
  - `npx tsc --noEmit`
  - `npm run build`
  - `npm run test:e2e:ci`
- Confirmed all above commands pass successfully.

---

## 3. Execution Order & Dependencies

```
Phase 5A (Prettier)     ← Do FIRST to avoid noisy diffs in later phases
     │
     ▼
Phase 1A–1E (God components)  ← Biggest impact
     │
     ├── Phase 2A–2C (API cleanup)     ← Can parallel with 1
     ├── Phase 3A–3C (Typing)          ← Can parallel with 1
     │
     ▼
Phase 4 (Folder restructure)  ← After components are split, easier to move
     │
     ▼
Phase 5B–5E (Readability)     ← After structure is stable
     │
     ▼
Phase 6 (Testability)         ← After interfaces are clean
Phase 7 (Performance)         ← After architecture is settled
```

**Suggested sprint allocation:**

| Sprint | Phases | Estimated effort |
|--------|--------|-----------------|
| Sprint 1 | 5A (Prettier) + 1A (UploadMusic) | 3–4 days |
| Sprint 2 | 1B (ModerationPage) + 1C (AdminDashboard) | 3–4 days |
| Sprint 3 | 1D (ResearcherPortal) + 1E (Players) + 2A–2C | 3–4 days |
| Sprint 4 | 3A–3C (Types) + 4 (Folder restructure) | 2–3 days |
| Sprint 5 | 5B–5E (Readability) + 6 (Tests) + 7 (Performance) | 3–4 days |

---

## 4. Verification Checklist (Phase X)

Latest verified state from implementation runs:

- [x] **Build:** `npm run build` passes with zero errors
- [x] **Lint:** `npm run lint` passes with zero warnings
- [x] **Types:** `npx tsc --noEmit` passes
- [x] **Tests:** `npm run test:unit` passes; coverage ≥ target
- [x] **E2E:** `npm run test:e2e:ci` passes (existing Playwright suite)
- [x] **Bundle:** Initial JS bundle < 500 KB gzipped (measured via `npm run build:analyze`)
- [ ] **No regressions:** Manual smoke test all pages (explore, upload, moderation, admin, researcher, chatbot, profile, auth)
- [ ] **No `any`:** `grep -r ": any\|as any" src/ --include="*.ts" --include="*.tsx"` returns zero
- [ ] **No duplicate utils:** Single `safeArray`, single `SearchableDropdown`, single status mapper
- [ ] **Console clean:** No `console.log/warn/error` outside `import.meta.env.DEV` guards
- [ ] **Git history:** All moves done via `git mv` to preserve blame

---

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality during decomposition | High | Run E2E suite after each component extraction; keep feature branches small |
| Import path breakage after folder restructure | Medium | Use `@/` alias consistently; run `tsc --noEmit` after every move batch |
| Merge conflicts with parallel feature work | Medium | Coordinate with team; do Prettier pass first in a single commit so everyone rebases |
| Over-engineering the folder structure | Low | Only move files that clearly belong to a feature module; keep flat when in doubt |

---

## 6. Files Affected (Summary)

| Category | Count | Key files |
|----------|-------|-----------|
| Components to split | 5 | `UploadMusic`, `VideoPlayer`, `AudioPlayer`, `ModerationPage`, `AdminDashboard` |
| Components to delete | 2 | `features/moderation/SearchableDropdown`, `image/pattern/BackgroundPatterns.jsx` |
| Services to refactor | 4 | `qaMessageService`, `qaConversationService`, `researcherChatService`, inline calls in `ResearcherPortalPage` |
| New utility files | 2 | `utils/apiHelpers.ts`, `utils/devConsole.ts` |
| Types to split | 1 → 6 | `types/index.ts` → `user`, `recording`, `reference`, `api`, `moderation`, `notification` |
| New hooks | 6+ | `useUploadWizard`, `useFileUpload`, `useModerationQueue`, `useModerationDetail`, `useAdminDashboard`, `useMediaPlayer` |
| Config additions | 2 | `.prettierrc`, Prettier in `package.json` |

---

*Plan generated from full codebase audit on 2026-04-04 and updated during phased implementation through Phase 7.*
