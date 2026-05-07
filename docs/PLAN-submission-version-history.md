# PLAN: §K — Submission Version History UI

**Slug:** `submission-version-history`
**Ngày tạo:** 2026-04-10
**Tham chiếu:** `PLAN-feature-gaps.md §K`
**Phạm vi:** Frontend only — API đã deploy đầy đủ trên BE.

---

## Context Check (Phase -1)

### Swagger API đã deploy

| Method | Endpoint | Notes |
|--------|----------|-------|
| `GET` | `/api/SubmissionVersion` | Paged list toàn bộ |
| `POST` | `/api/SubmissionVersion` | Tạo version mới |
| `GET` | `/api/SubmissionVersion/{id}` | Chi tiết một version |
| `PUT` | `/api/SubmissionVersion/{id}` | Cập nhật version |
| `DELETE` | `/api/SubmissionVersion/{id}` | Xóa version |
| `GET` | `/api/SubmissionVersion/submission/{submissionId}` | List by submission (paged) |
| `GET` | `/api/SubmissionVersion/submission/{submissionId}/latest` | Version mới nhất |
| `DELETE` | `/api/SubmissionVersion/submission/{submissionId}/all` | Xóa tất cả versions |

**DTO** (`SubmissionVersionDto`):
```
{
  id: uuid,
  submissionId: uuid,
  versionNumber: int,
  changesJson: string | null,
  createdAt: datetime
}
```

**Create DTO** (`CreateSubmissionVersionDto`):
```
{
  submissionId: uuid,
  changesJson: string | null
}
```

### Hiện trạng FE (từ audit)

| Khu vực | Có | Thiếu |
|---------|-----|-------|
| Types | — | `SubmissionVersionDto`, `CreateSubmissionVersionDto` |
| Service | — | `submissionVersionApi.ts` |
| UI component | `KBRevisionHistory.tsx` (có thể dùng làm pattern tham chiếu) | `SubmissionVersionTimeline.tsx` |
| ContributionsPage | Submission list + detail modal | Version history tab/panel |
| ModerationPage | review tab + annotation tab | Version history sub-panel |
| EditRecordingPage | GPS + UploadMusic | Tạo version tự động khi save |

### Model `changesJson`

BE lưu `changesJson` là **JSON string** tự do. FE không có schema cố định từ Swagger.
Cần thỏa thuận format hoặc xử lý fallback:

```json
// Suggested format (FE-friendly):
{
  "fields": [
    { "field": "title", "before": "Cũ", "after": "Mới" },
    { "field": "description", "before": "...", "after": "..." }
  ],
  "note": "Contributor edited metadata"
}
```

FE sẽ parse `changesJson`, nếu hợp lệ JSON thì render diff table, nếu không thì hiển thị raw string.

---

## Phase 0 — Socratic Gate (Chốt thiết kế)

| Câu hỏi | Chốt |
|---------|------|
| Dùng tab hay panel? | **Panel collapsible** bên dưới detail trong ContributionsPage + ModerationPage |
| Ai thấy version history? | **Contributor:** xem history submission của mình. **Expert/Admin:** xem history khi review. |
| Auto-create version khi nào? | Khi contributor submit bản edit (sau `requestEditSubmission` + save) → `POST /SubmissionVersion` |
| Diff display? | Parse `changesJson`, fallback raw string nếu không phải JSON chuẩn |
| Delete version? | Chỉ Admin — không expose cho Contributor |
| Reuse pattern từ KB? | **Có** — `KBRevisionHistory` là pattern tốt (list → click → detail modal) |

---

## Thiết kế tổng thể

```
┌────────────────────────────────────────────────────────────────┐
│ ContributionsPage — Detail modal                               │
│                                                                │
│ [Thông tin đóng góp] [Metadata] [Player]                       │
│ ┌────────────────────────────────────────────┐                 │
│ │ Lịch sử phiên bản (NEW — collapsible)      │                 │
│ │ ▸ v3 · 10/04/2026 13:00 — "Sửa metadata"  │                 │
│ │ ▸ v2 · 09/04/2026 09:22 — "Upload lại"    │                 │
│ │ ▸ v1 · 08/04/2026 11:00 — "Tạo ban đầu"  │                 │
│ └────────────────────────────────────────────┘                 │
│                                                                │
│ → Click version → modal diff:                                  │
│   ┌───────────────────────────────────────┐                    │
│   │ Field     │ Trước        │ Sau        │                    │
│   │ title     │ "Bài cũ"    │ "Bài mới"  │                    │
│   │ desc      │ "..."        │ "..."      │                    │
│   └───────────────────────────────────────┘                    │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ ModerationPage — review tab right panel                        │
│                                                                │
│ [ModerationSubmissionDetailPanels]                             │
│ [EmbargoSection]                                               │
│ ┌────────────────────────────────────────────┐                 │
│ │ Lịch sử phiên bản (NEW — read-only)        │                 │
│ │ Expert có thể xem nhưng không sửa/xóa     │                 │
│ └────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ EditRecordingPage — auto-create version on save                │
│                                                                │
│ [GPS panel] [UploadMusic embedded]                             │
│ ↓ on save success → POST /SubmissionVersion with changesJson   │
└────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Types + Service Layer

### 1.1 Tạo `src/types/submissionVersion.ts`

```typescript
export interface SubmissionVersionDto {
  id: string;
  submissionId: string;
  versionNumber: number;
  changesJson: string | null;
  createdAt: string;
}

export interface CreateSubmissionVersionDto {
  submissionId: string;
  changesJson?: string | null;
}

export interface SubmissionVersionChange {
  field: string;
  before?: string | null;
  after?: string | null;
}

export interface SubmissionVersionChangeset {
  fields?: SubmissionVersionChange[];
  note?: string | null;
}

export interface SubmissionVersionPagedResult {
  items: SubmissionVersionDto[];
  page: number;
  pageSize: number;
  total: number;
}
```

**Utility:** `parseChangesJson(raw: string | null): SubmissionVersionChangeset | null`
- Thử `JSON.parse(raw)`, kiểm tra shape, trả về object hoặc `null`.

### 1.2 Tạo `src/services/submissionVersionApi.ts`

```
submissionVersionApi.listBySubmission(submissionId, page, pageSize)
  → GET /api/SubmissionVersion/submission/{submissionId}

submissionVersionApi.getLatest(submissionId)
  → GET /api/SubmissionVersion/submission/{submissionId}/latest

submissionVersionApi.getById(id)
  → GET /api/SubmissionVersion/{id}

submissionVersionApi.create(dto: CreateSubmissionVersionDto)
  → POST /api/SubmissionVersion

submissionVersionApi.delete(id)
  → DELETE /api/SubmissionVersion/{id}

submissionVersionApi.deleteAll(submissionId)
  → DELETE /api/SubmissionVersion/submission/{submissionId}/all
```

### 1.3 Export types

Thêm vào `src/types/index.ts`:
```typescript
export * from '@/types/submissionVersion';
```

### Files thay đổi Phase 1:
| File | Loại |
|------|------|
| `src/types/submissionVersion.ts` | **Mới** |
| `src/services/submissionVersionApi.ts` | **Mới** |
| `src/types/index.ts` | Sửa |

---

## Phase 2 — SubmissionVersionTimeline Component

### 2.1 Tạo `src/components/features/submission/SubmissionVersionTimeline.tsx`

**Props:**
```typescript
interface SubmissionVersionTimelineProps {
  submissionId: string;
  canDelete?: boolean; // default false
  className?: string;
}
```

**Logic:**
- Load via `submissionVersionApi.listBySubmission(submissionId, page, pageSize)`
- Display: list item = `v{versionNumber} · {createdAt formatted} · ghi chú` (parse từ `changesJson.note`)
- Click row → `getById(id)` → detail modal
- Detail modal: parse `changesJson`:
  - Nếu có `fields[]` → render bảng diff (`Field | Trước | Sau`)
  - Nếu không → hiển thị raw `changesJson` string trong `<pre>`
- Nếu `canDelete` → nút xóa từng version (confirm dialog) → `delete(id)` → reload
- Refresh button
- Loading/error/empty states

**Pattern tham chiếu:** `src/components/features/kb/KBRevisionHistory.tsx`

### Files thay đổi Phase 2:
| File | Loại |
|------|------|
| `src/components/features/submission/SubmissionVersionTimeline.tsx` | **Mới** |

---

## Phase 3 — Tích hợp ContributionsPage

### 3.1 ContributionsPage — detail modal

- Thêm section "Lịch sử phiên bản" (collapsible bằng `<details>` hoặc toggle state) **bên dưới** player block trong detail modal.
- Mount `<SubmissionVersionTimeline submissionId={selectedSubmission.id} canDelete={false} />`
- Contributor chỉ xem, không xóa.

### Files thay đổi Phase 3:
| File | Loại |
|------|------|
| `src/pages/ContributionsPage.tsx` | Sửa |

---

## Phase 4 — Tích hợp ModerationPage

### 4.1 ModerationPage — review tab

- Thêm `SubmissionVersionTimeline` vào bottom của detail right-panel (dưới `EmbargoSection`).
- Expert/Admin xem được, không xóa (`canDelete={false}`).
- Read-only: không show delete button dù là Admin (bảo toàn audit trail).

### Files thay đổi Phase 4:
| File | Loại |
|------|------|
| `src/pages/ModerationPage.tsx` | Sửa |

---

## Phase 5 — Auto-create version trong EditRecordingPage

### 5.1 Xác định trigger

Khi contributor save thành công trong `EditRecordingPage` (upload/edit complete) → tạo version:

```typescript
const changesJson = JSON.stringify({
  note: `Contributor edited submission at ${new Date().toISOString()}`,
  // Optionally diff key fields if available
});
await submissionVersionApi.create({ submissionId, changesJson });
```

**Lưu ý quan trọng:**
- Version creation là **best-effort** — nếu fail thì log warning, KHÔNG block save.
- Không interrupt UX nếu version create thất bại.

### 5.2 `submissionId` trong EditRecordingPage

**Đã xác nhận:** Route param `id` trong `EditRecordingPage` **là `submissionId`** → dùng trực tiếp, không cần lookup thêm.

### Files thay đổi Phase 5:
| File | Loại |
|------|------|
| `src/components/features/UploadMusic.tsx` | Sửa |

---

## Phase X — Verification Checklist

### Kết quả automated checks (2026-04-10)

- ✅ `npm run lint` — PASS
- ✅ `npm run build` — PASS
- ✅ `npm run test:unit` — PASS (12 files, 38 tests)

### Trạng thái checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npm run lint` passes | Auto ✅ |
| 2 | `npm run build` passes | Auto ✅ |
| 3 | `npm run test:unit` passes | Auto ✅ |
| 4 | `submissionVersionApi.listBySubmission()` trả về đúng shape (Network tab) | Manual |
| 5 | `SubmissionVersionTimeline` hiển thị list versions, load/empty/error states | Manual |
| 6 | Click version → detail modal hiển thị diff table (khi changesJson có fields[]) | Manual |
| 7 | Click version → fallback raw string khi changesJson không phải JSON chuẩn | Manual |
| 8 | Refresh button reloads list | Manual |
| 9 | ContributionsPage detail modal hiển thị version timeline | Manual |
| 10 | ModerationPage review panel hiển thị version timeline | Manual |
| 11 | EditRecordingPage auto-create version khi save thành công | Manual |
| 12 | Auto-create failure không block UX (only console.warn) | Manual |
| 13 | Không regression: ContributionsPage detail modal, ModerationPage review tab | Manual |

---

## File Delivery Summary

| File | Loại | Phase |
|------|------|-------|
| `src/types/submissionVersion.ts` | **Mới** | Phase 1 |
| `src/services/submissionVersionApi.ts` | **Mới** | Phase 1 |
| `src/types/index.ts` | Sửa | Phase 1 |
| `src/components/features/submission/SubmissionVersionTimeline.tsx` | **Mới** | Phase 2 |
| `src/pages/ContributionsPage.tsx` | Sửa | Phase 3 |
| `src/pages/ModerationPage.tsx` | Sửa | Phase 4 |
| `src/components/features/UploadMusic.tsx` | Sửa | Phase 5 |

**Ước tính effort:** ~4–5 giờ  
**Phụ thuộc backend:** ✅ API đã deploy đầy đủ  
**Pattern tham chiếu:** `src/components/features/kb/KBRevisionHistory.tsx`  
**Rủi ro duy nhất:** `changesJson` schema không có contract cố định từ Swagger → cần thỏa thuận format với BE hoặc dùng fallback raw string.
