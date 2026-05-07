# PLAN: Fix chú thích học thuật (Expert Annotations)

**Slug:** `fix-annotation`
**Ngày tạo:** 2026-04-19
**Tham chiếu:** `PLAN-expert-annotations.md`, `PLAN-feature-gaps.md §C`
**Phạm vi:** Frontend only — sửa bugs, bổ sung Vietnamese diacritics, cải thiện UX.

---

## Context Check (Phase -1)

### Hiện trạng

Tính năng chú thích học thuật đã được implement đầy đủ CRUD trong `AnnotationPanel`, tích hợp vào `ModerationPage` (tab "Chú thích học thuật") và hiển thị read-only trên `RecordingDetailPage`. Tuy nhiên có nhiều vấn đề cần fix:

### Files liên quan

| File | Vai trò |
|------|---------|
| `src/components/features/annotation/AnnotationPanel.tsx` | CRUD panel — **nhiều bug nhất** |
| `src/types/annotation.ts` | Types + labels — thiếu dấu |
| `src/services/annotationApi.ts` | API service — `getBySongId` pagination bị stub |
| `src/components/features/moderation/ModerationAnnotationTab.tsx` | Layout wrapper — OK |
| `src/components/features/moderation/ModerationExpertTabNav.tsx` | Tab nav — OK |
| `src/pages/ModerationPage.tsx` | Wires annotation tab — OK |
| `src/pages/RecordingDetailPage.tsx` | Read-only view — **có dấu đúng**, dùng làm reference |
| `src/hooks/useRecordingDetail.ts` | Load annotations for detail page — OK |

---

## Danh sách bugs & improvements

### BUG-1: Validation gán lỗi sai field (Critical)

**File:** `AnnotationPanel.tsx:156-158`

```typescript
// BUG: researchCitation quá dài → gán lỗi vào nextErrors.content thay vì citation
if (researchCitation.length > MAX_CITATION_LENGTH) {
  nextErrors.content = `Trich dan toi da ${MAX_CITATION_LENGTH} ky tu.`;
}
```

**Fix:**
- Thêm `researchCitation?: string` vào `FormErrors` type
- Đổi `nextErrors.content` → `nextErrors.researchCitation`
- Hiển thị `formErrors.researchCitation` dưới input citation

---

### BUG-2: Toàn bộ AnnotationPanel thiếu dấu tiếng Việt (Major UX)

**File:** `AnnotationPanel.tsx` — 30+ chuỗi ASCII Vietnamese

Tất cả text hiển thị trong panel đều thiếu diacritics, ví dụ:
- `"Chu thich hoc thuat"` → `"Chú thích học thuật"`
- `"Noi dung la bat buoc."` → `"Nội dung là bắt buộc."`
- `"Khong tai duoc danh sach chu thich."` → `"Không tải được danh sách chú thích."`
- `"Them chu thich"` → `"Thêm chú thích"`
- `"Da tao chu thich moi."` → `"Đã tạo chú thích mới."`
- `"Xoa chu thich nay? Hanh dong nay khong the hoan tac."` → `"Xóa chú thích này? Hành động này không thể hoàn tác."`
- vv.

**So sánh:** `RecordingDetailPage.tsx` và `ModerationAnnotationTab.tsx` **đã có dấu đúng**. Chỉ `AnnotationPanel.tsx` bị thiếu.

---

### BUG-3: `ANNOTATION_TYPE_LABELS` trong `types/annotation.ts` thiếu dấu (Major UX)

**File:** `src/types/annotation.ts:31-36`

```typescript
export const ANNOTATION_TYPE_LABELS: Record<string, string> = {
  scholarly_note: 'Ghi chu hoc thuat',   // → 'Ghi chú học thuật'
  rare_variant: 'Di ban hiem gap',       // → 'Dị bản hiếm gặp'
  research_link: 'Tai lieu nghien cuu',  // → 'Tài liệu nghiên cứu'
  general: 'Ghi chu chung',             // → 'Ghi chú chung'
};
```

Labels này ảnh hưởng cả `AnnotationPanel` lẫn `RecordingDetailPage` vì cả hai import từ đây.

**Lưu ý:** `PLAN-expert-annotations.md` Phase 1 spec có dấu đúng. Implementation đã bỏ mất dấu.

---

### BUG-4: Edit cho phép sửa annotation người khác (Permission logic)

**File:** `AnnotationPanel.tsx:307-315`

Nút "Sửa" hiển thị cho **tất cả** annotations khi `canEdit=true`, kể cả annotation của expert khác. Trong khi nút "Xóa" đã check `ownItem = item.expertId === expertId`.

**Hệ quả:** Khi sửa annotation người khác, `handleSubmit` gửi `expertId` = current user → ghi đè `expertId` gốc = "chiếm" annotation. Backend có thể reject hoặc cho phép tùy policy, nhưng UI nên nhất quán với delete.

**Fix:**
- Nút "Sửa" chỉ hiện khi `ownItem` (hoặc user là ADMIN)
- Hoặc: disable nút "Sửa" khi `!ownItem` với tooltip giải thích

---

### BUG-5: Label form tiếng Anh lẫn tiếng Việt (Inconsistency)

**File:** `AnnotationPanel.tsx:367`

```tsx
<label>Research citation (optional)
```

Nên đổi thành tiếng Việt nhất quán: `"Trích dẫn nghiên cứu (tùy chọn)"`

Tương tự:
- `"Citation:"` (line 334) → `"Trích dẫn:"`
- `aria-label="Annotation panel"` (line 247) → `aria-label="Bảng chú thích học thuật"`

---

### IMP-1: Citation URL không thành link trong AnnotationPanel (UX)

**File:** `AnnotationPanel.tsx:332-336`

Citation hiển thị dạng text thuần trong list. Trong khi `RecordingDetailPage` đã có `isLikelyHttpUrl()` để render thành `<a>`.

**Fix:** Dùng cùng logic `isLikelyHttpUrl` để render citation link trong panel list.

---

### IMP-2: `getBySongId` pagination bị stub (Dead code)

**File:** `annotationApi.ts:63-74`

```typescript
void page;
void pageSize;
```

Params `page`/`pageSize` không được gửi lên server. Swagger route `/api/Song/{songId}/annotations` không list query params `page`/`pageSize` → function signature gây mislead.

**Fix:** Bỏ params `page`/`pageSize` khỏi function signature hoặc gửi thật nếu backend hỗ trợ.

---

### IMP-3: Không có unit tests cho AnnotationPanel (Test gap)

Chỉ có E2E test (`30-annotation-expert.spec.ts`). Nên bổ sung unit tests cho:
- `validateForm` logic (đặc biệt BUG-1)
- `parseOptionalInt`
- `formatTimestamp`

---

## Phases

### Phase 1 — Fix bugs & diacritics (Critical)

| # | Task | File(s) |
|---|------|---------|
| 1.1 | Fix BUG-1: validation gán sai field | `AnnotationPanel.tsx` |
| 1.2 | Fix BUG-2: thêm dấu tiếng Việt toàn bộ AnnotationPanel | `AnnotationPanel.tsx` |
| 1.3 | Fix BUG-3: thêm dấu `ANNOTATION_TYPE_LABELS` | `types/annotation.ts` |
| 1.4 | Fix BUG-4: restrict edit button to own annotations | `AnnotationPanel.tsx` |
| 1.5 | Fix BUG-5: Vietnamese labels cho citation field | `AnnotationPanel.tsx` |

### Phase 2 — UX improvements

| # | Task | File(s) |
|---|------|---------|
| 2.1 | IMP-1: citation URL → clickable link trong list | `AnnotationPanel.tsx` |
| 2.2 | IMP-2: clean up `getBySongId` stub params | `annotationApi.ts` |

### Phase 3 — Refactoring

`AnnotationPanel.tsx` hiện 452 dòng, gộp chung data-fetching, form state, validation, CRUD handlers, list rendering, form rendering trong một component. Ngoài ra có hàm trùng lặp với `RecordingDetailPage`. Phase này tách ra hợp lý để dễ maintain và test.

#### REF-1: Extract shared annotation utils

**Hiện trạng:**
- `AnnotationPanel.tsx` có `formatTimestamp(seconds)` (line 47-54)
- `RecordingDetailPage.tsx` có `formatAnnotationTime(value)` (line 101-109)
- Hai hàm **gần giống nhau** — cùng logic `HH:MM:SS` / `MM:SS` nhưng khác tên, khác null-return (`'-'` vs `''`)
- `isLikelyHttpUrl()` chỉ tồn tại trong `RecordingDetailPage` (line 111-113), cần dùng chung cho IMP-1

**Tạo file:** `src/utils/annotationHelpers.ts`

```
// Consolidate: formatAnnotationTime + formatTimestamp → formatSecondsToTime
export function formatSecondsToTime(seconds: number | null, fallback = '-'): string

// Extract: parseOptionalInt (hiện nằm trong AnnotationPanel)
export function parseOptionalInt(raw: string): number | null

// Extract: isLikelyHttpUrl (hiện nằm trong RecordingDetailPage)
export function isLikelyHttpUrl(value: string): boolean
```

| # | Task | File(s) |
|---|------|---------|
| 3.1 | Tạo `annotationHelpers.ts` với 3 hàm trên | `src/utils/annotationHelpers.ts` (new) |
| 3.2 | `AnnotationPanel.tsx`: xóa `formatTimestamp`, `parseOptionalInt` inline → import từ utils | `AnnotationPanel.tsx` |
| 3.3 | `RecordingDetailPage.tsx`: xóa `formatAnnotationTime`, `isLikelyHttpUrl` inline → import từ utils | `RecordingDetailPage.tsx` |

---

#### REF-2: Extract `useAnnotations` custom hook

**Hiện trạng:** `AnnotationPanel` tự manage `annotations`, `loading`, `error`, `load()` (lines 85-121). Logic tương tự `useRecordingDetail.ts` nhưng không reuse.

**Tạo file:** `src/hooks/useAnnotations.ts`

```typescript
export function useAnnotations(recordingId: string) {
  // Returns: { annotations, sortedAnnotations, loading, error, reload }
}
```

| # | Task | File(s) |
|---|------|---------|
| 3.4 | Tạo `useAnnotations.ts` hook | `src/hooks/useAnnotations.ts` (new) |
| 3.5 | `AnnotationPanel.tsx`: thay inline state bằng `useAnnotations(recordingId)` | `AnnotationPanel.tsx` |

---

#### REF-3: Extract `useAnnotationForm` custom hook

**Hiện trạng:** Form state chiếm ~100 dòng logic trong component: `form`, `formErrors`, `showForm`, `editTarget`, `isSubmitting`, `resetForm`, `beginCreate`, `beginEdit`, `validateForm`, `handleSubmit`, `handleDelete`. Mix view logic với business logic.

**Tạo file:** `src/hooks/useAnnotationForm.ts`

```typescript
export function useAnnotationForm(opts: {
  recordingId: string;
  expertId: string;
  canEdit: boolean;
  onMutationSuccess: () => Promise<void>; // trigger reload
}) {
  // Returns: {
  //   form, formErrors, showForm, editTarget, isSubmitting,
  //   beginCreate, beginEdit, resetForm, handleSubmit, handleDelete
  // }
}
```

| # | Task | File(s) |
|---|------|---------|
| 3.6 | Tạo `useAnnotationForm.ts` hook | `src/hooks/useAnnotationForm.ts` (new) |
| 3.7 | `AnnotationPanel.tsx`: thay inline form logic bằng hook | `AnnotationPanel.tsx` |

---

#### REF-4: Split AnnotationPanel thành sub-components

**Hiện trạng:** Một JSX block 200+ dòng render cả list items lẫn form. Khó maintain khi thêm tính năng.

| # | Task | File(s) |
|---|------|---------|
| 3.8 | Extract `AnnotationListItem` — render 1 annotation row (type badge, timestamp, content, citation, action buttons) | `src/components/features/annotation/AnnotationListItem.tsx` (new) |
| 3.9 | Extract `AnnotationForm` — inline create/edit form (type select, content textarea, citation input, timestamp inputs, submit/cancel) | `src/components/features/annotation/AnnotationForm.tsx` (new) |
| 3.10 | `AnnotationPanel.tsx` giữ lại orchestration: header, loading/error/empty states, compose `AnnotationListItem` + `AnnotationForm` | `AnnotationPanel.tsx` |

**Kết quả sau refactor:**
```
AnnotationPanel.tsx          ~120 dòng (orchestration + states)
├── AnnotationListItem.tsx   ~60 dòng  (1 annotation row)
├── AnnotationForm.tsx       ~100 dòng (create/edit form)
useAnnotations.ts            ~40 dòng  (data fetching)
useAnnotationForm.ts         ~90 dòng  (form + CRUD logic)
annotationHelpers.ts         ~30 dòng  (shared utils)
```

---

### Phase 4 — Unit tests

| # | Task | File(s) |
|---|------|---------|
| 4.1 | Unit tests cho `annotationHelpers.ts` (`formatSecondsToTime`, `parseOptionalInt`, `isLikelyHttpUrl`) | `src/utils/annotationHelpers.test.ts` (new) |
| 4.2 | Unit tests cho `useAnnotationForm` validation logic (đặc biệt BUG-1 regression) | `src/hooks/useAnnotationForm.test.ts` (new) |

---

## Phase X — Verification Checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npx tsc --noEmit` passes | Auto |
| 2 | `npx eslint src/` passes | Auto |
| 3 | `npx vitest run` — unit tests pass (bao gồm tests mới) | Auto |
| 4 | AnnotationPanel hiển thị đúng dấu tiếng Việt toàn bộ | Visual |
| 5 | `ANNOTATION_TYPE_LABELS` có dấu trên cả ModerationPage và RecordingDetailPage | Visual |
| 6 | Validation: nhập citation quá 1000 ký tự → lỗi hiển thị dưới field citation (không phải content) | Manual |
| 7 | Nút "Sửa" chỉ hiện cho annotation của chính expert (hoặc Admin) | Manual |
| 8 | Citation URL trong list hiển thị dạng link clickable | Manual |
| 9 | Create / Update / Delete vẫn hoạt động bình thường | Manual |
| 10 | Không regression trên `RecordingDetailPage` (labels, citation links, timestamp format) | Manual |
| 11 | `AnnotationPanel.tsx` giảm xuống ~120 dòng sau refactor | Code review |
| 12 | Không còn hàm trùng lặp giữa `AnnotationPanel` và `RecordingDetailPage` | Code review |
| 13 | Các sub-components (`AnnotationListItem`, `AnnotationForm`) render đúng khi standalone | Visual |

---

## File Delivery Summary

| File | Loại | Phase |
|------|------|-------|
| `src/components/features/annotation/AnnotationPanel.tsx` | Sửa | Phase 1 + 2 + 3 |
| `src/types/annotation.ts` | Sửa | Phase 1 |
| `src/services/annotationApi.ts` | Sửa | Phase 2 |
| `src/utils/annotationHelpers.ts` | Mới | Phase 3 (REF-1) |
| `src/hooks/useAnnotations.ts` | Mới | Phase 3 (REF-2) |
| `src/hooks/useAnnotationForm.ts` | Mới | Phase 3 (REF-3) |
| `src/components/features/annotation/AnnotationListItem.tsx` | Mới | Phase 3 (REF-4) |
| `src/components/features/annotation/AnnotationForm.tsx` | Mới | Phase 3 (REF-4) |
| `src/pages/RecordingDetailPage.tsx` | Sửa | Phase 3 (REF-1) |
| `src/utils/annotationHelpers.test.ts` | Mới | Phase 4 |
| `src/hooks/useAnnotationForm.test.ts` | Mới | Phase 4 |

**Ước tính effort:** ~5–6 giờ (Phase 1-2: ~2h, Phase 3: ~2.5h, Phase 4: ~1h)
**Phụ thuộc backend:** Không — chỉ sửa frontend.
**Risk:** Thấp — refactor không thay đổi API contract hay data flow. Từng phase có thể verify độc lập.
