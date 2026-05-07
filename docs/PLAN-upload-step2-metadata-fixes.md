# PLAN: Upload Step 2 — Metadata & AI Critical Fixes

**Type:** Logic Fix + UX Explainability Hardening  
**Priority:** P1 — Blocks demo credibility with expert reviewers  
**Author:** Senior Frontend Engineer + UI/UX Reviewer  
**Date:** 2026-05-04  
**Scope:** `UploadMusic`, `MetadataStepSection`, `MetadataSuggestionPanel`, `useUploadForm`, `instrumentMetadataMapper`, `metadataSuggestService` integration

---

## 1. Senior Assessment

Step 2 of the upload wizard has six confirmed defects spanning three severity tiers:

| Tier | Issue | Demo Impact |
|------|-------|-------------|
| **Data integrity** | AI failure catch block calls `setEthnicity` from static map despite error path | Mutates form without contributor consent |
| **Data integrity** | `vocalStyle` and `eventType` share the same `genre` advisory bucket | Duplicated UI blocks — looks like copy-paste error to expert reviewers |
| **Explainability** | Confidence bar in `MetadataSuggestionPanel` originates from instrument detection model, not from independent metadata prediction | Misleads contributor and expert about prediction quality per field |
| **UI correctness** | `resolveTopValue` on `eventType` can return a value from the shared `genre` bucket whose `pickBestRowForValue` scan against `eventType` rows returns `null` → source row and confidence bar silently disappear | Silent data loss in panel |
| **Copy quality** | `gpsAccuracyLabel` values: `'Chinh xac cao'`, `'Trung binh'`, `'Thap - nen kiem tra lai'` — no Vietnamese diacritics | Inconsistent with the rest of the UI |
| **Documentation** | Two `useBlocker` / `beforeunload` guards carry comment `// Guard in edit mode or during Step 2-4 of the wizard`; wizard has 3 steps | Stale internal comment causes confusion during maintenance |

None of these issues require backend API changes or wizard redesign. All fixes are confined to frontend logic and display.

---

## 2. Root Cause

### Issue 1 — Shared Advisory Bucket (U1)

`mapLegacyFieldToAdvisoryField` in `instrumentMetadataMapper.ts` maps **both** `'vocalStyle'` and `'eventType'` → `'genre'`.

```ts
// instrumentMetadataMapper.ts:166
if (field === 'vocalStyle' || field === 'eventType') return 'genre';
```

`groupMetadataSuggestionsForAdvisory` therefore produces a single `AdvisoryMetadataSuggestion` for `field: 'genre'`. In `MetadataSuggestionPanel`, the consumer code assigns this one group to **both** `vocalStyle` and `eventType`:

```ts
if (group.field === 'genre') {
  advisoryByLegacyField.set('vocalStyle', group);
  advisoryByLegacyField.set('eventType', group);   // ← same reference
}
```

Both rendered blocks show identical top value, identical alternatives, identical conflict badges.

### Issue 2 — Fallback Map Mutation on Error (B1)

`handleAiSuggestMetadata` in `useUploadForm.ts` catch block:

```ts
// useUploadForm.ts:206-209
} catch {
  if (vocalStyle && GENRE_ETHNICITY_MAP[vocalStyle]) {
    const suggested = GENRE_ETHNICITY_MAP[vocalStyle][0];
    if (suggested && !ethnicity) setEthnicity(suggested);  // ← mutates form on error path
  }
  setAiSuggestError('...');
}
```

The API failing does not imply the fallback map value is correct. Contributor has not approved this value.

### Issue 3 — Misleading Confidence Source (U2)

`pushSuggestion` in `instrumentMetadataMapper.ts` propagates the **instrument detection confidence** uniformly to every metadata suggestion derived from that instrument. The panel renders these scores as if they represent per-field metadata prediction confidence. There is no separate metadata prediction model; the score is always instrument-level.

### Issue 4 — Top Candidate / Source Row Mismatch (B2)

When `eventType` advisory is resolved from the shared `genre` group, `resolveTopValue` returns `advisory.candidates[0].value` — which may be a vocal style value, not an event type. `pickBestRowForValue` then scans `grouped['eventType']` rows for that value and finds nothing → `topRow = null` → source label and `InstrumentConfidenceBar` are omitted silently.

### Issue 5 — GPS Copy Without Diacritics (C1)

```ts
// MetadataStepSection.tsx:290-293
? 'Chinh xac cao'
: capturedGpsAccuracy <= 200
  ? 'Trung binh'
  : 'Thap - nen kiem tra lai'
```

Correct Vietnamese: `'Chính xác cao'`, `'Trung bình'`, `'Thấp — nên kiểm tra lại'`.

### Issue 6 — Wrong Step Count in Comment (D1)

```ts
// UploadMusic.tsx:575 and :615
// Guard in edit mode or during Step 2-4 of the wizard
```

Wizard has steps 1, 2, 3. Comment should read `Step 2-3`.

---

## 3. What Must Remain Unchanged

- Upload wizard step count and navigation logic (`useUploadWizard`, `canNavigateToStep`)
- All backend API endpoints (`MetadataSuggest`, upload analyze endpoints)
- Upload submit payload — no field additions or removals
- `MetadataSuggestionPanel` "Áp dụng" (apply) button: contributor-initiated, never auto-applied
- `handleAiSuggestMetadata` success path — it correctly mutates form fields on explicit contributor action
- `mapInstrumentsToMetadataSuggestions` return shape and deduplication logic
- `groupMetadataSuggestionsForAdvisory` public contract (used by moderation flow)
- `instrumentDetectionService` feature flags (`confidenceEnabled`, `VITE_INSTRUMENT_DETECTION_MOCK`)
- All validation rules for Step 2 → Step 3 navigation gate

---

## 4. Refactor Goals

1. **Issue 1** — Produce a distinct advisory group for `eventType` so its UI block renders independently of `vocalStyle`.
2. **Issue 2** — Remove form mutation from the error catch path; error path must only set `aiSuggestError`, never touch form state.
3. **Issue 3** — Add a single-line source attribution note inside `MetadataSuggestionPanel` clarifying that confidence reflects instrument detection, not independent metadata prediction.
4. **Issue 4** — Fix `resolveTopValue` / `pickBestRowForValue` for `eventType` so that when advisory candidates exist but none matches `eventType` rows, the panel falls back gracefully to the highest-confidence actual `eventType` row instead of silently losing source + bar.
5. **Issue 5** — Replace unaccented GPS accuracy strings with correct Vietnamese.
6. **Issue 6** — Update both stale comments from `Step 2-4` → `Step 2-3`.

---

## 5. Proposed UI/Logic Structure

### Advisory Separation (Issue 1)

```
Before:
  genre bucket → vocalStyle block  (shared)
               → eventType block   (same data, duplicate)

After:
  genre bucket     → vocalStyle block  (vocal-style rows only)
  eventType bucket → eventType block   (eventType rows only; independent candidates)
```

`mapLegacyFieldToAdvisoryField` gains a dedicated `'eventType'` advisory field output, or the panel builds `eventType` candidates directly from `grouped['eventType']` rows without routing through the advisory system.

**Chosen approach:** Extend the advisory mapper with a dedicated `'eventType'` advisory field (`AdvisoryMetadataSuggestionField`). This keeps the advisory contract consistent without a special-case branch in the panel.

### Source Attribution (Issue 3)

Add a static explanatory footnote at the bottom of `MetadataSuggestionPanel`:

> *Độ tin cậy hiển thị theo mức tin cậy phát hiện nhạc cụ. Gợi ý dân tộc, vùng, lối hát và loại sự kiện được suy ra từ danh mục nhạc cụ.*

Rendered as `<p className="text-[10px] text-neutral-400 mt-3 leading-relaxed">`.  
Do not alter or remove `InstrumentConfidenceBar`. The bar remains but its source is now explained.

### Graceful Fallback for eventType (Issue 4)

`resolveTopValue` fallback chain:

```
1. advisory.candidates[0].value  — if pickBestRowForValue hits actual eventType rows
2. rows[0].value                 — if advisory candidate does not match any eventType row
```

`pickBestRowForValue` already implements this; the bug is that advisory was pointing at genre candidates. Once Issue 1 is fixed (dedicated eventType advisory), Issue 4 resolves automatically for the advisory path. Add an explicit guard for the edge case where no advisory exists for a field.

---

## 6. Component Breakdown

| Component | Change Type | Summary |
|-----------|-------------|---------|
| `instrumentMetadataMapper.ts` | **Logic fix** | Add `'eventType'` to `AdvisoryMetadataSuggestionField` type; update `mapLegacyFieldToAdvisoryField` to return `'eventType'` for `field === 'eventType'`; add `aliasCanonicalByField['eventType']`; update `rankCandidates` guard |
| `MetadataSuggestionPanel.tsx` | **Logic fix + copy** | Update `advisoryByLegacyField` build loop to map `group.field === 'eventType'` → `set('eventType', group)`; remove the shared-genre double-assignment; add source attribution footnote |
| `useUploadForm.ts` | **Logic fix** | Remove `setEthnicity` call from catch block; retain `setAiSuggestError` only |
| `MetadataStepSection.tsx` | **Copy fix** | Replace three unaccented GPS accuracy strings with accented Vietnamese |
| `UploadMusic.tsx` | **Comment fix** | Update two comments `Step 2-4` → `Step 2-3` (lines 575, 615) |
| `types/instrumentDetection.ts` | **Type update** | Add `'eventType'` to `AdvisoryMetadataSuggestionField` union |

---

## 7. Files to Modify

| File | Change Scope |
|------|-------------|
| `src/utils/instrumentMetadataMapper.ts` | Medium — new advisory field, updated mapping function, `rankCandidates` alias map |
| `src/types/instrumentDetection.ts` | Small — union type extension |
| `src/components/features/upload/MetadataSuggestionPanel.tsx` | Small — loop fix + footnote |
| `src/features/upload/hooks/useUploadForm.ts` | Small — remove 3 lines from catch block |
| `src/components/features/upload/steps/MetadataStepSection.tsx` | Trivial — 3 string literals |
| `src/components/features/UploadMusic.tsx` | Trivial — 2 comment lines |

---

## 8. Risk Checklist

| Risk | Level | Mitigation |
|------|-------|-----------|
| Adding `'eventType'` to `AdvisoryMetadataSuggestionField` breaks callers expecting 3 values | Low | Grep all consumers; only `MetadataSuggestionPanel` and `ModerationVerificationWizardDialog` consume advisory groups — update both |
| `rankCandidates` called with `eventType` rows missing alias map entry → runtime access on undefined key | Low | Add empty `eventType: {}` entry to `aliasCanonicalByField` |
| Removing `setEthnicity` from catch removes last-resort fallback that some users relied on implicitly | Low | This was an undocumented side-effect. Error path should never silently populate a form field. Log the fallback value in `console.warn` instead if needed for debugging |
| `instrumentMetadataMapper.test.ts` — existing tests for advisory grouping may fail after field split | Medium | Run `instrumentMetadataMapper.test.ts` immediately after Phase 2; update test fixtures to expect `'eventType'` advisory group |
| `ModerationVerificationWizardDialog` imports `groupMetadataSuggestionsForAdvisory` — must handle new field | Low | `eventType` advisory group is additive; moderation consumer ignores unknown fields via destructuring |
| GPS string change breaks any downstream logic reading the string value | Zero | `gpsAccuracyLabel` is display-only; it is never stored, compared, or sent to an API |
| Stale comment fix creates no logical diff | Zero | Pure documentation |

---

## 9. Implementation Checklist by Phase

> Each phase is independently reviewable. Proceed to next only after current phase passes its verification gate.

### Phase 1 — Data Integrity: Remove Fallback Mutation on API Error

- [ ] **1.1** In `useUploadForm.ts`, locate the `catch` block of `handleAiSuggestMetadata` (lines 205–210).
- [ ] **1.2** Delete the three lines that call `GENRE_ETHNICITY_MAP` and `setEthnicity` inside the catch block.
- [ ] **1.3** Retain `setAiSuggestError('Không kết nối được dịch vụ gợi ý. Kiểm tra backend và thử lại.')` as the sole side-effect in catch.
- [ ] **1.4** Verify: triggering a simulated API failure must not change `ethnicity` state. Use the React DevTools profiler or add a temporary `console.assert(!ethnicity, ...)` guard in dev.

**Gate:** `useUploadForm` catch path never calls any form setter except `setAiSuggestError` and `setAiSuggestLoading`.

---

### Phase 2 — Advisory Field Separation: vocalStyle vs eventType

- [ ] **2.1** In `src/types/instrumentDetection.ts`, add `'eventType'` to the `AdvisoryMetadataSuggestionField` union type.
- [ ] **2.2** In `instrumentMetadataMapper.ts`, update `mapLegacyFieldToAdvisoryField`:
  - `field === 'vocalStyle'` → `return 'genre'` *(unchanged)*
  - `field === 'eventType'` → `return 'eventType'` *(new dedicated mapping)*
- [ ] **2.3** In `rankCandidates`, extend `aliasCanonicalByField` to include `eventType: {}` (empty — no canonical aliases yet; add domain values as they become known).
- [ ] **2.4** Run `instrumentMetadataMapper.test.ts`. Update test fixtures:
  - Expect `groupMetadataSuggestionsForAdvisory` to return a group with `field: 'eventType'` when `eventType` rows are present.
  - Confirm `vocalStyle` group (`field: 'genre'`) no longer contains `eventType`-sourced rows.
- [ ] **2.5** In `MetadataSuggestionPanel.tsx`, update the `advisoryByLegacyField` build loop:
  - Remove `advisoryByLegacyField.set('eventType', group)` from the `group.field === 'genre'` branch.
  - Add: `if (group.field === 'eventType') advisoryByLegacyField.set('eventType', group);`
- [ ] **2.6** Smoke test: upload a track where fallback data includes `eventType` values. Confirm `vocalStyle` and `eventType` panels render different top values and different "Các gợi ý khác" lists.

**Gate:** `MetadataSuggestionPanel` renders two distinct, non-identical blocks for `vocalStyle` and `eventType` whenever both have suggestions. No shared candidates.

---

### Phase 3 — Explainability: Source Attribution Footnote

- [ ] **3.1** In `MetadataSuggestionPanel.tsx`, add a footnote paragraph at the bottom of the panel's root `<div>`, rendered only when `suggestions.length > 0 && !loading && !error`:

  ```tsx
  <p className="text-[10px] text-neutral-400 mt-3 leading-relaxed">
    Độ tin cậy hiển thị theo mức phát hiện nhạc cụ. Gợi ý dân tộc, vùng, lối hát và loại sự kiện được suy ra từ danh mục nhạc cụ, không phải từ mô hình dự đoán độc lập.
  </p>
  ```

- [ ] **3.2** Verify footnote appears in both `readOnly` and interactive modes.
- [ ] **3.3** Do not add any `(?)` tooltip or collapsible. Static text is sufficient and safer for accessibility.

**Gate:** Panel has footnote text visible below all suggestion rows when suggestions are present.

---

### Phase 4 — Candidate Matching Fix: eventType Source Row Recovery

- [ ] **4.1** After Phase 2, validate the edge case: if the instrument fallback provides `eventType` values but those values differ (after normalization) from the `genre` bucket top candidate, the `eventType` panel must still display source and confidence bar.
  - With dedicated `'eventType'` advisory: `resolveTopValue` reads `advisory.candidates[0].value` from the `eventType` group → `pickBestRowForValue` scans `grouped['eventType']` for a match → finds it correctly because advisory candidates are now built from `eventType` rows only.
- [ ] **4.2** Add an explicit guard in `resolveTopValue` for the case where `advisory` is present but `pickBestRowForValue` still returns `null` (defensive against future edge cases):

  ```ts
  function resolveTopValue(field: MetadataSuggestionField, rows: MetadataSuggestion[]): string | null {
    const advisory = advisoryByLegacyField.get(field);
    if (advisory && advisory.candidates.length > 0) {
      const topCandidate = advisory.candidates[0].value;
      // Only use advisory top if it actually matches a row; otherwise fall back to rows.
      if (pickBestRowForValue(rows, topCandidate)) return topCandidate;
    }
    if (rows.length > 0) return rows[0].value;
    return null;
  }
  ```

- [ ] **4.3** Verify: for `eventType` field, `topRow` is never `null` when `rows.length > 0`.

**Gate:** `MetadataSuggestionPanel` always renders a source label and confidence bar for `eventType` whenever `eventType` rows exist in `aiMetadataSuggestions`.

---

### Phase 5 — GPS Copy + Documentation Cleanup

- [ ] **5.1** In `MetadataStepSection.tsx` lines 290–293, replace:
  ```ts
  ? 'Chinh xac cao'
  : capturedGpsAccuracy <= 200
    ? 'Trung binh'
    : 'Thap - nen kiem tra lai'
  ```
  with:
  ```ts
  ? 'Chính xác cao'
  : capturedGpsAccuracy <= 200
    ? 'Trung bình'
    : 'Thấp — nên kiểm tra lại'
  ```

- [ ] **5.2** In `UploadMusic.tsx`, update two comment lines:
  - Line 575: `// Guard in edit mode or during Step 2-4 of the wizard` → `// Guard in edit mode or during Step 2-3 of the wizard`
  - Line 615: same replacement.

**Gate:** `gpsAccuracyLabel` outputs correctly accented Vietnamese strings. Both wizard-step comments read `Step 2-3`.

---

### Phase 6 — Verification

- [x] **6.1** `npm run lint && npx tsc --noEmit` — zero errors, zero new warnings. *(Verified 2026-05-04.)*
- [x] **6.2** Run `instrumentMetadataMapper.test.ts` (+ `MetadataSuggestionPanel.test.tsx`) — all assertions green. *(Verified 2026-05-04: 12 + 4 tests.)*
- [ ] **6.3** Manual smoke test — new upload wizard, track with `instrumental` performance type, instruments that have fallback `eventType` data:
  - `MetadataSuggestionPanel` shows separate blocks for `Lối hát / Thể loại` and `Loại sự kiện` with different content.
  - Each block shows source instrument label and confidence bar.
  - Footnote appears at bottom of panel.
- [ ] **6.4** Manual smoke test — simulate `suggestMetadata` API failure (disable backend or mock `Promise.reject`):
  - `aiSuggestError` state is set.
  - `ethnicity` form field is unchanged from its pre-button-click value.
  - No form setter is called on error path.
- [ ] **6.5** Manual smoke test — GPS capture with each accuracy tier:
  - `< 50 m` → label reads `Chính xác cao`
  - `50–200 m` → label reads `Trung bình`
  - `> 200 m` → label reads `Thấp — nên kiểm tra lại`
- [x] **6.6** Search **application source** (`src/**/*.ts`, `src/**/*.tsx`) for the obsolete wizard comment token — zero matches. *(Verified 2026-05-04; historical mentions may remain in `docs/`.)*

---

## 10. Validation Plan

| Scenario | Expected Behaviour | Regression Risk |
|----------|-------------------|----------------|
| Instrument with both `vocalStyle` and `eventType` fallback data | Two separate panel blocks, distinct content | Medium (Phase 2 changes mapper) |
| Instrument with `vocalStyle` only | Only `Lối hát / Thể loại` block renders; `Loại sự kiện` absent | Low |
| Instrument with `eventType` only | Only `Loại sự kiện` block renders; `Lối hát / Thể loại` absent | Low |
| `suggestMetadata` returns 200 with ethnicity | `ethnicity` state updated, success message shown | Zero (success path unchanged) |
| `suggestMetadata` throws network error | `aiSuggestError` shown, `ethnicity` field unchanged | Low (catch block shrinks) |
| `readOnly` panel mode (moderation view) | Footnote visible, no "Áp dụng" buttons, advisory badges shown | Low |
| GPS accuracy < 50 m | `Chính xác cao` label | Zero (pure string change) |
| GPS accuracy 50–200 m | `Trung bình` label | Zero |
| GPS accuracy > 200 m | `Thấp — nên kiểm tra lại` label | Zero |
| Contributor applies suggestion → moves to Step 3 → submits | Payload unchanged from pre-refactor | Zero (no payload change) |

---

## 11. Design / Copy Rules

- Panel footnote: `text-[10px] text-neutral-400` — visually recessive, never competes with suggestion values.
- GPS labels: match casing and diacritic style used in all other Vietnamese UI strings in `MetadataStepSection`.
- Do not add any new toast, modal, or banner for the explainability note. Inline static text only.
- Advisory badges (`Nhiều nguồn ảnh hưởng`, `Cần chuyên gia xác minh`) remain unchanged — they are domain-correct.
- "Áp dụng" button remains always explicit, never triggered programmatically.

---

## 12. Do Not Change

- `App.tsx` — routes, wizard entry points
- `useUploadWizard.ts` — step count, `canNavigateToStep` logic
- `useUploadSubmission.ts` — submission payload, AI analysis pipeline
- `metadataSuggestService.ts` — API contract, endpoint, request shape
- `instrumentDetectionService.ts` — feature flags, mock mode
- `uploadFormValidation.ts` / `isUploadFormComplete` — validation rules
- `INSTRUMENT_METADATA_FALLBACK` data file — static catalog
- `mapInstrumentsToMetadataSuggestions` return shape (additive `eventType` rows already emitted correctly)
- `dedupeAndSortMetadataSuggestions` — dedupe logic
- Moderation wizard (`ModerationVerificationWizardDialog`) — consumer of advisory data; receives new `eventType` group additively, no breaking change required
- Expert annotation flow — no dependency on advisory field count
