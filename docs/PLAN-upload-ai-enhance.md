# PLAN: Upload Flow AI Enhancement — Show Detection in Step 1 + Apply Suggestions in Step 2

**Loại:** Feature Enhancement  
**Ưu tiên:** High  
**Tác giả:** Senior Frontend Engineer  
**Ngày:** 2026-05-01

---

## 1. Senior Assessment — Hiện trạng

### Hiện tại

| Vị trí | Behavior |
|--------|----------|
| **Step 1 (MediaUploadStep)** | Chỉ có checkbox "AI Phân tích", progress bar upload, thông báo "Đã tải lên thành công". **Không hiển thị** kết quả instrument detection hay suggestion nào. |
| **Step 2 (MetadataStepSection)** | Hiện `InstrumentConfidenceBar` cho nhạc cụ đã chọn + `MetadataSuggestionPanel` với nút "Áp dụng". Nhưng chỉ xuất hiện khi `requiresInstruments === true` (tức `performanceType` phải là `instrumental` hoặc `vocal_accompaniment`). |

### Vấn đề

1. User upload xong → không biết AI detect ra gì → phải tự sang Step 2, tự chọn loại hình biểu diễn, mới thấy kết quả.
2. Suggestion metadata (region, genre, ethnicity) bị ẩn nếu user chưa chọn đúng `performanceType`.
3. User không có cơ hội xem trước AI gợi ý trước khi điền metadata.

### Mục tiêu

Sau upload thành công ở Step 1:
- Hiện panel "AI Instrument Analysis" ngay với confidence bars.
- Hiện preview suggestion metadata (read-only, không nút Apply).
- Step 2 giữ nguyên: panel suggestion + nút Apply.
- AI fail → warning không chặn flow.

---

## 2. Critical Rules (Không phá vỡ)

- Không redesign upload wizard (3 bước giữ nguyên).
- Không đổi backend APIs.
- Không auto-fill metadata cuối cùng.
- AI suggestion chỉ là advisory.
- Contributor input là source of truth trước moderation.
- Expert decision là final authority.
- AI failure không block upload hoặc submit.

---

## 3. Files Affected

| File | Mức thay đổi | Ghi chú |
|------|-------------|---------|
| `src/components/features/upload/steps/MediaUploadStep.tsx` | **Cao** | Thêm AI result panel sau upload success |
| `src/components/features/UploadMusic.tsx` | **Nhẹ** | Pass thêm `instrumentPredictions` + `aiMetadataSuggestions` + loading state xuống `MediaUploadStep` |
| `src/types/instrumentDetection.ts` | **Nhẹ** | Thêm `MetadataSuggestionCandidate` type (Phase 2) |
| `src/utils/instrumentMetadataMapper.ts` | **Nhẹ** | Thêm conflict detection logic (Phase 2) |
| `src/features/upload/hooks/useUploadSubmission.ts` | **Không đổi** | Đã set `instrumentPredictions` + `aiMetadataSuggestions` đúng chỗ |
| `src/components/features/upload/MetadataSuggestionPanel.tsx` | **Không đổi** | Đã có sẵn, Step 2 reuse |
| `src/components/common/InstrumentConfidenceBar.tsx` | **Không đổi** | Reuse |

---

## 4. Risky State Variables

| Variable | Risk | Mitigation |
|----------|------|-----------|
| `instrumentPredictions` | Có thể empty nếu AI fail hoặc flag tắt | Check `length > 0` trước render |
| `aiMetadataSuggestions` | Có thể empty nếu mapper không match reference data | Graceful empty state |
| `isUploadingMedia` | Đang true khi AI còn chạy (upload + AI song song) | Tách `aiAnalysisLoading` state riêng nếu cần |
| `instrumentDetectionFlags.confidenceEnabled` | Feature flag có thể tắt | Guard trước mọi render |
| `createdRecordingId` | Null nếu create-submission fail | Chỉ show AI panel khi `createdRecordingId` exists |

---

## 5. Phase-by-Phase Implementation

**Status tổng:** ✅ Hoàn thành Phase 1 → 5 (2026-05-01)

### Phase 1 — Step 1 AI Result Panel

**Rules:**
- Chỉ sửa `MediaUploadStep.tsx` và `UploadMusic.tsx`
- Không đổi `useUploadSubmission` logic
- Không đổi `useUploadForm` state
- Panel chỉ hiện sau upload thành công (`createdRecordingId` exists)
- Reuse `InstrumentConfidenceBar` component

**Tasks:**
- [x] `UploadMusic.tsx`: pass `instrumentPredictions`, `aiMetadataSuggestions`, `isUploadingMedia` xuống `MediaUploadStep` props
- [x] `MediaUploadStep.tsx`: thêm props type cho `instrumentPredictions`, `aiMetadataSuggestions`
- [x] Render panel "AI Instrument Analysis" ngay sau success banner
- [x] Hiển thị danh sách detected instruments với `InstrumentConfidenceBar`
- [x] Confidence warning:
  - `< 0.4` (MEDIUM threshold) → amber warning text
  - `< 0.7` (HIGH threshold) → neutral info
  - `>= 0.7` → green confidence
- [x] Nếu `instrumentPredictions` đang empty + `isUploadingMedia` → show "Đang phân tích nhạc cụ..."
- [x] Nếu `instrumentPredictions` empty + upload done + AI enabled → show non-blocking empty/fail message
- [x] Nếu AI flag tắt → không render gì
- [x] Footer text advisory + expert verification note

**Proposed UI (trong MediaUploadStep, sau success banner):**
```
┌────────────────────────────────────────────┐
│  🎵 AI Nhận diện nhạc cụ                  │
│                                            │
│  Đàn tranh ████████████████░░░ 87%         │
│  Sáo trúc  █████████████░░░░░░ 64%        │
│  Đàn bầu   ████░░░░░░░░░░░░░░ 33% ⚠️    │
│                                            │
│  ℹ️ Kết quả AI chỉ mang tính gợi ý.       │
│     Chuyên gia sẽ xác minh sau.            │
└────────────────────────────────────────────┘
```

---

### Phase 2 — Metadata Suggestion Mapper Enhancement

**Rules:**
- Chỉ sửa `instrumentMetadataMapper.ts` và `instrumentDetection.ts` types
- Không đổi existing `MetadataSuggestion` type (backward compatible)
- Thêm type mới `MetadataSuggestionWithConflict` cho enhanced display

**Tasks:**
- [x] Thêm type `MetadataSuggestionCandidate` và grouped advisory types (additive)
- [x] Thêm function grouping/ranking từ existing `MetadataSuggestion[]`
- [x] Conflict detection logic:
  - Gap > 20% giữa #1 và #2 → primary suggestion (clear winner)
  - Gap 5–20% → show top 3 + "Nhiều nguồn ảnh hưởng" warning
  - Gap < 5% → `requiresExpert = true`, "Cần chuyên gia xác minh"
- [x] Unit test cho mapper conflict logic

**Output type (additive, không break existing):**
```ts
type MetadataSuggestionCandidate = {
  value: string;
  label: string;
  score: number;
  sourceInstrument?: string;
};

type MetadataSuggestionGrouped = {
  field: MetadataSuggestionField;
  candidates: MetadataSuggestionCandidate[];
  conflictDetected: boolean;
  requiresExpert: boolean;
};
```

---

### Phase 3 — Step 1 Suggestion Preview (Read-only)

**Rules:**
- Chỉ sửa `MediaUploadStep.tsx`
- Read-only, không có nút Apply
- Dùng output từ Phase 2 mapper
- Nếu không có suggestion → không render section này

**Tasks:**
- [x] Render "Gợi ý Metadata từ AI" section dưới instrument panel
- [x] Hiển thị top candidates cho region, genre/vocalStyle, ethnicity
- [x] Conflict indicator nếu `conflictDetected`
- [x] "Cần chuyên gia xác minh" badge nếu `requiresExpert`
- [x] Không có nút Apply (chỉ preview)

**Proposed UI:**
```
┌────────────────────────────────────────────┐
│  💡 Gợi ý Metadata từ AI                   │
│                                            │
│  Khu vực:                                  │
│  • Miền Bắc  82%                           │
│  • Miền Trung 61%                          │
│                                            │
│  Thể loại:                                 │
│  • Dân ca  74%                             │
│  • Nghi lễ 58%                             │
│                                            │
│  Dân tộc:                                  │
│  • Kinh  66%                               │
│                                            │
│  ℹ️ Bạn có thể áp dụng gợi ý ở Bước 2.    │
└────────────────────────────────────────────┘
```

---

### Phase 4 — Step 2 Apply Suggestions (Enhanced)

**Rules:**
- Chỉ sửa `MetadataSuggestionPanel.tsx` (nếu cần) hoặc tạo wrapper
- Nút Apply chỉ update local form state
- Không gọi API khi Apply
- User vẫn edit tay được sau khi Apply
- Reuse existing `MetadataSuggestionPanel` nếu đủ

**Tasks:**
- [x] Verify `MetadataSuggestionPanel` đã có nút "Áp dụng" per field
- [x] Verify `onApply` callback update local form state correctly
- [x] Thêm conflict warning display nếu Phase 2 `conflictDetected`
- [x] Thêm "Cần chuyên gia xác minh" badge nếu `requiresExpert`
- [x] Đảm bảo panel hiển thị **bất kể** `performanceType` (không còn gate bởi `requiresInstruments`)

---

### Phase 5 — Submit Safety Verification

**Rules:**
- Không đổi submit logic
- Chỉ verify behavior

**Tasks:**
- [x] Verify: submit payload lấy từ contributor-edited form state only
- [x] Verify: `aiMetadataSuggestions` không xuất hiện trong payload gửi API
- [x] Verify: nếu user không Apply thì suggestion bị bỏ qua
- [x] Verify: nếu user Apply rồi edit tay → giá trị tay được giữ
- [x] TypeScript compile check
- [x] Upload vẫn hoạt động khi AI endpoint fail
- [x] Step 1 hiển thị detected instruments
- [x] Step 2 có thể Apply suggestions

---

## 6. Không thay đổi

- `useUploadSubmission.ts` — logic upload + AI call đã đúng
- `useUploadForm.ts` — state đã có sẵn
- `useUploadWizard.ts` — wizard step logic giữ nguyên
- `UploadWizardStepper.tsx` — stepper UI giữ nguyên
- `UploadWizardActions.tsx` — action buttons giữ nguyên
- Backend API contracts
- `instrumentDetectionService.ts`
- `recordingService.ts`
- `submissionService.ts`

---

## 7. Risk Checklist

| Risk | Mức độ | Mitigation |
|------|--------|-----------|
| AI result chưa có khi user sang Step 2 | Thấp | Step 2 đã handle empty state; Step 1 panel show loading |
| Feature flag tắt | Thấp | Guard `instrumentDetectionFlags.confidenceEnabled` ở mọi render |
| Mapper trả empty suggestion | Thấp | Graceful empty UI + info text |
| instrumentPredictions reference data mismatch | Trung bình | Mapper đã có `normalizeInstrumentMatchKey` + fallback table |
| Performance (thêm panel vào Step 1) | Thấp | Panel chỉ render khi upload xong + có data |
| Conflict detection logic sai | Trung bình | Unit test trong Phase 2 |

---

## 8. Release Checklist (Phase 1 → 5)

### Build & Quality Gates
- [x] `npx tsc --noEmit` pass sau mỗi phase chính
- [x] Lint sạch cho các file thay đổi (ReadLints)
- [x] Unit test mapper pass (`src/utils/instrumentMetadataMapper.test.ts`)
- [x] Unit test Step 1 AI panel pass (`src/components/features/upload/steps/MediaUploadStep.test.tsx`)
- [x] Unit test Step 2 apply pass (`src/components/features/upload/MetadataSuggestionPanel.test.tsx`)

### Functional Acceptance
- [x] Step 1 hiển thị AI instrument analysis sau upload thành công
- [x] Step 1 hiển thị loading/empty non-blocking state khi AI chậm hoặc fail
- [x] Step 1 hiển thị preview metadata advisory read-only (không có Apply)
- [x] Step 2 có panel AI suggestions với Apply theo field
- [x] Apply chỉ cập nhật local form state, không gọi API
- [x] User vẫn chỉnh tay sau khi Apply
- [x] Panel Step 2 không còn phụ thuộc `requiresInstruments`
- [x] Submit payload không dùng trực tiếp `aiMetadataSuggestions`

### Contract & Safety
- [x] Không thay đổi backend API contract
- [x] Không redesign upload wizard
- [x] AI failure không block upload/submit
- [x] Contributor input vẫn là source of truth trước moderation

### Release Decision
- **Go/No-Go:** ✅ **GO**
- **Ghi chú:** Sẵn sàng merge sau khi QA manual đi qua smoke flow upload thực tế (audio + AI on/off).
