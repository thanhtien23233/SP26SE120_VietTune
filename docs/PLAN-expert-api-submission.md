# PLAN — Chuyển luồng Expert Moderation sang API Submission chính thức

**Phạm vi:** Thay thế luồng claim/unclaim/queue hiện tại (dùng `POST /Admin/submissions/{id}/assign` + local overlay) bằng 3 endpoint Submission mới từ backend.

**Ngày lập:** 2026-04-11

---

## Hiện trạng (AS-IS)

### Endpoint backend đã có (Swagger — chưa được gọi trong FE)

| Endpoint | Method | Params | Mô tả |
|---|---|---|---|
| `/api/Submission/assign-reviewer-submission` | **PUT** | `submissionId` (uuid, query), `reviewerId` (uuid, query) | Nhận bài duyệt — gán reviewer |
| `/api/Submission/unassign-reviewer-submission` | **PUT** | `submissionId` (uuid, query) | Hủy nhận bài — bỏ gán reviewer |
| `/api/Submission/get-by-reviewer` | **GET** | `reviewerId` (uuid, query) | Lấy danh sách bài đã nhận duyệt của reviewer |

### Endpoint backend đã có và đang dùng

| Endpoint | Method | Dùng ở đâu |
|---|---|---|
| `/api/Submission/get-by-status` | GET | `fetchExpertQueueBase()` — lấy queue pending (status=1) |
| `/api/Submission/approve-submission` | PUT | `syncApproveToServer()` → `approveSubmissionOnServer()` |
| `/api/Submission/reject-submission` | PUT | `syncRejectToServer()` → `rejectSubmissionOnServer()` |
| `/api/Admin/submissions/{id}/assign` | POST | `assignSubmissionReviewer()` — **sẽ thay bằng assign-reviewer-submission** |

### Luồng hiện tại trong code

```
Expert click "Nhận duyệt" →
  useSubmissionOverlay.claimSubmission() →
    expertWorkflowService.claimSubmission() →
      [Phase 2] POST /Admin/submissions/{id}/assign (body: { reviewerId })   ← ADMIN endpoint, hay bị 403
      Ghi localStorage overlay (EXPERT_MODERATION_STATE)
      
Expert click "Hủy nhận" →
  expertWorkflowService.unclaimSubmission() →
      [Phase 2] POST /Admin/submissions/{id}/assign (body: { reviewerId: null })
      Xóa overlay

Queue load →
  expertWorkflowService.getQueue() →
      GET /Submission/get-by-status?status=1 (pending only)
      Merge local overlay → hiện thị
```

**Vấn đề chính:**
1. Dùng endpoint **Admin** (`/Admin/submissions/{id}/assign`) cho Expert → 403 Forbidden → phải fallback local overlay → `assignBlockedByRbac`
2. Queue chỉ lấy status=1 (pending) → Expert **không** thấy bài đã nhận (status chuyển khi assign) trừ khi dùng overlay
3. Không có endpoint riêng để lấy "bài tôi đã nhận" → phải dựa vào overlay local
4. Unclaim cũng dùng assign endpoint Admin với `reviewerId: null`

---

## Mục tiêu (TO-BE)

```
Expert click "Nhận duyệt" →
  PUT /Submission/assign-reviewer-submission?submissionId=X&reviewerId=Y
  Server gán reviewer → submission chuyển trạng thái phù hợp
  Reload queue

Expert click "Hủy nhận" →  
  PUT /Submission/unassign-reviewer-submission?submissionId=X
  Server bỏ gán → submission quay lại pending
  Reload queue

Queue load →
  GET /Submission/get-by-status?status=1   (pending — chưa ai nhận)
  + GET /Submission/get-by-reviewer?reviewerId=Y   (bài tôi đã nhận)
  Merge 2 list → hiển thị
  
Approve / Reject → giữ nguyên PUT approve-submission / reject-submission
```

**Lợi ích:**
- Expert dùng endpoint **Submission** (đúng quyền, không cần Admin role)
- Không còn `assignBlockedByRbac` fallback
- Queue hiển thị đầy đủ: pending + bài đã nhận
- Server là nguồn sự thật (source of truth) cho claim state

---

## Implementation Phases

### Phase 1 — API layer: thêm 3 hàm gọi endpoint mới

**File:** `src/services/expertModerationApi.ts`

#### 1A — `assignReviewerSubmission(submissionId, reviewerId)`

```ts
PUT /Submission/assign-reviewer-submission?submissionId=X&reviewerId=Y
```

- Params truyền qua **query string** (theo Swagger)
- Return: `MutationResult` (ok/fail + httpStatus)
- Xử lý lỗi: 400/403/404/500

#### 1B — `unassignReviewerSubmission(submissionId)`

```ts
PUT /Submission/unassign-reviewer-submission?submissionId=X
```

- Return: `MutationResult`

#### 1C — `fetchSubmissionsByReviewer(reviewerId)`

```ts
GET /Submission/get-by-reviewer?reviewerId=Y
```

- Return: `LocalRecording[]` (dùng `extractSubmissionRows` + `mapSubmissionToLocalRecording` giống `getSubmissionsByStatus`)
- Xử lý: 400/404 → `[]`

**File thay đổi:** `src/services/expertModerationApi.ts`

---

### Phase 2 — Service layer: chuyển expertWorkflowService sang endpoint mới

**File:** `src/services/expertWorkflowService.ts`

#### 2A — `claimSubmission()` dùng `assignReviewerSubmission`

Thay:
```ts
// OLD
await assignSubmissionReviewer(submissionId, expertId)  // POST /Admin/submissions/{id}/assign
```

Bằng:
```ts
// NEW
await assignReviewerSubmission(submissionId, expertId)  // PUT /Submission/assign-reviewer-submission
```

- Giữ local overlay cho verification wizard state (step, formData) — server không lưu wizard progress
- Bỏ logic `assignBlockedByRbac` (endpoint mới đúng quyền Expert)
- Nếu server fail → return `{ success: false }` (không fallback overlay)

#### 2B — `unclaimSubmission()` dùng `unassignReviewerSubmission`

Thay:
```ts
// OLD
await assignSubmissionReviewer(submissionId, null)  // POST /Admin/submissions/{id}/assign { reviewerId: null }
```

Bằng:
```ts
// NEW
await unassignReviewerSubmission(submissionId)  // PUT /Submission/unassign-reviewer-submission
```

- Server bỏ gán → submission quay lại pending
- Vẫn clear local overlay (wizard state)

#### 2C — `getQueue()` merge pending + reviewer queue

Thay:
```ts
// OLD — chỉ lấy pending
const baseList = await fetchExpertQueueBase(EXPERT_QUEUE_SOURCE);
```

Bằng:
```ts
// NEW — pending + bài đã nhận
const [pendingList, myClaimedList] = await Promise.all([
  fetchExpertQueueBase(EXPERT_QUEUE_SOURCE),       // GET /Submission/get-by-status?status=1
  fetchSubmissionsByReviewer(expertId),              // GET /Submission/get-by-reviewer?reviewerId=Y
]);
const baseList = deduplicateById([...pendingList, ...myClaimedList]);
```

- `getQueue()` cần nhận `expertId` (hoặc lấy từ context) — hiện không nhận param
- Deduplicate vì 1 bài có thể xuất hiện ở cả 2 list trong edge case
- Bài đã nhận sẽ có `reviewerId` từ server → overlay merge vẫn hoạt động

#### 2D — Cleanup: loại bỏ `assignBlockedByRbac`

- Xóa field `assignBlockedByRbac` khỏi `LocalModerationState`
- Xóa logic check `assignBlockedByRbac` trong `claimSubmission`, `unclaimSubmission`
- Xóa reference trong `ModerationPage.tsx`, `ModerationSubmissionDetailPanels.tsx`

**File thay đổi:**
- `src/services/expertWorkflowService.ts`
- `src/services/expertModerationApi.ts` (import mới)

---

### Phase 3 — Hook & Page layer: truyền expertId xuống queue

**File:** `src/features/moderation/hooks/useExpertQueue.ts`, `src/pages/ModerationPage.tsx`

#### 3A — `useExpertQueue` truyền userId cho getQueue

`getQueue()` hiện không nhận param. Cần thêm param `expertId` để gọi `get-by-reviewer`:

```ts
// useExpertQueue.ts
const all = await expertWorkflowService.getQueue(userId);
```

```ts
// expertWorkflowService.ts
async getQueue(expertId?: string): Promise<LocalRecording[]> { ... }
```

#### 3B — ModerationPage: hiển thị badge "Đã nhận" trên bài claimed

- Bài có `reviewerId === currentUserId` (từ server) → hiện badge trạng thái "Đang duyệt" trong queue sidebar
- Phân biệt rõ: pending (chưa ai nhận) vs claimed by me (đã nhận)

#### 3C — Xử lý edge case: bài bị Expert khác nhận

- Khi claim fail (409 conflict hoặc 400 đã có reviewer khác) → toast "Bài này đã được chuyên gia khác nhận"
- Reload queue để cập nhật

**File thay đổi:**
- `src/features/moderation/hooks/useExpertQueue.ts`
- `src/pages/ModerationPage.tsx`
- `src/services/expertWorkflowService.ts`

---

### Phase 4 — Cleanup: giảm phụ thuộc vào local overlay

**Mục tiêu:** Overlay chỉ còn dùng cho wizard state (verification step + form data), không cho claim/status.

#### 4A — Server là nguồn sự thật cho claim state

Sau khi claim/unclaim thành công trên server → `load()` refresh từ API:
- `get-by-status` trả bài pending (không có reviewer)
- `get-by-reviewer` trả bài đã gán reviewer
- Overlay chỉ thêm: `verificationStep`, `verificationData`, draft notes

#### 4B — Giữ overlay cho wizard progress

Wizard 3 bước (step 1/2/3 + form checkboxes) vẫn cần local storage vì server không lưu wizard state.
- `updateVerificationStep()` → vẫn dùng overlay
- `verificationForms` → vẫn local state

#### 4C — Bỏ `POST /Admin/submissions/{id}/assign`

- Xóa import `assignSubmissionReviewer` khỏi `expertWorkflowService.ts`
- Nếu không còn chỗ nào dùng → xóa hàm trong `expertModerationApi.ts`
- Giữ lại nếu Admin dashboard còn dùng

**File thay đổi:**
- `src/services/expertWorkflowService.ts`
- `src/services/expertModerationApi.ts`

---

### Phase X — Kiểm tra & Xác minh

#### Checklist tự động

```bash
npm run lint          # 0 errors/warnings
npm run build         # 0 TypeScript errors
```

#### Checklist thủ công

**Assign (Nhận bài duyệt):**
- [ ] Click "Nhận kiểm duyệt" → gọi `PUT /Submission/assign-reviewer-submission` (check Network tab)
- [ ] Server trả 200 → bài chuyển sang "Đang duyệt", wizard mở
- [ ] Reload page → bài vẫn hiện trong queue (từ `get-by-reviewer`)
- [ ] Bài đã được Expert khác nhận → toast lỗi, không mở wizard

**Unassign (Hủy nhận):**
- [ ] Click "Hủy nhận" → xác nhận → gọi `PUT /Submission/unassign-reviewer-submission`
- [ ] Server trả 200 → bài quay lại pending, wizard đóng
- [ ] Reload page → bài hiện lại trong pending queue

**Queue (Danh sách):**
- [ ] Queue hiện đủ: pending + bài đã nhận
- [ ] Bài đã nhận có badge "Đang duyệt"
- [ ] Filter theo status hoạt động đúng
- [ ] Sort newest/oldest hoạt động đúng

**Approve / Reject (giữ nguyên):**
- [ ] Approve → `PUT /Submission/approve-submission` vẫn gọi đúng
- [ ] Reject → `PUT /Submission/reject-submission` vẫn gọi đúng
- [ ] Notes ghi chú lưu đúng

**Regression:**
- [ ] Verification wizard 3 bước vẫn hoạt động
- [ ] Expert notes draft lưu/load đúng
- [ ] Delete bản thu vẫn hoạt động
- [ ] Body scroll lock / Escape key vẫn đúng

---

## Tóm tắt file thay đổi

| File | Loại | Phase |
|---|---|---|
| `src/services/expertModerationApi.ts` | Modify | Phase 1, 4 |
| `src/services/expertWorkflowService.ts` | Modify | Phase 2, 3, 4 |
| `src/features/moderation/hooks/useExpertQueue.ts` | Modify | Phase 3 |
| `src/pages/ModerationPage.tsx` | Modify | Phase 3 |

## Phụ thuộc mới

Không cần cài thêm package.

## API Contract tóm tắt

```
# Nhận bài duyệt
PUT /api/Submission/assign-reviewer-submission?submissionId={uuid}&reviewerId={uuid}
→ 200 OK

# Hủy nhận bài
PUT /api/Submission/unassign-reviewer-submission?submissionId={uuid}
→ 200 OK

# Danh sách bài đã nhận
GET /api/Submission/get-by-reviewer?reviewerId={uuid}
→ 200 OK (SubmissionDto[])

# Duyệt (giữ nguyên)
PUT /api/Submission/approve-submission?submissionId={uuid}

# Từ chối (giữ nguyên)
PUT /api/Submission/reject-submission?submissionId={uuid}

# Hàng đợi pending (giữ nguyên)  
GET /api/Submission/get-by-status?status=1&page=1&pageSize=200
```

## Effort ước tính

| Phase | Ước tính |
|---|---|
| Phase 1 (API layer: 3 hàm mới) | 20 phút |
| Phase 2 (Service layer: chuyển sang endpoint mới) | 45 phút |
| Phase 3 (Hook + Page: truyền expertId, badge, edge case) | 40 phút |
| Phase 4 (Cleanup: giảm overlay, xóa Admin assign) | 20 phút |
| Phase X (Verify) | 20 phút |
| **Tổng** | **~2 giờ 25 phút** |

## Rủi ro & Lưu ý

| Rủi ro | Giải pháp |
|---|---|
| Response format của `get-by-reviewer` khác `get-by-status` | Test response thực tế, dùng `extractSubmissionRows` generic |
| Server chưa xử lý concurrent assign (2 expert nhận cùng lúc) | Handle 400/409 conflict → toast lỗi + reload |
| `assignBlockedByRbac` đang hiện cảnh báo ở UI | Phase 4 xóa toàn bộ reference |
| Wizard state chỉ local → mất khi clear browser | Chấp nhận Phase 1; Phase 2 có thể persist server nếu BE hỗ trợ |
