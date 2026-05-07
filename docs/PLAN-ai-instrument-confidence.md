# PLAN: AI Instrument Detection — Confidence Score Display

> **Slug**: `ai-instrument-confidence`
> **Ngày tạo**: 2026-04-28
> **Trạng thái**: Completed (Phase 1 -> Phase X)
> **Review 3**: Xác thực nhạc cụ + hiển thị AI confidence %

---

## Trạng thái triển khai (cập nhật 2026-04-28)

- Hoàn thành Phase 1, 2, 3A, 3B, 3C, 3D, 4 và Phase X.
- Đã chạy verify tự động: `lint`, `tsc --noEmit`, `test:unit`, `build` -> pass.
- Đã thêm feature flags:
  - `VITE_INSTRUMENT_CONFIDENCE`
  - `VITE_INSTRUMENT_DETECTION_MOCK`
- Cần follow-up thủ công: smoke test end-to-end upload + moderation trên môi trường thật.

---

## Mục tiêu

Hiển thị **AI confidence %** cho từng nhạc cụ được phát hiện trong bản ghi, ở cả luồng **Upload** (contributor) và **Moderation** (expert). Cho phép expert override khi confidence thấp.

### Tại sao cần làm

- Góp ý Review 3: "Cần xác thực nhạc cụ có trong bản ghi ở bước AI Analyze và hiển thị AI confidence %."
- Hiện tại upload flow chỉ nhận `instruments: { name }[]` từ Gemini (`/api/AIAnalysis/analyze-only`), **không có confidence**.
- Backend **đã có sẵn** endpoint Python audio-analysis trả về confidence chi tiết nhưng **FE chưa dùng**.

---

## Context Check — Hệ thống hiện tại

### Backend: 2 pipeline AI song song

| # | Endpoint | Engine | Response type | Có confidence? |
|---|----------|--------|--------------|----------------|
| 1 | `POST /api/AIAnalysis/analyze-only` | Gemini | `AIAnalysisResultDto` | **KHÔNG** — instruments chỉ có `{id, name}` |
| 2 | `POST /api/audio-analysis/detect-instruments` | Python ML | `PythonAnalyzeData` | **CÓ** — `DetectedInstrument` đầy đủ |
| 3 | `POST /api/audio-analysis/analyze-recording/{id}` | Python ML | `PythonAnalyzeData` | **CÓ** — cùng shape |
| 4 | `GET /api/audio-analysis/supported-instruments` | Python ML | `string[]` | N/A |

### DetectedInstrument DTO (đã có trong Swagger + generated.d.ts)

```typescript
interface DetectedInstrument {
  instrument: string | null;
  confidence: number;       // 0.0–1.0 average confidence
  max_confidence: number;   // peak confidence across frames
  overall_average: number;  // overall average score
  frame_ratio: number;      // % of frames instrument appeared
  dominant_frames: number;  // frames where instrument was dominant
  total_frames: number;     // total analyzed frames
}
```

### PythonAnalyzeData DTO

```typescript
interface PythonAnalyzeData {
  instruments: DetectedInstrument[] | null;
  timeline: InstrumentTimeSegment[] | null;
  audio_info: AudioAnalysisInfo;
}
```

### Frontend hiện tại

| Surface | File | Instrument data | Confidence? |
|---------|------|----------------|-------------|
| Upload wizard AI | `useUploadSubmission.ts` → calls `/AIAnalysis/analyze-only` | `{ name }[]` → strips to `string[]` | **Không** |
| Metadata suggest | `metadataSuggestService.ts` → `/MetadataSuggest` | `string[]` | **Không** |
| Moderation detail | `ModerationDetailView.tsx` | `culturalContext.instruments: string[]` | **Không** |
| ModerationAITab | `ModerationAITab.tsx` | Q&A messages, not instruments | N/A |
| Instrument field (UI) | `MetadataStepSection.tsx` | `MultiSelectTags` with `string[]` | **Không** |

### Existing confidence pattern in codebase

`FlaggedResponseList.tsx` đã hiển thị `confidenceScore` cho Q&A messages:

```tsx
{typeof item.confidenceScore === 'number' && Number.isFinite(item.confidenceScore) && (
  <span>Confidence: {item.confidenceScore.toFixed(2)}</span>
)}
```

→ Có thể tái sử dụng pattern này cho instrument confidence.

---

## Data Contract đề xuất

### 1. FE types (mới)

```typescript
// src/types/instrumentDetection.ts

export interface DetectedInstrument {
  instrument: string;
  confidence: number;       // 0.0–1.0
  max_confidence: number;
  overall_average: number;
  frame_ratio: number;
  dominant_frames: number;
  total_frames: number;
}

export interface AudioAnalysisInfo {
  filename: string | null;
  duration_seconds: number;
  analyzed_duration: number;
  num_frames: number;
  sample_rate: number;
}

export interface InstrumentTimeSegment {
  instrument: string;
  start_seconds: number;
  end_seconds: number;
  num_frames: number;
}

export interface InstrumentDetectionResult {
  instruments: DetectedInstrument[];
  timeline: InstrumentTimeSegment[] | null;
  audio_info: AudioAnalysisInfo | null;
}
```

### 2. Confidence thresholds (FE constants)

```typescript
// src/features/upload/constants/instrumentConfidence.ts

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.7,       // xanh lá — chấp nhận được
  MEDIUM: 0.4,     // vàng — cần expert review
  LOW: 0,          // đỏ — cần override / reject
} as const;

export const CONFIDENCE_LABELS = {
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
} as const;
```

### 3. FE service (mới)

```typescript
// src/services/instrumentDetectionService.ts

/** POST /api/audio-analysis/detect-instruments */
detectInstruments(file: File, includeTimeline?: boolean): Promise<InstrumentDetectionResult>

/** POST /api/audio-analysis/analyze-recording/{recordingId} */
analyzeRecording(recordingId: string): Promise<InstrumentDetectionResult>

/** GET /api/audio-analysis/supported-instruments */
getSupportedInstruments(): Promise<string[]>
```

### 4. API response normalization

Backend có thể trả `PythonAnalyzeData` wrapped trong `ServiceResponse<T>`:

```typescript
{ success: boolean; message: string | null; data: PythonAnalyzeData; errors: string[] | null }
```

Service adapter cần unwrap `data` field + normalize snake_case.

---

## Affected Files

### Sửa đổi (modify)

| File | Thay đổi |
|------|----------|
| `src/features/upload/hooks/useUploadSubmission.ts` | Gọi thêm detect-instruments, merge confidence vào state |
| `src/features/upload/hooks/useUploadForm.ts` | Thêm `instrumentPredictions` state |
| `src/components/features/upload/steps/MetadataStepSection.tsx` | Hiển thị confidence % bên cạnh instrument tags |
| `src/components/features/moderation/ModerationDetailView.tsx` | Hiển thị confidence panel cho claimed items |
| `src/services/expertWorkflowService.ts` | Thêm `instrumentOverrides` vào `ModerationVerificationData.step2` |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | Step 2: thêm instrument verification section |
| `src/features/moderation/constants/verificationStepDefinitions.ts` | Thêm instrument verification fields vào step 2 |

### Tạo mới (create)

| File | Mô tả |
|------|-------|
| `src/types/instrumentDetection.ts` | FE types cho DetectedInstrument, PythonAnalyzeData |
| `src/services/instrumentDetectionService.ts` | Service adapter gọi Python audio-analysis API |
| `src/features/upload/constants/instrumentConfidence.ts` | Threshold + label constants |
| `src/components/common/InstrumentConfidenceBar.tsx` | Reusable confidence bar component |
| `src/components/common/InstrumentConfidenceBar.test.tsx` | Unit tests |
| `src/components/features/moderation/InstrumentConfidencePanel.tsx` | Panel hiển thị top instruments + confidence cho moderation |

---

## FE Display Plan

### A. Upload Wizard — Confidence sau AI Analyze

**Vị trí**: `MetadataStepSection` → ngay dưới nút "Lấy gợi ý AI", bên cạnh instrument multi-select.

**UX flow**:

1. User nhấn "Lấy gợi ý AI" → Gemini analyze chạy (flow hiện tại, giữ nguyên).
2. **Song song** hoặc **ngay sau**: gọi `/api/audio-analysis/detect-instruments` với cùng file.
3. Kết quả detect-instruments map vào UI:
   - Mỗi instrument tag hiển thị `name` + confidence bar nhỏ (inline).
   - Instrument có confidence < `MEDIUM` (0.4): badge vàng "Cần xác minh".
   - Instrument có confidence < `LOW` threshold: gạch ngang + tooltip "AI không chắc chắn".
4. User vẫn có thể add/remove instruments thủ công (flow hiện tại không đổi).

**Mockup dạng text**:

```
┌─ Nhạc cụ sử dụng ──────────────────────────────┐
│ [Đàn tranh  ██████████ 92%] [×]                 │
│ [Sáo trúc   ████████░░ 78%] [×]                 │
│ [Đàn nguyệt ████░░░░░░ 41%] ⚠ Cần xác minh [×] │
│ [+ Thêm nhạc cụ...]                             │
└──────────────────────────────────────────────────┘
```

### B. Moderation Detail View — Confidence Panel

**Vị trí**: `ModerationDetailView` → ngay dưới metadata row "Nhạc cụ", cho items đã claim.

**UX flow**:

1. Expert chọn submission → detail view load.
2. Nếu submission có `recordingId` → gọi `/api/audio-analysis/analyze-recording/{id}`.
3. Hiển thị `InstrumentConfidencePanel`:
   - Sorted by confidence descending.
   - Color-coded bars (xanh ≥0.7, vàng 0.4–0.7, đỏ <0.4).
   - Mỗi row: `instrument name | bar | NN% | frame_ratio`.
   - Low-confidence instruments có label cảnh báo.
4. Expert có thể "Xác nhận" hoặc "Bác bỏ" từng instrument (Phase 4).

**Mockup dạng text**:

```
┌─ AI Instrument Detection ───────────────────────┐
│ Đàn tranh     ████████████████████  92%  (0.85)  │
│ Sáo trúc      ███████████████░░░░░  78%  (0.71)  │
│ Đàn nguyệt    ████████░░░░░░░░░░░░  41%  (0.38)  │
│ ⚠ Đàn bầu     ███░░░░░░░░░░░░░░░░░  18%  (0.12)  │
│                                                   │
│ 📊 Phân tích: 120s / 256 frames / 44100 Hz       │
└───────────────────────────────────────────────────┘
```

### C. Fallback khi confidence thấp

- Nếu TẤT CẢ instruments có `confidence < 0.4`:
  - Hiển thị banner: "⚠ AI không tự tin về nhạc cụ — vui lòng kiểm tra thủ công."
  - Trong moderation: auto-flag cho expert ở step 2.
- Nếu endpoint Python trả lỗi / timeout:
  - Hiển thị: "Phân tích nhạc cụ không khả dụng. Sử dụng gợi ý AI text thay thế."
  - Fall back sang instrument names từ Gemini (flow hiện tại).

---

## Moderation Integration

### Verification wizard step 2 — Instrument verification

Thêm vào `ModerationVerificationData.step2`:

```typescript
step2?: {
  culturalValue: boolean;
  authenticity: boolean;
  accuracy: boolean;
  instrumentsVerified: boolean;     // MỚI: expert đã xác minh instruments
  instrumentOverrides?: {           // MỚI: override cụ thể
    [instrumentName: string]: 'confirmed' | 'rejected' | 'added';
  };
  expertNotes?: string;
  completedAt?: string;
};
```

**UX trong wizard**:

1. Step 2 hiện `InstrumentConfidencePanel` (read-only).
2. Bên dưới: checkbox "Đã xác minh danh sách nhạc cụ" (`instrumentsVerified`).
3. Nếu có instrument low-confidence: hiển thị inline toggle "Xác nhận / Bác bỏ" cho từng item.
4. Expert có thể thêm instrument bị thiếu → ghi vào `instrumentOverrides` với status `'added'`.

### Checklist update cho verificationStepDefinitions.ts

Step 2 thêm field:

```typescript
{
  key: 'instrumentsVerified',
  label: 'Nhạc cụ đã xác minh: Đã kiểm tra danh sách nhạc cụ AI phát hiện, xác nhận hoặc bác bỏ từng nhạc cụ',
}
```

---

## Phases

### Phase 1 — Types + Service adapter (estimate: ~1h)

**Tasks**:

1. Tạo `src/types/instrumentDetection.ts` — FE types.
2. Tạo `src/services/instrumentDetectionService.ts` — service gọi 3 endpoints.
3. Tạo `src/features/upload/constants/instrumentConfidence.ts` — thresholds.
4. Unit test cho service (mock fetch).

**Verify**:

- [x] Types compile (`tsc --noEmit`)
- [x] Service test pass
- [x] Import/export clean (no unused)

### Phase 2 — InstrumentConfidenceBar component (estimate: ~1h)

**Tasks**:

1. Tạo `src/components/common/InstrumentConfidenceBar.tsx`:
   - Props: `instrument: string`, `confidence: number`, `maxConfidence?: number`, `compact?: boolean`.
   - Color-coded bar: green ≥0.7, amber 0.4–0.7, red <0.4.
   - Compact mode: inline bar nhỏ cho upload wizard tags.
   - Full mode: wider bar cho moderation panel.
2. Unit tests.

**Verify**:

- [x] Renders correct colors at threshold boundaries
- [x] Compact vs full mode
- [x] Accessible (aria-label, aria-valuenow)

### Phase 3A — Upload wizard: call detect-instruments (estimate: ~1h)

**Tasks**:

1. `useUploadForm.ts` — thêm `instrumentPredictions: DetectedInstrument[]` state.
2. `useUploadSubmission.ts` — sau khi upload file thành công, gọi `detectInstruments(file)` song song / tuần tự. Lưu kết quả vào state.
3. Nếu Python endpoint lỗi → fallback im lặng (giữ flow Gemini hiện tại).

**Verify**:

- [x] Upload flow không bị break nếu Python endpoint offline
- [x] `instrumentPredictions` populated khi endpoint trả về

### Phase 3B — Upload wizard: hiển thị confidence (estimate: ~1h)

**Tasks**:

1. `MetadataStepSection.tsx`:
   - Nhận thêm prop `instrumentPredictions`.
   - Mỗi instrument tag render `InstrumentConfidenceBar` compact.
   - Instruments low-confidence có badge cảnh báo.
2. `UploadMusic.tsx` — truyền `instrumentPredictions` xuống.

**Verify**:

- [x] Tags hiện confidence bar inline
- [x] Low-confidence instruments có cảnh báo
- [x] Không ảnh hưởng flow khi không có predictions (fallback graceful)

### Phase 3C — Moderation: InstrumentConfidencePanel (estimate: ~1.5h)

**Tasks**:

1. Tạo `InstrumentConfidencePanel.tsx`:
   - Gọi `analyzeRecording(recordingId)` khi mount (lazy, cached).
   - Render sorted list + full-mode `InstrumentConfidenceBar`.
   - Hiển thị `audio_info` summary.
   - Loading / error / empty states.
2. Wire vào `ModerationDetailView.tsx` — ngay dưới instrument metadata row, cho claimed items.

**Verify**:

- [x] Panel loads khi có recordingId
- [x] Graceful fallback khi endpoint lỗi
- [x] Không gọi API cho unclaimed items

### Phase 3D — Moderation: Expert override trong wizard (estimate: ~1h)

**Tasks**:

1. `expertWorkflowService.ts` — thêm `instrumentsVerified` + `instrumentOverrides` vào `step2`.
2. `verificationStepDefinitions.ts` — thêm field `instrumentsVerified`.
3. `ModerationVerificationWizardDialog.tsx` — step 2:
   - Render `InstrumentConfidencePanel` (read-only).
   - Checkbox "Đã xác minh danh sách nhạc cụ".
   - Inline confirm/reject toggles cho low-confidence instruments.
4. Update `countStepCompletion` nếu cần.

**Verify**:

- [x] Step 2 field count updated correctly
- [x] `instrumentsVerified` persists trong localStorage
- [x] Override state saves correctly

### Phase 4 — Mock adapter + Feature flag (estimate: ~30m)

**Tasks**:

1. `instrumentDetectionService.ts` — thêm mock mode:
   - Env var `VITE_INSTRUMENT_DETECTION_MOCK=true`.
   - Trả mock `DetectedInstrument[]` với confidence values giả.
   - Dùng khi backend Python chưa deploy hoặc dev offline.
2. Feature flag `VITE_INSTRUMENT_CONFIDENCE=true` bọc toàn bộ confidence UI.
   - Khi `false`: hide confidence bars, chỉ show instrument names (behavior hiện tại).

**Verify**:

- [x] Mock mode trả data hợp lệ
- [x] Feature flag off -> không hiện confidence
- [x] Feature flag on -> đầy đủ UX

### Phase X — Verification (estimate: ~30m)

**Tasks**:

1. [x] `npm run lint` — 0 new errors
2. [x] `npx tsc --noEmit` — 0 new errors
3. [x] `npm run test:unit` — all pass
4. [x] `npm run build` — success
5. [ ] Manual check: upload flow + moderation flow không bị regression

---

## Validation / Verification Checklist

### Functional

- [x] Upload wizard hiển thị confidence % cho từng instrument
- [x] Instruments sorted by confidence (descending)
- [x] Color coding đúng: green ≥0.7, amber 0.4–0.7, red <0.4
- [x] Low-confidence banner hiển thị khi all instruments < 0.4
- [x] Moderation panel hiển thị confidence cho claimed items
- [x] Expert có thể verify instruments trong wizard step 2
- [x] Override persist qua localStorage reload
- [x] Fallback khi Python endpoint offline (Gemini names-only flow vẫn hoạt động)
- [x] Mock mode hoạt động khi env var = true

### Non-functional

- [x] Không gọi detect-instruments API cho mỗi re-render (cache / single call)
- [x] Detect-instruments call không block upload flow (parallel hoặc async)
- [x] No layout shift khi confidence bars load
- [x] Accessible: aria-label cho bars, screen reader text cho percentages

### Regression

- [x] Upload flow hoạt động bình thường khi Python endpoint down
- [x] Moderation flow không bị break cho unclaimed items
- [x] Existing `instruments: string[]` field vẫn hoạt động
- [x] MetadataSuggest flow (Gemini) không bị ảnh hưởng
- [x] ModerationVerificationData backward-compatible (old data thiếu `instrumentsVerified` -> treated as `false`)

---

## Risks + Mitigation

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| 1 | Python audio-analysis endpoint chưa deploy hoặc lỗi | Không có confidence data | Mock adapter + fallback sang Gemini names-only. Feature flag cho phép disable toàn bộ. |
| 2 | detect-instruments chậm (> 30s cho file lớn) | Block upload UX | Gọi async, không block upload. Hiển thị "Đang phân tích nhạc cụ..." spinner riêng. Timeout 60s. |
| 3 | Confidence score không chính xác cho nhạc cụ dân tộc hiếm | Expert bị mislead | Hiển thị disclaimer "AI confidence chỉ mang tính tham khảo". Expert override luôn ưu tiên. |
| 4 | `ModerationVerificationData` schema break backward | Existing localStorage data bị lỗi | `instrumentsVerified` optional, default `false`. `instrumentOverrides` optional. Old data tương thích. |
| 5 | Double API call (Gemini + Python) tăng latency | UX chậm ở upload | Gọi parallel (`Promise.allSettled`). Python call là best-effort, không block. |
| 6 | Rate limit / quota trên Python ML endpoint | 429 errors | Retry 1 lần + fallback. Log warning. Không retry aggressive. |

---

## Quyết định thiết kế

1. **Dùng Python endpoint thay Gemini cho confidence**: Gemini `analyze-only` chỉ trả instrument names. Python `detect-instruments` trả full confidence metrics. Không đổi Gemini pipeline — song song bổ sung.

2. **Confidence hiển thị = `confidence` field (average)**: Hiện giá trị average confidence chính. `max_confidence` và `frame_ratio` hiện trong tooltip hoặc panel mở rộng cho expert.

3. **Feature flag wrap**: Toàn bộ confidence UI bọc sau `VITE_INSTRUMENT_CONFIDENCE`. Cho phép demo nhanh và rollback nhanh.

4. **localStorage backward-compatible**: Không migrate old data. Missing fields → defaults.

---

## Dependency

- Backend Python audio-analysis endpoints phải online (hoặc dùng mock).
- Không cần thay đổi backend .NET 8.
- Không cần thay đổi Gemini pipeline.
- Không cần OpenAI / LangChain.
