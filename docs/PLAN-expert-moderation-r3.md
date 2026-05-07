# PLAN: Expert Moderation UI — Review 3 Upgrade

> **Author:** Senior Frontend Architect  
> **Date:** 2026-05-05  
> **Scope:** Incremental upgrade of ModerationPage to fully support Review 3 requirements  
> **Approach:** Preserve existing performance optimizations; add stage-awareness, AI confidence visualization, similar recording comparison, and queue virtualization

---

## Executive Summary

The current Expert Moderation UI already implements a 3-step verification wizard, AI instrument detection, metadata suggestions, claim/unclaim flow, and optimistic UI patterns. However, it treats the workflow as a **flat list** without explicit SCREENING → VERIFICATION → PUBLICATION stage semantics. This plan upgrades the UI to be **stage-aware** at every touchpoint without rewriting existing architecture.

---

## 1. Architecture Changes

### 1.1 Components to Modify (existing)

| File | Change |
|------|--------|
| `src/pages/ModerationPage.tsx` | Add `stageFilter` state; pass stage context to child components |
| `src/components/features/moderation/ModerationQueueSidebar.tsx` | Stage badge per row; stage filter pills; virtualized list |
| `src/components/features/moderation/ModerationDetailView.tsx` | Stage-aware action gating; AI confidence summary in header |
| `src/components/features/moderation/ModerationStageProgressBar.tsx` | Map verification steps to named stages (Screening/Verification/Publication) |
| `src/components/features/moderation/InstrumentConfidencePanel.tsx` | Add region/classification from AI result; sortable by confidence |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | Stage transition guards; "Advance Stage" button logic |
| `src/features/moderation/hooks/useExpertQueue.ts` | Support stage-based filtering from API; expose stage counts |
| `src/features/moderation/hooks/useModerationWizard.ts` | Map step→stage; call `completeStageOne`/`completeStageTwo` on step transitions |
| `src/features/moderation/constants/verificationStepDefinitions.ts` | Add `stage` field to each step definition |
| `src/services/expertWorkflowService.ts` | Add `completeStageOne()` / `completeStageTwo()` wrappers |
| `src/services/expertModerationApi.ts` | Add `completeStageOne`, `completeStageTwo`, `fetchRelatedSubmissions` |

### 1.2 New Components to Add

| Component | Purpose |
|-----------|---------|
| `src/components/features/moderation/ModerationStageBadge.tsx` | Reusable colored badge showing SCREENING / VERIFICATION / PUBLICATION |
| `src/components/features/moderation/AIAnalysisSummaryCard.tsx` | Compact card: top instruments + region suggestion + classification |
| `src/components/features/moderation/SimilarRecordingsPanel.tsx` | Side panel comparing similar recordings (same instruments/region) |
| `src/components/features/moderation/ModerationVirtualizedList.tsx` | Wrapper around `@tanstack/react-virtual` for the queue sidebar |
| `src/components/features/moderation/StageTransitionConfirmDialog.tsx` | Modal confirming stage advancement with audit log note |
| `src/features/moderation/hooks/useSimilarRecordings.ts` | Hook calling `GET /get-related-submissions` for comparison panel |
| `src/features/moderation/hooks/useAIAnalysisSummary.ts` | Thin wrapper over existing `instrumentDetectionService.analyzeRecording` for summary card display |

### 1.3 Integration Strategy

```
ModerationPage (orchestrator - no change to structure)
├── ModerationPageHeader (add stage filter summary)
├── ModerationExpertTabNav (unchanged)
├── ModerationReviewTab
│   ├── ModerationQueueSidebar
│   │   ├── Stage filter pills (NEW inline)
│   │   ├── ModerationVirtualizedList (NEW - wraps existing item rows)
│   │   │   └── Queue item row (existing + ModerationStageBadge)
│   │   └── ModerationStageProgressBar (existing, compact)
│   └── ModerationDetailView
│       ├── Stage progress bar (existing, enhanced)
│       ├── AIAnalysisSummaryCard (NEW)
│       ├── InstrumentConfidencePanel (existing, enhanced)
│       ├── SimilarRecordingsPanel (NEW, lazy-loaded)
│       └── ModerationClaimActions (existing, stage-gated)
├── ModerationPageDialogs
│   ├── ModerationVerificationWizardDialog (existing, stage transitions)
│   └── StageTransitionConfirmDialog (NEW)
└── ...
```

---

## 2. State Design

### 2.1 New State Fields

```typescript
// In ModerationPage.tsx (local page state)
const [stageFilter, setStageFilter] = useState<ModerationStage | 'ALL'>('ALL');

// In useExpertQueue.ts (returned metadata)
interface QueueStageCounts {
  screening: number;
  verification: number;
  publication: number;
  total: number;
}

// In LocalRecordingMini.moderation (NO new backend fields needed)
// Stage is DERIVED from existing verificationStep:
//   step 1 → SCREENING, step 2 → VERIFICATION, step 3 → PUBLICATION
// AI analysis uses existing instrumentDetectionService (already cached)

// New enum
export enum ModerationStage {
  SCREENING = 'SCREENING',
  VERIFICATION = 'VERIFICATION',
  PUBLICATION = 'PUBLICATION',
}
```

### 2.2 State Location Strategy

| State | Location | Rationale |
|-------|----------|-----------|
| `stageFilter` | `ModerationPage` local | UI-only filter, no persistence needed |
| `stage` per submission | **Derived** from `verificationStep` via `deriveStage()` | No new backend field; pure function of existing data |
| AI analysis result | Existing `instrumentDetectionService` (in-memory `recordingAnalyzeCache`) | Already cached; reuse via existing `InstrumentConfidencePanel` + new summary card |
| Similar recordings | Dedicated hook (`useSimilarRecordings`) calling `GET /get-related-submissions` | Separate concern; lazy-fetched when detail panel mounts |
| Stage transition audit note | Portal modal local state | Ephemeral; discarded after submit |
| Verification step→stage mapping | Constant map (derive, not store) | Pure function of `verificationStep` |

### 2.3 Stage Derivation Logic

The existing `verificationStep` (1/2/3) maps directly to stages:

```typescript
// src/features/moderation/constants/stageMapping.ts (NEW)
export const STEP_TO_STAGE: Record<number, ModerationStage> = {
  1: ModerationStage.SCREENING,
  2: ModerationStage.VERIFICATION,
  3: ModerationStage.PUBLICATION,
};

export function deriveStage(item: LocalRecordingMini): ModerationStage {
  // Prefer backend-provided stage
  if (item.moderation?.stage) return item.moderation.stage;
  // Fallback: derive from verificationStep
  const step = item.moderation?.verificationStep ?? 1;
  return STEP_TO_STAGE[step] ?? ModerationStage.SCREENING;
}
```

---

## 3. UI Changes (Concrete)

### 3.1 Stage Indicator — Queue Sidebar (List)

**Location:** `ModerationQueueSidebar.tsx` → each queue item row

**Current:** Status badge only (`Chờ duyệt`, `Đang duyệt`, `Đã duyệt`, `Từ chối`)  
**New:** Add `ModerationStageBadge` below status badge for items claimed by current user

```tsx
// ModerationStageBadge.tsx
export function ModerationStageBadge({ stage }: { stage: ModerationStage }) {
  const config = {
    SCREENING: { label: 'Sàng lọc', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    VERIFICATION: { label: 'Xác minh', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    PUBLICATION: { label: 'Phê duyệt', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };
  const { label, color } = config[stage];
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${color}`}>
      {label}
    </span>
  );
}
```

**Stage filter pills** — add above the existing status filter:

```tsx
<div className="flex gap-1.5 mb-2">
  {(['ALL', 'SCREENING', 'VERIFICATION', 'PUBLICATION'] as const).map(s => (
    <button key={s} aria-pressed={stageFilter === s} ...>
      {s === 'ALL' ? 'Tất cả' : stageLabel[s]} ({stageCounts[s]})
    </button>
  ))}
</div>
```

### 3.2 Stage Indicator — Detail Panel / Modal

**Location:** `ModerationDetailView.tsx` header area (currently shows `ModerationStageProgressBar`)

**Enhancement:** Replace generic "Stage 1/3" text with named stages:

```
Before: "Stage 1/3: Initial Screening"
After:  "SÀNG LỌC (1/3)" with colored step indicator
```

Inside the wizard dialog (`ModerationVerificationWizardDialog.tsx`):
- Show current stage name prominently at top
- Disable "Tiếp tục" button unless current stage checklist is complete
- Final step shows "Chuyển sang Phê duyệt" instead of generic next

### 3.3 AI Confidence Panel (Enhanced)

**Current:** `InstrumentConfidencePanel` only shows instrument confidence bars.

**New:** `AIAnalysisSummaryCard` (rendered above `InstrumentConfidencePanel` in detail view):

```
┌─────────────────────────────────────────────────┐
│ 🤖 Kết quả phân tích AI                        │
├─────────────────────────────────────────────────┤
│ Nhạc cụ chính: Đàn Tranh (92%), Sáo (78%)      │
│ Khu vực gợi ý: Bắc Trung Bộ                    │
│ Phân loại: Âm nhạc truyền thống                 │
│ ─────────────────────────────────────────────── │
│ Độ tin cậy tổng thể: ████████░░ 82%            │
└─────────────────────────────────────────────────┘
```

Fields from backend AI result:
- `instruments: { name: string; confidence: number }[]`
- `regionSuggestion: string`
- `classification: 'traditional' | 'modern' | 'mixed'`
- `overallConfidence: number`

### 3.4 Similar Recordings Section

**New component:** `SimilarRecordingsPanel.tsx`

Rendered in `ModerationDetailView` after AI panels, only when item is claimed:

```
┌─────────────────────────────────────────────────┐
│ 🎵 Bản thu tương tự (3 kết quả)                │
├─────────────────────────────────────────────────┤
│ ┌─────────┐ Bài dân ca Ví Giặm                 │
│ │ ▶ Audio │ Nghệ An • Đàn Tranh, Sáo          │
│ └─────────┘ Status: Đã duyệt ✓                 │
│ ┌─────────┐ Hát Then cổ                        │
│ │ ▶ Audio │ Lạng Sơn • Đàn Tính               │
│ └─────────┘ Status: Đang duyệt                 │
└─────────────────────────────────────────────────┘
```

API: `GET /api/Submission/get-related-submissions?submissionId=xxx` (already exists in Swagger)  
Fallback: client-side filter by matching instruments/region from `allItems`

---

## 4. Interaction Flow

### 4.1 Complete Expert Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                     EXPERT MODERATION FLOW                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  PENDING_REVIEW                                                   │
│       │                                                            │
│       ▼ [Nhận bài / Claim]                                        │
│                                                                    │
│  ┌─────────────────────────────────────────┐                      │
│  │  STAGE 1: SCREENING (Sàng lọc)          │                      │
│  │  ─────────────────────────────────────── │                      │
│  │  • Info complete?                        │                      │
│  │  • Info accurate?                        │                      │
│  │  • Format correct?                       │                      │
│  │  • AI analysis available? (show summary) │                      │
│  │                                          │                      │
│  │  Actions: ✓ Pass → Stage 2              │                      │
│  │           ✗ Reject (with reason)         │                      │
│  │           ↩ Unclaim (return to queue)    │                      │
│  └────────────────────────────┬────────────┘                      │
│                               │ [All checks ✓ + Confirm]           │
│                               ▼                                    │
│  ┌─────────────────────────────────────────┐                      │
│  │  STAGE 2: VERIFICATION (Xác minh)       │                      │
│  │  ─────────────────────────────────────── │                      │
│  │  • Cultural value assessment             │                      │
│  │  • Authenticity verification             │                      │
│  │  • Accuracy check                        │                      │
│  │  • AI instrument review (confidence)     │                      │
│  │  • Metadata suggestions review           │                      │
│  │  • Similar recordings comparison         │                      │
│  │                                          │                      │
│  │  Actions: ✓ Pass → Stage 3              │                      │
│  │           ✗ Reject (with detailed note)  │                      │
│  │           ← Back to Stage 1             │                      │
│  └────────────────────────────┬────────────┘                      │
│                               │ [All checks ✓ + Confirm]           │
│                               ▼                                    │
│  ┌─────────────────────────────────────────┐                      │
│  │  STAGE 3: PUBLICATION (Phê duyệt)       │                      │
│  │  ─────────────────────────────────────── │                      │
│  │  • Cross-reference check                 │                      │
│  │  • Sources verified                      │                      │
│  │  • Final approval checkbox               │                      │
│  │  • Optional: flag sensitive content      │                      │
│  │                                          │                      │
│  │  Actions: ✓ Approve (publish)           │                      │
│  │           ✗ Reject (final)              │                      │
│  │           ← Back to Stage 2             │                      │
│  └────────────────────────────┬────────────┘                      │
│                               │ [Approve confirmed]                │
│                               ▼                                    │
│  APPROVED → AuditLog entry created                                │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Stage Transition Details (Using Existing APIs)

| Transition | Trigger | API Call | Side Effects |
|-----------|---------|----------|--------------|
| Pending → Screening | Expert clicks "Nhận bài" | `PUT /assign-reviewer-submission` | overlay → `verificationStep: 1` |
| Screening → Verification | All Step 1 checks ✓ + "Tiếp tục" | `PUT /Submission/done-stage-one` | overlay → `verificationStep: 2` |
| Verification → Publication | All Step 2 checks ✓ + "Tiếp tục" | `PUT /Submission/done-stage-two` | overlay → `verificationStep: 3` |
| Publication → Approved | All Step 3 checks ✓ + "Phê duyệt" | `PUT /approve-submission` | audit log POST; overlay → `status: APPROVED` |
| Any Stage → Rejected | Expert rejects | `PUT /reject-submission` | audit log POST; overlay → `status: REJECTED/TEMPORARILY_REJECTED` |
| Any Stage → Pending | Expert unclaims | `PUT /unassign-reviewer-submission` | clear overlay |

### 4.3 Audit Log Events (frontend-triggered)

Each transition creates an audit entry via existing `postExpertModerationAuditLog` (`POST /api/AuditLog`):

```typescript
// Stage 1 → 2 (after successful done-stage-one)
{
  userId: expert.id,
  entityType: 'Submission',
  entityId: submissionId,
  action: 'done_stage_one',
  newValuesJson: JSON.stringify({
    submissionId,
    fromStep: 1,
    toStep: 2,
    expertNotes: 'Thông tin đầy đủ, chuyển sang xác minh chuyên sâu',
    source: 'expert_moderation',
  }),
}

// Stage 2 → 3 (after successful done-stage-two)
{
  userId: expert.id,
  entityType: 'Submission',
  entityId: submissionId,
  action: 'done_stage_two',
  newValuesJson: JSON.stringify({
    submissionId,
    fromStep: 2,
    toStep: 3,
    expertNotes: 'Xác minh hoàn tất, chuyển sang phê duyệt cuối cùng',
    source: 'expert_moderation',
  }),
}
```

---

## 5. API Integration (Aligned with Existing Backend)

### 5.1 API Mapping Table

| Feature | Existing API | Status | FE Change Needed |
|---------|-------------|--------|-----------------|
| Load queue | ✅ `GET /api/Submission/get-by-status` | Already consumed | None |
| Expert's claimed items | ✅ `GET /api/Submission/get-by-reviewer` | Already consumed | None |
| Claim submission | ✅ `PUT /api/Submission/assign-reviewer-submission` | Already consumed | None |
| Unclaim submission | ✅ `PUT /api/Submission/unassign-reviewer-submission` | Already consumed | None |
| Approve | ✅ `PUT /api/Submission/approve-submission` | Already consumed | None |
| Reject | ✅ `PUT /api/Submission/reject-submission` | Already consumed | None |
| Stage 1 → Stage 2 | ✅ `PUT /api/Submission/done-stage-one` | **NEW call from FE** | Add wrapper in `expertModerationApi.ts` |
| Stage 2 → Stage 3 | ✅ `PUT /api/Submission/done-stage-two` | **NEW call from FE** | Add wrapper in `expertModerationApi.ts` |
| Similar recordings | ✅ `GET /api/Submission/get-related-submissions` | **NEW call from FE** | Add wrapper in `expertModerationApi.ts` |
| AI instrument analysis | ✅ `POST /api/audio-analysis/analyze-recording/{recordingId}` | Already consumed via `instrumentDetectionService` | Reuse existing hook; add summary card |
| AI full analysis (Gemini) | ✅ `POST /api/AIAnalysis/analyze-only` | Already consumed via `instrumentDetectionService` | No change |
| Audit log (write) | ✅ `POST /api/AuditLog` | Already consumed | No change |
| Submission versions | ✅ `GET /api/SubmissionVersion/submission/{submissionId}` | Already consumed via `submissionVersionApi` | No change |

### 5.2 Removed APIs (from old plan — NOT needed)

| Proposed Endpoint | Reason for Removal |
|-------------------|-------------------|
| ~~`PUT /api/Submission/advance-stage`~~ | Replaced by existing `done-stage-one` + `done-stage-two` |
| ~~`GET /api/Submission/{id}/ai-analysis`~~ | Already available via `POST /api/audio-analysis/analyze-recording/{recordingId}` (cached in `instrumentDetectionService`) |
| ~~`GET /api/Submission/similar`~~ | Replaced by existing `GET /api/Submission/get-related-submissions` |
| ~~`GET /api/AuditLog/by-submission/{id}`~~ | Use existing `SubmissionVersion` API for history display; `POST /api/AuditLog` for write-only trail |

### 5.3 Stage Transition — Using Existing APIs

The backend already provides two discrete stage endpoints:

```
PUT /api/Submission/done-stage-one?submissionId={id}   → 200 OK
PUT /api/Submission/done-stage-two?submissionId={id}   → 200 OK
```

**Frontend stage logic:**
- Step 1 complete → call `done-stage-one` → move to Step 2 (VERIFICATION)
- Step 2 complete → call `done-stage-two` → move to Step 3 (PUBLICATION)
- Step 3 complete → call `approve-submission` → APPROVED

**Stage derivation (no new backend field needed):**
```typescript
// Client-side derivation from verificationStep
function deriveStage(verificationStep: number): ModerationStage {
  if (verificationStep <= 1) return ModerationStage.SCREENING;
  if (verificationStep === 2) return ModerationStage.VERIFICATION;
  return ModerationStage.PUBLICATION;
}
```

### 5.4 AI Analysis — Consuming Existing Service

The AI analysis is **already fully integrated** via `instrumentDetectionService.analyzeRecording(recordingId)`:
- Calls `POST /api/audio-analysis/analyze-recording/{recordingId}`
- Returns `InstrumentDetectionResult` (instruments with confidence, timeline, audio_info)
- Has in-memory cache (`recordingAnalyzeCache`)

**Backend `AIAnalysisResultDto` already returns:**
- `instruments: { id, name }[]` (with confidence from PythonAnalyzeData)
- `ethnicGroup: { id, name }` → region suggestion
- `genre` → classification (traditional vs modern)
- `ceremony`, `vocalStyle`, `musicalScale`

**FE enhancement:** The new `AIAnalysisSummaryCard` will consume the **same** `instrumentDetectionService.analyzeRecording()` + existing `useRecordingMetadataSuggestions` hook data. No new API call needed.

### 5.5 Similar Recordings — Using Existing API

```
GET /api/Submission/get-related-submissions?submissionId={id}  → 200 OK
```

**Frontend integration:**
```typescript
// src/services/expertModerationApi.ts — NEW wrapper

export async function fetchRelatedSubmissions(
  submissionId: string,
): Promise<LocalRecording[]> {
  const res = await apiOk(
    asApiEnvelope<unknown>(
      apiFetch.GET('/api/Submission/get-related-submissions', {
        params: { query: { submissionId } },
      }),
    ),
  );
  const lookups = await buildSubmissionLookupMaps();
  return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row, lookups));
}
```

### 5.6 Audit Trail — Using Existing Write + SubmissionVersion for History

**Write path (unchanged):** `POST /api/AuditLog` — already consumed for approve/reject.

**Read path (history display):** Use `submissionVersionApi.listBySubmission(submissionId)` which already returns `SubmissionVersionDto[]` with `changesJson` for timeline display. The existing `SubmissionVersionTimeline` component already consumes this.

**Enhancement:** On stage transitions, also POST to `AuditLog` with `action: 'done_stage_one'` or `'done_stage_two'` to record the expert's decision point.

### 5.7 Frontend Service Layer — Minimal Additions

```typescript
// src/services/expertModerationApi.ts — ONLY new functions needed

/** PUT /api/Submission/done-stage-one — marks screening complete */
export async function completeStageOne(submissionId: string): Promise<MutationResult> {
  try {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.PUT('/api/Submission/done-stage-one', {
          params: { query: openApiQueryRecord({ submissionId }) },
        }),
      ),
    );
    return mutationOk();
  } catch (err: unknown) {
    return mutationFail(err, getHttpStatus(err));
  }
}

/** PUT /api/Submission/done-stage-two — marks verification complete */
export async function completeStageTwo(submissionId: string): Promise<MutationResult> {
  try {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.PUT('/api/Submission/done-stage-two', {
          params: { query: openApiQueryRecord({ submissionId }) },
        }),
      ),
    );
    return mutationOk();
  } catch (err: unknown) {
    return mutationFail(err, getHttpStatus(err));
  }
}

/** GET /api/Submission/get-related-submissions — similar recordings */
export async function fetchRelatedSubmissions(
  submissionId: string,
): Promise<LocalRecording[]> {
  const lookups = await buildSubmissionLookupMaps();
  const res = await apiOk(
    asApiEnvelope<unknown>(
      apiFetch.GET('/api/Submission/get-related-submissions', {
        params: { query: { submissionId } },
      }),
    ),
  );
  return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row, lookups));
}
```

### 5.8 Minimal Backend Changes Required

| Change | Priority | Effort |
|--------|----------|--------|
| ❌ None required for stage transitions | — | `done-stage-one` / `done-stage-two` already exist |
| ❌ None required for AI analysis | — | `analyze-recording` already returns full result |
| ❌ None required for similar recordings | — | `get-related-submissions` already exists |
| ⚠️ OPTIONAL: Include `currentStage` field in submission GET responses | Low | Helpful but not required (FE can derive from `verificationStep`) |
| ⚠️ OPTIONAL: Return 409 from `done-stage-one`/`done-stage-two` if already completed | Low | Better UX for conflict handling |

---

## 6. Performance Plan

### 6.1 Queue Virtualization

**Problem:** Queue may have 200+ items; current renders all DOM nodes.

**Solution:** `@tanstack/react-virtual` (already in common React ecosystem, tree-shakable)

```typescript
// ModerationVirtualizedList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function ModerationVirtualizedList({ items, selectedId, onSelect, ... }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // px per queue row
    overscan: 5,
  });
  // ... render only visible items
}
```

**Integration:** Replace the `<div role="list">` in `ModerationQueueSidebar.tsx` with `<ModerationVirtualizedList>`.

### 6.2 Avoid Re-render Issues

| Optimization | Current State | Enhancement |
|---|---|---|
| `memo(ModerationDetailView)` | ✓ Already memoized | Keep; ensure props are stable refs |
| `useMemo` for `filteredQueueItems` | ✓ Already exists | Add `stageFilter` to deps only when needed |
| `useCallback` for handlers | ✓ Already exists | No change |
| Debounced notes save | ✓ 450ms debounce | No change |
| Lazy media loading | ✓ Dialog-only blob load | No change |
| AI analysis fetch | per-item on select | Add `useRef` cache to avoid refetch on re-select |
| Similar recordings | NEW | Fetch only on explicit expand; cache in `Map<id, result>` |

### 6.3 Memory Management (existing, preserved)

- `dialogCurrentRecording` cleared on dialog close (existing)
- `selectedItemFull` cleared on deselect (existing)
- Media blobs never put in `allItems` (existing)
- AI analysis results: store only metadata, not raw audio features

### 6.4 Bundle Impact Mitigation

- `@tanstack/react-virtual`: ~4KB gzipped (acceptable)
- `AIAnalysisSummaryCard` and `SimilarRecordingsPanel`: lazy-load with `React.lazy()` since only shown when item is claimed
- No new heavy UI library needed (existing Tailwind + Lucide)

---

## 7. Migration Strategy

### 7.1 Step-by-Step Rollout (5 Phases)

#### Phase A: Foundation (No visible UI change)
1. Add `ModerationStage` enum and `STEP_TO_STAGE` constant mapping
2. Add `stage` field to `LocalRecordingMini.moderation` type (optional)
3. Add `deriveStage()` utility function
4. Add `VITE_STAGE_API_ENABLED` feature flag (default: false)
5. **Zero breaking changes** — all existing flows unchanged

#### Phase B: Stage Awareness in List
1. Create `ModerationStageBadge.tsx` component
2. Add stage badge to `ModerationQueueSidebar` rows (for claimed items)
3. Add stage counts to `queueStatusMeta`
4. Add stage filter pills (hidden behind feature flag initially)
5. **Backward compatible** — badge shows derived stage; no API dependency

#### Phase C: Enhanced Detail Panel
1. Create `AIAnalysisSummaryCard.tsx` component
2. Create `useAIAnalysisSummary.ts` hook (wraps existing `instrumentDetectionService.analyzeRecording` — no new API)
3. Integrate `AIAnalysisSummaryCard` into `ModerationDetailView` (below header, above existing panels)
4. Enhance `ModerationStageProgressBar` labels to show stage names
5. **Graceful degradation** — if AI service unavailable, card shows "Chưa có phân tích AI"

#### Phase D: Similar Recordings + Virtualization
1. Create `SimilarRecordingsPanel.tsx` (lazy-loaded)
2. Create `useSimilarRecordings.ts` hook
3. Create `ModerationVirtualizedList.tsx` wrapper
4. Replace raw list in sidebar with virtualized list
5. **Performance improvement** — queue render time drops significantly for large queues

#### Phase E: Stage Transitions + Audit
1. Create `StageTransitionConfirmDialog.tsx`
2. Wire `completeStageOne` / `completeStageTwo` into `useModerationWizard.nextVerificationStep`
3. Add audit log entries on stage transitions via existing `POST /api/AuditLog`
4. No new feature flag needed — APIs already exist in Swagger
5. **Full Review 3 compliance** — all three stages enforced server-side via `done-stage-one`/`done-stage-two`/`approve-submission`

### 7.2 Feature Flag Strategy

```env
# .env.development
# No new flag needed for stages — done-stage-one/done-stage-two already in Swagger
# Existing flags still apply:
VITE_EXPERT_API_PHASE2=true     # Already controls server sync (existing)

VITE_SIMILAR_RECORDINGS=true    # Can disable if get-related-submissions response shape unexpected
VITE_AI_SUMMARY_CARD=true       # Can disable if instrumentDetectionService flaky
```

### 7.3 Rollback Plan

Each phase is independently revertable:
- Phase B badge: remove `ModerationStageBadge` from sidebar (1 line)
- Phase C card: remove `AIAnalysisSummaryCard` import (1 line)
- Phase D virtualization: swap back to plain `<div role="list">` (1 component swap)
- Phase E transitions: remove `completeStageOne`/`completeStageTwo` calls; wizard falls back to local-only step tracking (existing behavior)

---

## 8. Code-Level Suggestions

### 8.1 New Type Definitions

```typescript
// src/types/moderationStage.ts (NEW — minimal, no new backend dependency)
export enum ModerationStage {
  SCREENING = 'SCREENING',
  VERIFICATION = 'VERIFICATION',
  PUBLICATION = 'PUBLICATION',
}

// AI analysis reuses existing InstrumentDetectionResult from instrumentDetection.ts
// No new AI type needed — existing service already returns:
//   instruments: DetectedInstrument[] (name + confidence)
//   audio_info: AudioAnalysisInfo
//   timeline: InstrumentTimeSegment[]
// Plus MetadataSuggestion[] from useRecordingMetadataSuggestions (region, ethnicity, etc.)

// Similar recordings reuses existing LocalRecording[] from get-related-submissions
// No new type needed — same shape as queue items
```

### 8.2 Hook: `useAIAnalysisSummary` (reuses existing service)

```typescript
// src/features/moderation/hooks/useAIAnalysisSummary.ts (NEW)
// Thin wrapper over existing instrumentDetectionService — NO new API call
import { useEffect, useState } from 'react';
import { instrumentDetectionService } from '@/services/instrumentDetectionService';
import type { InstrumentDetectionResult } from '@/types/instrumentDetection';

export function useAIAnalysisSummary(recordingId: string | undefined, enabled: boolean) {
  const [data, setData] = useState<InstrumentDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !recordingId) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Reuses existing in-memory cache (recordingAnalyzeCache) inside instrumentDetectionService
    void instrumentDetectionService.analyzeRecording(recordingId)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError('Không thể tải kết quả AI.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [recordingId, enabled]);

  return { data, loading, error };
}
```

### 8.3 Constant: Stage Mapping Enhancement

```typescript
// src/features/moderation/constants/verificationStepDefinitions.ts (MODIFY)
export const VERIFICATION_STEPS = [
  {
    step: 1,
    stage: ModerationStage.SCREENING, // NEW
    name: 'Initial Screening',
    stageLabel: 'Sàng lọc',          // NEW (Vietnamese)
    // ... existing fields unchanged
  },
  {
    step: 2,
    stage: ModerationStage.VERIFICATION, // NEW
    name: 'Detail Verification',
    stageLabel: 'Xác minh',             // NEW
    // ... existing fields unchanged
  },
  {
    step: 3,
    stage: ModerationStage.PUBLICATION, // NEW
    name: 'Final Publication',
    stageLabel: 'Phê duyệt',           // NEW
    // ... existing fields unchanged
  },
] as const;
```

### 8.4 Modified Hook: `useModerationWizard` — Stage Advancement (using existing APIs)

```typescript
// Addition to useModerationWizard.ts — replaces generic advanceStage with specific API calls

import { completeStageOne, completeStageTwo } from '@/services/expertModerationApi';

const advanceStage = useCallback(
  async (id: string, fromStep: number) => {
    const toStep = fromStep + 1;
    if (toStep > 3) return; // Step 3 → approve uses existing approve flow

    // Optimistic local update
    setVerificationStep((prev) => ({ ...prev, [id]: toStep }));

    // Call the correct existing backend endpoint
    const serverResult = fromStep === 1
      ? await completeStageOne(id)   // PUT /api/Submission/done-stage-one
      : await completeStageTwo(id);  // PUT /api/Submission/done-stage-two

    if (!serverResult.ok) {
      // Revert optimistic update
      setVerificationStep((prev) => ({ ...prev, [id]: fromStep }));
      uiToast.error('Không thể chuyển giai đoạn. Vui lòng thử lại.');
      return;
    }

    // Persist verification data locally (existing pattern — unchanged)
    const currentFormData = verificationForms[id] || {};
    await expertWorkflowService.updateVerificationStep(id, {
      verificationStep: toStep,
      verificationData: currentFormData,
    });

    // Audit log (existing POST /api/AuditLog)
    await postExpertModerationAuditLog({
      userId: userId!,
      submissionId: id,
      action: fromStep === 1 ? 'done_stage_one' : 'done_stage_two',
      notesSummary: `Step ${fromStep} → Step ${toStep}`,
    });

    await load();
  },
  [verificationForms, userId, load],
);
```

### 8.5 Component: `AIAnalysisSummaryCard` (using existing `InstrumentDetectionResult`)

```tsx
// src/components/features/moderation/AIAnalysisSummaryCard.tsx (NEW)
// Consumes data from existing instrumentDetectionService — NO new API
import { Bot, MapPin, Tag } from 'lucide-react';
import type { InstrumentDetectionResult } from '@/types/instrumentDetection';
import type { MetadataSuggestion } from '@/types/instrumentDetection';

export function AIAnalysisSummaryCard({
  analysisResult,
  metadataSuggestions,
  loading,
  error,
}: {
  analysisResult: InstrumentDetectionResult | null;
  metadataSuggestions: MetadataSuggestion[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <Skeleton />;
  if (error) return <ErrorBanner message={error} />;
  if (!analysisResult || analysisResult.instruments.length === 0) return null;

  const topInstruments = analysisResult.instruments
    .filter(i => i.confidence !== null)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 3);

  // Region derived from existing MetadataSuggestion[] (field: 'region')
  const regionSuggestion = metadataSuggestions.find(s => s.field === 'region');
  // Ethnicity suggestion
  const ethnicitySuggestion = metadataSuggestions.find(s => s.field === 'ethnicity');

  // Overall confidence = average of top instrument confidences
  const avgConfidence = topInstruments.length > 0
    ? topInstruments.reduce((sum, i) => sum + (i.confidence ?? 0), 0) / topInstruments.length
    : 0;

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
        <Bot className="h-4 w-4 text-primary-600" />
        Kết quả phân tích AI
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-neutral-500">Nhạc cụ chính</p>
          <p className="text-sm font-medium">
            {topInstruments.map(i =>
              `${i.name} (${Math.round((i.confidence ?? 0) * 100)}%)`
            ).join(', ')}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Khu vực gợi ý</p>
          <p className="text-sm font-medium flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {regionSuggestion?.value ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Dân tộc gợi ý</p>
          <p className="text-sm font-medium flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" />
            {ethnicitySuggestion?.value ?? '—'}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500">Độ tin cậy trung bình</span>
          <span className="font-semibold">{Math.round(avgConfidence * 100)}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${avgConfidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### 8.6 Naming Conventions

| Pattern | Example |
|---------|---------|
| Hook files | `use{Feature}.ts` — `useAIAnalysisResult.ts`, `useSimilarRecordings.ts` |
| Component files | `Moderation{Feature}.tsx` — `ModerationStageBadge.tsx`, `ModerationVirtualizedList.tsx` |
| Type files | `{domain}.types.ts` or `{domain}.ts` in `/types/` — `moderationStage.ts` |
| Constants | `{feature}Constants.ts` or inline in step definitions |
| Feature flags | `VITE_{FEATURE}_ENABLED` — all caps, underscore-separated |
| Utility functions | camelCase, verb-first — `deriveStage()`, `buildStageCounts()` |

---

## 9. Verification Checklist

- [ ] Phase A: `ModerationStage` enum exists, `deriveStage()` passes unit test
- [ ] Phase B: Stage badge renders for claimed items; stage filter works
- [ ] Phase C: AI card renders when data available; gracefully hides when unavailable
- [ ] Phase D: Queue of 200+ items renders <16ms per frame (virtualized); Similar panel loads lazily
- [ ] Phase E: Stage transitions persist server-side; audit log records every transition
- [ ] All existing tests pass (no regression)
- [ ] Memory: no blob leaks (DevTools heap snapshot comparison)
- [ ] A11y: stage badge has `aria-label`; virtualized list maintains keyboard nav
- [ ] No new linter errors or TypeScript warnings

---

## 10. Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase A: Foundation | 2h | None |
| Phase B: Stage in List | 4h | Phase A |
| Phase C: AI Card | 4h | Phase A + Backend AI endpoint |
| Phase D: Virtualization + Similar | 6h | Phase A + `@tanstack/react-virtual` install |
| Phase E: Stage Transitions | 6h | Phase A-D + Backend `advance-stage` endpoint |
| **Total** | **~22h** | |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `done-stage-one`/`done-stage-two` response shape undocumented | Low | Minor FE adjustment | Only expects 200 OK; no body parsing needed |
| `get-related-submissions` response shape unknown | Medium | May need mapper | Reuse `extractSubmissionRows` + `mapSubmissionToLocalRecording` pattern |
| AI analysis endpoint (`analyze-recording`) returns slowly | Low | UX lag | Already cached in-memory; loading skeleton; do not block stage progression |
| Queue > 500 items | Low | Performance | Virtualization in Phase D handles this; pagination as future work |
| Existing tests break due to type changes | Low | CI failure | All new fields are optional (`?`); no runtime changes in Phase A |
