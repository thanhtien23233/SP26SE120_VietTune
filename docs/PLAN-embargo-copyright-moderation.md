# PLAN: §E+§H — Embargo / Copyright Moderation Workflow

**Slug:** `embargo-copyright-moderation`
**Ngày tạo:** 2026-04-10
**Tham chiếu:** `PLAN-feature-gaps.md §E, §H`
**Phạm vi:** Frontend only — API đã deploy đầy đủ trên BE.

---

## Context Check (Phase -1)

### Thay đổi lớn so với plan cũ

`PLAN-feature-gaps.md §E` và `§H` đều ghi **"⚠️ Phụ thuộc backend — cần API mới"**.
Tuy nhiên **BE đã deploy xong tất cả endpoint** cần thiết:

| Domain | Endpoints deployed | DTOs |
|--------|-------------------|------|
| Embargo | `GET/PUT /api/Embargo/recording/{recordingId}`, `POST .../lift`, `GET /api/Embargo` (paged) | `EmbargoDto`, `EmbargoCreateUpdateDto`, `EmbargoLiftDto`, `EmbargoStatus` enum (1..5) |
| Copyright Dispute | `POST /api/CopyrightDispute`, `GET` (paged), `GET /{disputeId}`, `POST .../assign`, `POST .../resolve`, `POST .../evidence` (multipart) | `CreateCopyrightDisputeRequest`, `AssignReviewerRequest`, `ResolveDisputeRequest`, `CopyrightDisputeStatus` enum (0..4) |

→ **Không còn phụ thuộc backend.** FE có thể triển khai hoàn chỉnh.

### Hiện trạng FE (từ audit)

| Khu vực | Có | Thiếu |
|---------|-----|-------|
| Upload form | `copyright` text field trong `UploadMusic.tsx` | Embargo date fields |
| ModerationPage | 4 tabs (review/ai/knowledge/annotation), verification wizard 3 steps | Dispute tab, sensitive content flag |
| AdminDashboard moderation tab | Intro text nhắc "tranh chấp bản quyền", delete/edit request panels | Embargo list, dispute list |
| RecordingDetailPage | Recording info, annotations | Embargo badge, dispute status |
| Types | `ModerationStatus`, `VerificationStatus` | Embargo/Dispute types |
| Services | Không có `embargoApi` hoặc `copyrightDisputeApi` | Cần tạo mới |

### Enum mapping (cần BE xác nhận — dùng giả định hợp lý)

```
EmbargoStatus (int):     1=None, 2=Scheduled, 3=Active, 4=Expired, 5=Lifted
CopyrightDisputeStatus:  0=Open, 1=UnderReview, 2=ResolvedKeep, 3=ResolvedRemove, 4=Rejected
```

> FE sẽ dùng label map; nếu BE trả giá trị ngoài phạm vi → fallback "Không xác định".

---

## Phase 0 — Socratic Gate (Chốt thiết kế)

| Câu hỏi | Chốt |
|---------|------|
| Gộp §E+§H thành 1 plan? | **Có** — cùng domain, cùng trang, shared types |
| Embargo UI ở đâu? | **ModerationPage** (expert/admin set embargo) + **RecordingDetailPage** (public badge) + **AdminDashboard** (list) |
| Dispute UI ở đâu? | **AdminDashboard moderation tab** (admin list + manage) + **RecordingDetailPage** (report button) |
| Evidence upload? | Dùng `POST /CopyrightDispute/{id}/evidence` multipart — FE file picker |
| Sensitive content flag? | Thêm checkbox vào **verification wizard step 3** |

---

## Thiết kế tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│ ModerationPage (expert)                                             │
│ ┌─ Tab: review ─┐ ┌─ ai ─┐ ┌─ knowledge ─┐ ┌─ annotation ─┐      │
│ │               │ │      │ │             │ │              │        │
│ └───────────────┘ └──────┘ └─────────────┘ └──────────────┘        │
│                                                                     │
│ Trong detail panel của review tab:                                  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ EmbargoSection (nếu recording đang được review)                 │ │
│ │ ┌──────────┐ ┌──────────┐ ┌───────────┐                       │ │
│ │ │ Start    │ │ End      │ │ Reason    │  [Set Embargo] [Lift]  │ │
│ │ └──────────┘ └──────────┘ └───────────┘                       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Verification Wizard Step 3:                                         │
│ ☑ Cross-checked  ☑ Sources verified  ☑ Final approval               │
│ ☑ Nội dung nhạy cảm (NEW)                                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AdminDashboard → tab moderation                                     │
│                                                                     │
│ [Existing] Yêu cầu bản thu | Xóa tài khoản CG                     │
│ [NEW] ┌─────────────────────────────────────────────────┐           │
│       │ Embargo List (EmbargoListPanel)                  │           │
│       │ ┌────────┬────────┬────────┬────────┬────────┐  │           │
│       │ │Recording│Status │Start   │End     │Actions │  │           │
│       │ │ Bài A  │Active │04/20   │06/20   │[Lift]  │  │           │
│       │ └────────┴────────┴────────┴────────┴────────┘  │           │
│       └─────────────────────────────────────────────────┘           │
│ [NEW] ┌─────────────────────────────────────────────────┐           │
│       │ Dispute List (DisputeListPanel)                  │           │
│       │ ┌────────┬────────┬────────┬────────┬────────┐  │           │
│       │ │Recording│Status │Reporter│Assigned│Actions │  │           │
│       │ │ Bài B  │Open   │UserX   │—       │[Assign]│  │           │
│       │ └────────┴────────┴────────┴────────┴────────┘  │           │
│       │ → Click row → detail: timeline, resolve, evidence│          │
│       └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ RecordingDetailPage (public)                                        │
│                                                                     │
│ [Embargo badge] ⚠ Bản ghi đang trong thời hạn hạn chế công bố     │
│ [Dispute badge] ⚠ Bản ghi đang bị tranh chấp bản quyền            │
│ [Report button] Báo cáo vi phạm bản quyền → form → POST dispute   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Types + Service Layer

### 1.1 Tạo `src/types/embargo.ts`

```typescript
export const EMBARGO_STATUS_LABELS: Record<number, string> = {
  1: 'Không có',
  2: 'Đã lên lịch',
  3: 'Đang áp dụng',
  4: 'Đã hết hạn',
  5: 'Đã gỡ bỏ',
};

export interface EmbargoDto {
  recordingId: string;
  status: number;
  embargoStartDate: string | null;
  embargoEndDate: string | null;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface EmbargoCreateUpdateDto {
  embargoStartDate: string | null;
  embargoEndDate: string | null;
  reason: string | null;
}

export interface EmbargoLiftDto {
  reason: string | null;
}
```

### 1.2 Tạo `src/types/copyrightDispute.ts`

```typescript
export const DISPUTE_STATUS_LABELS: Record<number, string> = {
  0: 'Mở',
  1: 'Đang xem xét',
  2: 'Giữ lại bản ghi',
  3: 'Gỡ bản ghi',
  4: 'Từ chối báo cáo',
};

export interface CopyrightDisputeDto {
  disputeId: string;
  recordingId: string;
  submissionId: string | null;
  reportedByUserId: string;
  reasonCode: string | null;
  description: string | null;
  evidenceUrls: string[] | null;
  status: number;
  assignedReviewerId: string | null;
  resolution: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCopyrightDisputeRequest {
  recordingId: string;
  submissionId?: string | null;
  reportedByUserId: string;
  reasonCode?: string | null;
  description?: string | null;
  evidenceUrls?: string[] | null;
}

export interface ResolveDisputeRequest {
  resolution: string | null;
  resolutionNotes: string | null;
  notifyContributor: boolean;
}
```

### 1.3 Tạo `src/services/embargoApi.ts`

```
embargoApi.getByRecordingId(recordingId) → GET /api/Embargo/recording/{recordingId}
embargoApi.createOrUpdate(recordingId, dto) → PUT /api/Embargo/recording/{recordingId}
embargoApi.lift(recordingId, dto) → POST /api/Embargo/recording/{recordingId}/lift
embargoApi.list(params) → GET /api/Embargo?status=&page=&pageSize=&from=&to=
```

### 1.4 Tạo `src/services/copyrightDisputeApi.ts`

```
disputeApi.create(dto) → POST /api/CopyrightDispute
disputeApi.list(params) → GET /api/CopyrightDispute?status=&page=&pageSize=
disputeApi.getById(disputeId) → GET /api/CopyrightDispute/{disputeId}
disputeApi.assign(disputeId, reviewerId) → POST /api/CopyrightDispute/{disputeId}/assign
disputeApi.resolve(disputeId, dto) → POST /api/CopyrightDispute/{disputeId}/resolve
disputeApi.uploadEvidence(disputeId, file) → POST /api/CopyrightDispute/{disputeId}/evidence
```

### 1.5 Export types

Thêm vào `src/types/index.ts`:
```typescript
export * from '@/types/embargo';
export * from '@/types/copyrightDispute';
```

### Files thay đổi Phase 1:
| File | Loại |
|------|------|
| `src/types/embargo.ts` | **Mới** |
| `src/types/copyrightDispute.ts` | **Mới** |
| `src/services/embargoApi.ts` | **Mới** |
| `src/services/copyrightDisputeApi.ts` | **Mới** |
| `src/types/index.ts` | Sửa |

---

## Phase 2 — Embargo UI Components

### 2.1 Tạo `src/components/features/moderation/EmbargoSection.tsx`

**Props:** `recordingId: string`, `canEdit: boolean`
**Logic:**
- Load embargo via `embargoApi.getByRecordingId(recordingId)`
- Display current status badge + date range
- If `canEdit`:
  - Form: `embargoStartDate`, `embargoEndDate`, `reason` → `embargoApi.createOrUpdate()`
  - If status = Active/Scheduled → button "Gỡ hạn chế" → `embargoApi.lift()`
- Loading/error/empty states

### 2.2 Tạo `src/components/features/moderation/EmbargoListPanel.tsx`

**Props:** `className?: string`
**Logic:**
- Load `embargoApi.list({ page, pageSize })` with status filter dropdown
- Table: Recording ID (hoặc title nếu có), Status badge, Start date, End date, Actions (Lift)
- Pagination

### 2.3 Tích hợp RecordingDetailPage

- Fetch embargo status khi load recording
- Nếu `status === 3` (Active) → hiển thị banner warning: "Bản ghi đang trong thời hạn hạn chế công bố"

### Files thay đổi Phase 2:
| File | Loại |
|------|------|
| `src/components/features/moderation/EmbargoSection.tsx` | **Mới** |
| `src/components/features/moderation/EmbargoListPanel.tsx` | **Mới** |
| `src/pages/RecordingDetailPage.tsx` | Sửa |

---

## Phase 3 — Copyright Dispute UI Components

### 3.1 Tạo `src/components/features/moderation/DisputeReportForm.tsx`

**Props:** `recordingId: string`, `userId: string`, `onSuccess: () => void`
**Logic:**
- Form: `reasonCode` (dropdown: ownership/unauthorized_use/plagiarism/other), `description` (textarea), `evidenceUrls` (multi-input)
- Submit → `disputeApi.create(dto)`

### 3.2 Tạo `src/components/features/moderation/DisputeListPanel.tsx`

**Props:** `className?: string`
**Logic:**
- Load `disputeApi.list({ page, pageSize, status })` with status filter dropdown
- Table: Recording, Status badge, Reporter, Assigned reviewer, Created date, Actions
- Click row → expand/detail view:
  - Timeline (created → assigned → resolved)
  - Evidence URLs list
  - Assign reviewer form (`disputeApi.assign()`)
  - Resolve form (`disputeApi.resolve()`) — dropdown resolution + notes + notifyContributor checkbox

### 3.3 Tạo `src/components/features/moderation/DisputeEvidenceUpload.tsx`

**Props:** `disputeId: string`, `onSuccess: () => void`
**Logic:**
- File input → `disputeApi.uploadEvidence(disputeId, file)` (multipart/form-data)

### 3.4 Tích hợp RecordingDetailPage

- Fetch disputes via `disputeApi.list({ recordingId })` (nếu API hỗ trợ filter)
- Nếu có dispute open → badge "Bản ghi đang bị tranh chấp bản quyền"
- Button "Báo cáo vi phạm bản quyền" → modal `DisputeReportForm`

### Files thay đổi Phase 3:
| File | Loại |
|------|------|
| `src/components/features/moderation/DisputeReportForm.tsx` | **Mới** |
| `src/components/features/moderation/DisputeListPanel.tsx` | **Mới** |
| `src/components/features/moderation/DisputeEvidenceUpload.tsx` | **Mới** |
| `src/pages/RecordingDetailPage.tsx` | Sửa |

---

## Phase 4 — Tích hợp ModerationPage + AdminDashboard

### 4.1 ModerationPage — detail panel

- Trong panel review chi tiết (khi expert chọn 1 recording):
  - Mount `<EmbargoSection recordingId={...} canEdit={isExpertOrAdmin} />`
  - Hiển thị dưới recording info, trên verification wizard

### 4.2 ModerationPage — Verification Wizard

- Step 3 thêm checkbox: `sensitiveContent: boolean`
- Label: "Nội dung nhạy cảm — đề xuất hạn chế công bố"
- Lưu vào `ModerationVerificationData.step3.sensitiveContent`

### 4.3 AdminDashboard moderation tab

- Thêm 2 toggle buttons bên cạnh existing "Yêu cầu bản thu" / "Xóa tài khoản CG":
  - "Hạn chế công bố" → mount `<EmbargoListPanel />`
  - "Tranh chấp bản quyền" → mount `<DisputeListPanel />`

### Files thay đổi Phase 4:
| File | Loại |
|------|------|
| `src/pages/ModerationPage.tsx` | Sửa |
| `src/services/expertWorkflowService.ts` | Sửa (thêm `sensitiveContent` field) |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | Sửa |
| `src/pages/admin/AdminDashboard.tsx` | Sửa |

---

## Phase X — Verification Checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npm run lint` passes | Auto |
| 2 | `npm run build` passes | Auto |
| 3 | `npm run test:unit` passes | Auto |
| 4 | `embargoApi.getByRecordingId()` trả về đúng shape (Network tab) | Manual |
| 5 | EmbargoSection hiển thị status + date range, form create/lift hoạt động | Manual |
| 6 | EmbargoListPanel hiển thị danh sách, filter status, pagination | Manual |
| 7 | RecordingDetailPage hiển thị embargo badge khi active | Manual |
| 8 | DisputeReportForm submit thành công qua API | Manual |
| 9 | DisputeListPanel hiển thị danh sách, filter status, expand detail | Manual |
| 10 | Assign reviewer flow hoạt động | Manual |
| 11 | Resolve dispute flow hoạt động | Manual |
| 12 | Evidence upload (multipart) hoạt động | Manual |
| 13 | RecordingDetailPage hiển thị dispute badge + report button | Manual |
| 14 | Verification wizard step 3 có checkbox "Nội dung nhạy cảm" | Manual |
| 15 | AdminDashboard moderation tab hiển thị Embargo + Dispute panels | Manual |
| 16 | Không regression trên các tab/panel moderation hiện tại | Manual |

### Kết quả verify tự động (Phase X) — 2026-04-10

- ✅ `npm run lint` **PASS**
  - Có 2 cảnh báo `import/order` ở vòng chạy đầu (`DisputeListPanel.tsx`, `RecordingDetailPage.tsx`), đã fix và chạy lại thành công.
- ✅ `npm run build` **PASS**
  - `tsc && vite build` thành công, bundle được tạo đầy đủ.
- ✅ `npm run test:unit` **PASS**
  - `12` test files pass, `38` tests pass.

### Trạng thái checklist manual

- ✅ Đã implement theo code cho:
  - `#14` (wizard step 3 có `sensitiveContent`)
  - `#15` (AdminDashboard moderation tab có `EmbargoListPanel` + `DisputeListPanel`)
- ⏳ Cần QA runtime/manual end-to-end cho các mục còn lại `#4` → `#13` và `#16`.

---

## File Delivery Summary

| File | Loại | Phase |
|------|------|-------|
| `src/types/embargo.ts` | **Mới** | Phase 1 |
| `src/types/copyrightDispute.ts` | **Mới** | Phase 1 |
| `src/services/embargoApi.ts` | **Mới** | Phase 1 |
| `src/services/copyrightDisputeApi.ts` | **Mới** | Phase 1 |
| `src/types/index.ts` | Sửa | Phase 1 |
| `src/components/features/moderation/EmbargoSection.tsx` | **Mới** | Phase 2 |
| `src/components/features/moderation/EmbargoListPanel.tsx` | **Mới** | Phase 2 |
| `src/pages/RecordingDetailPage.tsx` | Sửa | Phase 2+3 |
| `src/components/features/moderation/DisputeReportForm.tsx` | **Mới** | Phase 3 |
| `src/components/features/moderation/DisputeListPanel.tsx` | **Mới** | Phase 3 |
| `src/components/features/moderation/DisputeEvidenceUpload.tsx` | **Mới** | Phase 3 |
| `src/pages/ModerationPage.tsx` | Sửa | Phase 4 |
| `src/services/expertWorkflowService.ts` | Sửa | Phase 4 |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | Sửa | Phase 4 |
| `src/pages/admin/AdminDashboard.tsx` | Sửa | Phase 4 |

**Ước tính effort:** ~6–8 giờ
**Phụ thuộc backend:** ✅ API đã deploy đầy đủ
**Lưu ý:** Enum mapping (`EmbargoStatus` 1..5, `CopyrightDisputeStatus` 0..4) dùng giả định hợp lý; nếu BE cung cấp mapping chính thức, chỉ cần cập nhật label maps trong types.
