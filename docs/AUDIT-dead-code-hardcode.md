# 🔍 Dead Code & Hardcode Audit — VietTune Frontend

> **Scope:** `src/components/` and `src/features/`  
> **Audited:** 2026-05-10  
> **Severity:** 🔴 High · 🟡 Medium · 🟢 Low

---

## Table of Contents

1. [Console Statements Left in Production Code](#1-console-statements-left-in-production-code)
2. [Hardcoded Color Values (Hex Literals)](#2-hardcoded-color-values-hex-literals)
3. [Hardcoded Magic Numbers (pageSize / timeouts / dimensions)](#3-hardcoded-magic-numbers)
4. [Dead State — `useState` Setter Never Called](#4-dead-state--usestate-setter-never-called)
5. [Hardcoded External URLs (Social / Contact)](#5-hardcoded-external-urls)
6. [TODO / FIXME Annotations](#6-todo--fixme-annotations)
7. [Garbled Encoding in String Literals](#7-garbled-encoding-in-string-literals)
8. [Architectural Stubs (Phase 2 / 3 placeholders)](#8-architectural-stubs)
9. [Summary Table](#9-summary-table)

---

## 1. Console Statements Left in Production Code

These `console.*` calls exist **outside** of environment guards (`import.meta.env.DEV`) and will appear in the browser console for every end-user.

### 🔴 High — Explicit Debug Label

| File | Line | Statement |
|------|------|-----------|
| `src/features/upload/hooks/useUploadSubmission.ts` | 294 | `console.log('[VietTune AI Debug] Raw instrument prediction:', item)` |

> **Why it's bad:** The comment above it (`// DEBUG: inspect raw AI instrument prediction shape`) confirms this is a temporary debug probe that was never removed. It logs on every AI suggestion mapped.

**Fix:** Remove entirely. If needed for dev, wrap in `if (import.meta.env.DEV)`.

---

### 🟡 Medium — Unguarded `console.log` info traces

| File | Line | Statement |
|------|------|-----------|
| `src/features/explore/hooks/useExploreFilterOptions.ts` | 51 | `console.log('Reference data updated, clearing optionsCache...')` |
| `src/features/moderation/hooks/useRecordingMetadataSuggestions.ts` | 79 | `console.log('Reference data updated, refetching metadata suggestions...')` |
| `src/features/researcher/hooks/useResearcherData.ts` | 110 | `console.log('Reference data updated, refetching researcher data...')` |
| `src/features/upload/hooks/useUploadReferenceData.ts` | 106 | `console.log('Reference data updated, refetching...')` |

> These four logs fire on every reference-data invalidation. They are identical trace messages that expose internal cache invalidation timing to production users.

**Fix:** Remove or replace with a no-op. They add no production value.

---

### 🟡 Medium — `console.warn` without structured logging

| File | Line | Statement |
|------|------|-----------|
| `src/features/upload/hooks/useUploadSubmission.ts` | 211, 228, 613 | `console.warn(...)` |
| `src/features/upload/hooks/useUploadReferenceData.ts` | 55, 65, 75, 86, 99, 132, 156, 180 | `console.warn('Failed to load ...')` |
| `src/features/upload/hooks/useUploadRecordingLoader.ts` | 181, 313 | `console.error('Error loading recording...')` |
| `src/features/moderation/utils/moderationApproveReject.ts` | 127, 255 | `console.warn('[moderationApproveReject] syncXxxToServer failed...')` |
| `src/features/moderation/hooks/useExpertQueue.ts` | 34 | `console.error(err)` — bare error object dump |
| `src/features/admin/hooks/useAdminDashboardData.ts` | 392, 399 | `console.warn('Failed to load ...')` |
| `src/features/admin/master-data/pages/MasterDataPage.tsx` | 63 | `console.warn('Failed to fetch usage count')` |
| `src/features/researcher/hooks/useResearcherData.ts` | 85, 91, 97, 103, 141, 165 | Multiple `console.warn/error` |
| `src/features/contributions/hooks/useContributionsData.ts` | 44 | `console.error('Failed to load submissions:', err)` |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | 189 | `console.warn('resolveCulturalContextForDisplay failed', err)` |
| `src/components/features/research/ExportDatasetDialog.tsx` | 184 | `console.warn('Audit log failed, but export succeeded', auditErr)` |
| `src/components/features/AudioPlayer.tsx` | 244 | `console.warn('Play failed:', e)` |

> **Pattern:** The project uses `src/services/errorReporting.ts` which already provides a `logEvent()` and `reportError()` utility. These raw console calls bypass that system.

**Fix:** Replace all error-path `console.warn/error` calls with `reportError(err, context)` from `errorReporting.ts`. Remove info-level `console.log` entirely.

---

### 🟢 Low — `console.debug` in compare-engine (appropriate but unguarded)

| File | Line | Statement |
|------|------|-----------|
| `src/features/compare-engine/FFTProcessor.ts` | 91 | `console.debug('[spectrogram:fft]', { ... })` |
| `src/features/compare-engine/SpectrogramRenderer.ts` | 31 | `console.debug('[spectrogram:draw]', { ... })` |

> `console.debug` is suppressed by default in most browser DevTools unless explicitly enabled, so this is lower risk. Still, these should be guarded.

**Fix:** Wrap with `if (import.meta.env.DEV)` or remove.

---

## 2. Hardcoded Color Values (Hex Literals)

These inline hex color strings bypass the design token system (Tailwind / CSS variables) and duplicate the brand palette in JS, making theme changes error-prone.

### 🔴 High — WaveSurfer waveform colors duplicated across two players

| File | Lines | Hardcoded Values |
|------|-------|-----------------|
| `src/components/researcher/SingleTrackPlayer.tsx` | 40–42 | `waveColor: '#E8C98E'`, `progressColor: '#9B2C2C'`, `cursorColor: '#9B2C2C'` |
| `src/components/researcher/DualAudioComparePlayer.tsx` | 107–109 | Same brand colors duplicated |
| `src/components/researcher/DualAudioComparePlayer.tsx` | 175–177 | `waveColor: '#D9EAFD'`, `progressColor: '#1D4ED8'`, `cursorColor: '#1D4ED8'` |

> The WaveSurfer config does not accept CSS variables — it needs JS-level string values. But these should be extracted to a **shared constant file** (e.g., `src/config/brandColors.ts`) to avoid duplication. Currently, if the brand color changes, it must be updated in at least 2 separate files.

**Fix:**
```ts
// src/config/brandColors.ts
export const WAVEFORM_COLORS = {
  primary: { wave: '#E8C98E', progress: '#9B2C2C', cursor: '#9B2C2C' },
  compare: { wave: '#D9EAFD', progress: '#1D4ED8', cursor: '#1D4ED8' },
} as const;
```

---

### 🟡 Medium — Repeated `scrollbarColor` hex across 7 files

| File | Line | Value |
|------|------|-------|
| `src/components/admin/AdminDashboardDropdowns.tsx` | 98, 217 | `'#9B2C2C rgba(255, 255, 255, 0.3)'` |
| `src/components/common/SearchableDropdown.tsx` | 347 | same |
| `src/components/features/search/SearchBarPrimitives.tsx` | 11 | same |
| `src/components/features/upload/MultiSelectTags.tsx` | 167 | same |
| `src/components/features/upload/UploadDatePicker.tsx` | 234, 291 | same |
| `src/components/features/TermsAndConditions.tsx` | 100 | same |

> The exact same CSS `scrollbarColor` value is copy-pasted in 7 places. This is a single shared style.

**Fix:** Extract to a shared style constant or a CSS class in `index.css`:
```css
.scrollbar-brand {
  scrollbar-color: #9B2C2C rgba(255, 255, 255, 0.3);
  scrollbar-width: thin;
}
```

---

### 🟡 Medium — Chart tooltip border hardcoded

| File | Lines | Value |
|------|-------|-------|
| `src/components/features/analytics/ContentAnalyticsPanel.tsx` | 136, 169 | `borderColor: '#E5E7EB'` |
| `src/components/features/analytics/CoverageGapChart.tsx` | 134 | `borderColor: '#E5E7EB'` |
| `src/components/features/analytics/MonthlyTrendChart.tsx` | 65 | `borderColor: '#E5E7EB'` |

**Fix:** Extract to a shared `CHART_TOOLTIP_STYLE` constant and reference from all chart components.

---

### 🟢 Low — Single-use inline background color

| File | Line | Value |
|------|------|-------|
| `src/components/features/kb/KnowledgeBasePanel.tsx` | 164 | `backgroundColor: '#FFF7E6'` |

**Fix:** Move to a CSS class or design token.

---

## 3. Hardcoded Magic Numbers

### 🟡 Medium — `pageSize` hardcoded as `useState` initial value (never changes)

| File | Line | Value | Pattern |
|------|------|-------|---------|
| `src/components/features/moderation/DisputeListPanel.tsx` | 45 | `useState(10)` | `const [pageSize] = useState(10)` |
| `src/components/features/moderation/EmbargoListPanel.tsx` | 25 | `useState(10)` | `const [pageSize] = useState(10)` |
| `src/components/features/moderation/ModerationAITab.tsx` | 35–36 | `useState(20)` | `const [pageSize] = useState(20)`, then `pageSize: 20` duplicated inline |

> The setter is destructured away (`[pageSize]` not `[pageSize, setPageSize]`), meaning these values **never change at runtime**. They are effectively constants masquerading as state.

**Fix:** Replace `useState` with a plain constant:
```ts
// ❌ Dead state
const [pageSize] = useState(10);

// ✅ Plain constant (also extract to uploadConstants.ts / paginationConfig.ts)
const PAGE_SIZE = 10;
```

---

### 🟡 Medium — Hardcoded timeout values (magic numbers)

| File | Line | Value |
|------|------|-------|
| `src/components/features/upload/MetadataSuggestionPanel.tsx` | 47 | `setTimeout(() => setApplied(false), 2000)` |
| `src/components/researcher/ResearcherPortalCompareTab.tsx` | 225, 264 | `setTimeout(runFetch, 400)` (duplicated twice) |
| `src/components/common/SearchableDropdown.tsx` | 126 | `setTimeout(() => setDebouncedSearch(search), 150)` |
| `src/features/knowledge-graph/components/KnowledgeGraphViewer.tsx` | 176 | `setTimeout(() => { setClickPulseId(null)... }, 480)` |
| `src/hooks/useApprovedRecordings.ts` | 50 | `setInterval(fetchAll, 30_000)` |

> Magic timing numbers scattered without explanation. `400`, `480`, `2000`, `30_000` — none are documented.

**Fix:** Extract to named constants:
```ts
const DEBOUNCE_SEARCH_MS = 150;
const APPLIED_FLASH_DURATION_MS = 2_000;
const COMPARE_FETCH_DEBOUNCE_MS = 400;
const CLICK_PULSE_DURATION_MS = 480;
const APPROVED_RECORDINGS_POLL_INTERVAL_MS = 30_000;
```

---

### 🟢 Low — Service default `pageSize` scattered across service layer

| File | Line | Default |
|------|------|---------|
| `src/services/recordingService.ts` | 329, 347, 369, 389, 410, 491 | `pageSize: number = 20` (×6 functions) |
| `src/services/submissionService.ts` | 200, 256 | `pageSize: number = 10` |
| `src/services/qaConversationService.ts` | 81 | `pageSize = 20` |
| `src/services/qaMessageService.ts` | 135 | `pageSize = 10` |
| `src/services/ethnicityService.ts` | 9 | `pageSize: number = 100` |
| `src/services/instrumentService.ts` | 10 | `pageSize: number = 50` |
| `src/services/researcherRecordingFilterSearch.ts` | 230 | `pageSize ?? 500` |

> Default page sizes differ per service with no shared policy. A `500` default in researcher search vs `10` in submissions creates inconsistent data loading behaviour.

**Fix:** Define a `DEFAULT_PAGE_SIZES` config in `src/config/pagination.ts` and reference it from service defaults.

---

## 4. Dead State — `useState` Setter Never Called

These patterns have the setter destructured **away**, making them effectively read-only constants incorrectly implemented as React state (triggers unnecessary re-render bookkeeping for no reason).

| File | Line | Dead State |
|------|------|------------|
| `src/components/features/moderation/DisputeListPanel.tsx` | 45 | `const [pageSize] = useState(10)` |
| `src/components/features/moderation/EmbargoListPanel.tsx` | 25 | `const [pageSize] = useState(10)` |
| `src/components/features/moderation/ModerationAITab.tsx` | 35 | `const [pageSize] = useState(20)` |

**Fix:** Convert to `const PAGE_SIZE = N` or import from a shared constant file.

---

## 5. Hardcoded External URLs

### 🔴 High — Generic placeholder social links in Footer

| File | Lines | URL |
|------|-------|-----|
| `src/components/layout/Footer.tsx` | 125 | `href="https://facebook.com"` |
| `src/components/layout/Footer.tsx` | 134 | `href="https://youtube.com"` |
| `src/components/layout/Footer.tsx` | 143 | `href="https://mail.google.com"` |

> These point to the **root homepages** of Facebook and YouTube — not to VietTune's actual social pages. The email link goes to Gmail's homepage, not a `mailto:` address. This is **placeholder content** that was never replaced with real values.

**Fix:**
```tsx
// src/config/socialLinks.ts
export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/viettune',   // replace with real page
  youtube: 'https://youtube.com/@viettune',     // replace with real channel
  email: 'mailto:contact@viettune.com',         // use mailto: not mail.google.com
} as const;
```

---

### 🟡 Medium — Hardcoded contact email and placeholder hotline in Terms

| File | Line | Hardcoded |
|------|------|-----------|
| `src/components/features/TermsAndConditions.tsx` | 572 | `contact@viettune.com \| Hotline: 1900-xxxx-xx` |
| `src/pages/TermsPage.tsx` | 484 | Same string duplicated |

> The hotline number `1900-xxxx-xx` is a placeholder that was never filled in. Both files duplicate this contact block — it should live in a single config source.

**Fix:** Extract to `src/config/contactInfo.ts` and reference from both components.

---

## 6. TODO / FIXME Annotations

### 🟡 Medium — Route protection TODOs (Sprint 3.2+ never actioned)

| File | Lines | Comment |
|------|-------|---------|
| `src/App.tsx` | 100, 109, 198, 207, 217, 226, 235 | `TODO(route-policy): candidate protected route review in Sprint 3.2+` |

> **7 routes** are flagged as candidates for auth protection but remain public. Sprint 3.2+ has presumably passed. These TODOs represent a **security gap** — unauthenticated users may access pages that should be gated.

**Fix:** Action each TODO by auditing the route, applying `<ProtectedRoute>` or `<RoleGuard>` wrappers, or explicitly annotating as intentionally public and removing the TODO.

---

### 🟡 Medium — Analytics service not wired up

| File | Line | Comment |
|------|------|---------|
| `src/services/errorReporting.ts` | 73 | `// TODO: Send to external analytics service (e.g. PostHog, Mixpanel) in Production` |

> The `logEvent()` function only `console.log`s in DEV and is a no-op in production. No telemetry reaches any monitoring system.

**Fix:** Wire to PostHog, Sentry, or equivalent. If intentionally deferred, add a ticket reference.

---

### 🟢 Low — Backend endpoint missing for entity usage count

| File | Line | Comment |
|------|------|---------|
| `src/features/admin/master-data/services/masterDataService.ts` | 110–113 | `TODO: Phase 3 — backend lacks GET /api/Instrument/{id}/usage` |

> `checkUsage()` always returns `0`, allowing deletion of entities that may be in use. A silent stub.

**Fix:** Coordinate with backend team to add the usage endpoint, then implement the frontend call. Until then, the function should throw or return `null` with a warning UI, not silently return 0.

---

## 7. Garbled Encoding in String Literals

> **Critical:** Two `console.warn` messages in `useMediaUpload.ts` contain **broken UTF-8 sequences** — Vietnamese text that was not saved with proper encoding.

| File | Lines | Issue |
|------|-------|-------|
| `src/features/upload/hooks/useMediaUpload.ts` | 177–179 | Vietnamese string for "Cannot read metadata from video file" — garbled bytes |
| `src/features/upload/hooks/useMediaUpload.ts` | 222 | Vietnamese string for "Timeout reading metadata" — garbled bytes |

> Raw output shows broken multi-byte sequences: `'KhA'ng th? ð?c metadata t?...'`.
> Also verify line 186's user-facing error string `'Không thể phân tích file âm thanh...'` — check if also corrupt.

**Fix:**
1. Re-save `useMediaUpload.ts` as UTF-8 in editor.
2. These strings are removed anyway as part of the console cleanup in item 1.

---

## 8. Architectural Stubs

### 🟡 Medium — Graph computation should be backend-side (Phase 2 stub)

| File | Line | Comment |
|------|------|---------|
| `src/features/knowledge-graph/hooks/useKnowledgeGraphData.ts` | 69–70 | `// TODO: Phase 2 — Move massive graph computation to backend/Neo4j API` |

> `buildKnowledgeGraphData()` currently performs **all graph construction on the client** from raw recording data. At scale this will block the main thread and freeze the UI.

**Fix:** Track as a backend performance ticket. Add a node/link count guard:
```ts
if (recordings.length > 1000) {
  // Show degraded mode warning / skeleton
}
```

---

## 9. Summary Table

| # | Category | Count | Severity | Priority |
|---|----------|-------|----------|----------|
| 1 | `console.log/warn/error` left in production | 30+ statements | 🔴/🟡 | P1 |
| 2 | Hardcoded hex color literals | 18 occurrences across 10 files | 🟡 | P2 |
| 3 | Hardcoded magic numbers (pageSize, timeouts) | 15+ occurrences | 🟡 | P2 |
| 4 | Dead `useState` (setter never called) | 3 instances | 🟡 | P2 |
| 5 | Hardcoded placeholder URLs (social/contact) | 3 links + 2 contact strings | 🔴 | P1 |
| 6 | TODO/FIXME annotations | 9 TODOs (7 route-policy, 2 service) | 🟡 | P2 |
| 7 | Garbled string encoding | 2–3 strings | 🟡 | P2 |
| 8 | Architectural Phase 2/3 stubs | 2 stubs | 🟢 | P3 |

---

## Recommended Action Plan

```
Phase 1 — Immediate (before next deploy)
  ✅ Remove '[VietTune AI Debug]' console.log (#1 High)
  ✅ Replace Footer social links with real URLs or config (#5 High)
  ✅ Fill in or remove '1900-xxxx-xx' hotline placeholder (#5 Medium)

Phase 2 — Next sprint
  🔧 Audit all 7 TODO(route-policy) routes in App.tsx (#6)
  🔧 Extract waveform colors to src/config/brandColors.ts (#2)
  🔧 Extract scrollbarColor to shared CSS class (#2)
  🔧 Convert dead useState pageSize to plain constants (#4)
  🔧 Replace console.warn/error with reportError() from errorReporting.ts (#1)

Phase 3 — Backlog
  📋 Wire errorReporting.logEvent() to production analytics service (#6)
  📋 Implement masterDataService.checkUsage() once backend endpoint exists (#6)
  📋 Add node-count guard to knowledge graph (#8)
  📋 Consolidate default pageSizes to src/config/pagination.ts (#3)
```

---

*Generated by Antigravity Code Auditor — VietTune SP26SE120*
