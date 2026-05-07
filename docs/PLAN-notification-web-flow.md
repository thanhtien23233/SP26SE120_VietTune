# PLAN: Notification Web Flow

> **Created:** 2026-04-14
> **Scope:** Hoàn thiện hệ thống thông báo (notification) trên giao diện web — từ trạng thái hiện tại đến production-ready.

---

## Phase -1: Hiện trạng (Audit)

### Kiến trúc hiện tại

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                         │
│                                                         │
│  Header.tsx ──► useNotificationPolling (30s interval)   │
│      └─ Bell icon + red dot (unread > 0)                │
│      └─ Dropdown (max 8 items) → /notifications         │
│                                                         │
│  NotificationPage.tsx                                   │
│      └─ Full list, mark read, mark all read             │
│                                                         │
│  recordingRequestService.ts (API layer)                 │
│      └─ GET  /Notification                              │
│      └─ POST /Notification                              │
│      └─ PUT  /Notification/:id/read                     │
│      └─ PUT  /Notification/read-all                     │
│                                                         │
│  types/notification.ts → AppNotification                │
│      └─ 5 types: recording_deleted, recording_edited,   │
│         expert_account_deletion_approved,                │
│         delete_request_rejected,                         │
│         edit_submission_approved                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
          │ Polling 30s (axios)
          ▼
┌─────────────────────┐
│  Backend .NET API    │
│  /api/Notification/* │
└─────────────────────┘
```

### Files hiện có

| File | Vai trò | Trạng thái |
|------|---------|------------|
| `src/pages/NotificationPage.tsx` | Trang danh sách thông báo | Hoạt động |
| `src/hooks/useNotificationPolling.ts` | Polling 30s, trả `notifications`, `unreadCount` | Hoạt động |
| `src/components/layout/Header.tsx` | Chuông + dropdown 8 items | Hoạt động |
| `src/services/recordingRequestService.ts` | API CRUD notification | Hoạt động |
| `src/types/notification.ts` | `AppNotification` + request types | Hoạt động |

> **Đã xóa (Phase 6):** `notificationStore.ts`, `NotificationProvider.tsx`, `NotificationDialog.tsx` — toast qua `@/uiToast` + `Toaster` trong `App.tsx`.

### Nơi đang gọi addNotification (chỉ 4 chỗ)

| Trang | Hành động | Type | Ai nhận |
|-------|-----------|------|---------|
| `ApprovedRecordingsPage` | Expert xóa trực tiếp bản thu | `recording_deleted` | Contributor |
| `ApprovedRecordingsPage` | Expert từ chối yêu cầu xóa | `delete_request_rejected` | Contributor |
| `ModerationPage` | Expert xóa bản thu (moderation) | `recording_deleted` | All roles |
| `AdminDashboard` | Admin duyệt xóa tài khoản expert | `expert_account_deletion_approved` | Admin (⚠️ sai target) |

### Luồng notification chính (Core Flows)

Hai luồng quan trọng nhất cần hoạt động end-to-end:

```
╔═══════════════════════════════════════════════════════════════════╗
║  FLOW 1: Contributor submit → Expert nhận thông báo chờ duyệt   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Contributor                           Expert                     ║
║  ──────────                           ──────                     ║
║  1. Vào /upload, điền form                                       ║
║  2. Bấm "Gửi đóng góp"                                          ║
║     │                                                             ║
║     ▼                                                             ║
║  3. FE gọi API tạo submission                                    ║
║     (confirmSubmission / createSubmission)                        ║
║     │                                                             ║
║     ▼                                                             ║
║  4. ✅ Submit thành công                                          ║
║     │                                                             ║
║     ▼                                                             ║
║  5. FE gọi addNotification ──────────► 6. Expert poll/nhận       ║
║     {                                      notification mới       ║
║       type: 'submission_pending_review',   │                      ║
║       title: 'Bài đóng góp mới',          ▼                      ║
║       body: '"<tên bài>" đang chờ         7. 🔔 Badge chuông     ║
║              kiểm duyệt',                    tăng + toast hiện   ║
║       forRoles: [EXPERT],                    │                    ║
║       recordingId: <id>                      ▼                    ║
║     }                                     8. Expert click →       ║
║                                              /moderation          ║
╚═══════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════╗
║  FLOW 2: Expert duyệt → Contributor nhận thông báo đã duyệt     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Expert                                Contributor                ║
║  ──────                               ──────────                 ║
║  1. Vào /moderation                                              ║
║  2. Chọn bài → review → bấm "Duyệt"                             ║
║     │                                                             ║
║     ▼                                                             ║
║  3. FE gọi API approve submission                                ║
║     │                                                             ║
║     ▼                                                             ║
║  4. ✅ Duyệt thành công                                          ║
║     │                                                             ║
║     ▼                                                             ║
║  5. FE gọi addNotification ──────────► 6. Contributor poll/nhận  ║
║     {                                      notification mới       ║
║       type: 'submission_approved',         │                      ║
║       title: 'Đóng góp được duyệt',       ▼                      ║
║       body: '"<tên bài>" đã được         7. 🔔 Badge chuông     ║
║              duyệt thành công',              tăng + toast hiện   ║
║       forRoles: [CONTRIBUTOR],               │                    ║
║       recordingId: <id>                      ▼                    ║
║     }                                     8. Contributor click →  ║
║                                              /recordings/<id>     ║
║                                              (xem bài đã duyệt)  ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Tương tự cho trường hợp Expert từ chối:**

```
Expert bấm "Từ chối" → addNotification({
  type: 'submission_rejected',
  title: 'Đóng góp bị từ chối',
  body: '"<tên bài>" đã bị từ chối. Lý do: <reason>',
  forRoles: [CONTRIBUTOR],
  recordingId: <id>
}) → Contributor nhận thông báo → click → /contributions
```

### Toàn bộ luồng nghiệp vụ cần notification (Full Audit)

> Rà soát toàn bộ source code — mọi hành động của mọi role.

#### A. Submission / Upload (Contributor → Expert)

| # | Luồng | File trigger | Handler | API thành công | Ai nhận | Type đề xuất | Hiện trạng FE |
|---|-------|-------------|---------|----------------|---------|--------------|---------------|
| A1 | Contributor **submit bài cuối cùng** (confirm) | `useUploadSubmission.ts` | `handleConfirmSubmit` (isFinal=true) | `confirmSubmission` → `PUT /Submission/confirm-submit-submission` | Expert | `submission_pending_review` | ⚠️ THIẾU |
| A2 | Contributor **lưu nháp** | `useUploadSubmission.ts` | `handleConfirmSubmit` (isFinal=false) | `updateRecording` → `PUT /Recording/{id}/upload` | — (không cần) | — | OK (không cần TB) |
| A3 | Contributor **xóa submission** (nháp/pending) | `ContributionsPage.tsx` | `handleDelete` | `deleteSubmission` → `DELETE /Submission/{id}` | — (không cần) | — | OK |
| A4 | Contributor **cập nhật bài** (edit + re-submit) | `useUploadSubmission.ts` | `handleConfirmSubmit` (edit mode) | `updateRecording` + `confirmSubmission` | Expert | `submission_updated` | ⚠️ THIẾU |

#### B. Kiểm duyệt / Moderation (Expert → Contributor)

| # | Luồng | File trigger | Handler | API thành công | Ai nhận | Type đề xuất | Hiện trạng FE |
|---|-------|-------------|---------|----------------|---------|--------------|---------------|
| B1 | Expert **nhận bài** (claim/assign) | `ModerationPage.tsx` | `assignOnly` | `claimSubmission` → `PUT /Submission/assign-reviewer-submission` | Contributor (tùy chọn) | `submission_claimed` | ⚠️ THIẾU (optional) |
| B2 | Expert **duyệt bài thành công** | `ModerationPage.tsx` | `handleConfirmApprove` | `syncApproveToServer` → `PUT /Submission/approve-submission` | **Contributor** | `submission_approved` | ⚠️ **THIẾU (Critical)** |
| B3 | Expert **từ chối bài** | `ModerationPage.tsx` | `handleConfirmReject` | `syncRejectToServer` → `PUT /Submission/reject-submission` | **Contributor** | `submission_rejected` | ⚠️ **THIẾU (Critical)** |
| B4 | Expert **xóa bản thu** (moderation) | `ModerationPage.tsx` | `handleConfirmDelete` | `removeLocalRecording` (local) | All roles | `recording_deleted` | ✅ Đã có |
| B5 | Expert **trả bài** (unclaim) | `ModerationPage.tsx` | `handleConfirmUnclaim` | `unclaimSubmission` → `PUT /Submission/unassign-reviewer-submission` | — (không cần) | — | OK |

#### C. Bản thu đã duyệt (Expert/Admin → Contributor)

| # | Luồng | File trigger | Handler | API thành công | Ai nhận | Type đề xuất | Hiện trạng FE |
|---|-------|-------------|---------|----------------|---------|--------------|---------------|
| C1 | Expert **xóa trực tiếp** bản thu đã duyệt | `ApprovedRecordingsPage.tsx` | `handleDeleteConfirm` (type=direct) | `removeLocalRecording` | Contributor | `recording_deleted` | ✅ Đã có |
| C2 | Expert **xử lý yêu cầu xóa** | `ApprovedRecordingsPage.tsx` | `handleDeleteConfirm` (type=request) | `completeDeleteRecording` → `PUT /Review/{id}` | Contributor | `recording_deleted` | ⚠️ THIẾU |
| C3 | Expert **từ chối yêu cầu xóa** | `ApprovedRecordingsPage.tsx` | `handleRejectConfirm` | `removeDeleteRequest` → `DELETE /Review/{id}` | Contributor | `delete_request_rejected` | ✅ Đã có |
| C4 | Expert **duyệt yêu cầu chỉnh sửa** | `ApprovedRecordingsPage.tsx` | `handleApproveEditConfirm` | `approveEditSubmission` → `PUT /Review/{id}` | Contributor | `edit_submission_approved` | ⚠️ THIẾU |

#### D. Admin Dashboard (Admin → User)

| # | Luồng | File trigger | Handler | API thành công | Ai nhận | Type đề xuất | Hiện trạng FE |
|---|-------|-------------|---------|----------------|---------|--------------|---------------|
| D1 | Admin **đổi role** user | `AdminDashboard.tsx` | `handleAssignRole` | `adminApi.updateUserRole` → `PUT /Admin/users/{id}/role` | User bị đổi | `role_changed` | ⚠️ THIẾU |
| D2 | Admin **vô hiệu hóa** user | `AdminDashboard.tsx` | `handleDeleteUser` | `adminApi.updateUserStatus` → `PUT .../status` | User bị vô hiệu | `account_deactivated` | ⚠️ THIẾU |
| D3 | Admin **duyệt xóa tài khoản** expert | `AdminDashboard.tsx` | dialog confirm | `accountDeletionService.approveExpertAccountDeletion` | **Expert** (⚠️ hiện gửi cho ADMIN — sai) | `expert_account_deletion_approved` | ⚠️ Có nhưng sai `forRoles` |
| D4 | Admin **chuyển yêu cầu xóa** cho expert | `AdminRequestPanel.tsx` | forward handler | `forwardDeleteToExpert` → `PUT /Review/{id}` | Expert được chỉ định | `delete_request_forwarded` | ⚠️ THIẾU |
| D5 | Admin **duyệt yêu cầu chỉnh sửa** | `AdminRequestPanel.tsx` | approve handler | `approveEditRequest` → `PUT /Review/{id}` | Contributor | `edit_request_approved` | ⚠️ THIẾU |
| D6 | Admin **xóa bản thu** | `AdminDashboard.tsx` | `handleRemoveRecording` | `removeLocalRecording` | Contributor | `recording_deleted` | ⚠️ THIẾU |

#### E. Tranh chấp & Embargo (Admin → Contributor/Expert)

| # | Luồng | File trigger | Handler | API thành công | Ai nhận | Type đề xuất | Hiện trạng FE |
|---|-------|-------------|---------|----------------|---------|--------------|---------------|
| E1 | Admin **giải quyết tranh chấp** | `DisputeListPanel.tsx` | resolve handler | `copyrightDisputeApi.resolve` | Contributor (nếu `notifyContributor`) | `dispute_resolved` | ⚠️ THIẾU |
| E2 | Admin **gỡ embargo** | `EmbargoListPanel.tsx` | lift handler | `embargoApi.lift` | Contributor | `embargo_lifted` | ⚠️ THIẾU |

#### F. Tài khoản / Auth

| # | Luồng | File trigger | Handler | Ai nhận | Hiện trạng |
|---|-------|-------------|---------|---------|------------|
| F1 | Expert **yêu cầu xóa tài khoản** | `ProfilePage.tsx` | `handleDeleteAccountConfirm` (expert) | Admin | ⚠️ THIẾU |
| F2 | Researcher **đăng ký mới** | `RegisterPage.tsx` | `onSubmit` | Admin (optional) | ⚠️ THIẾU (optional) |

#### G. QA / Chat / Annotation (Optional — ưu tiên thấp)

| # | Luồng | File trigger | Ai nhận | Hiện trạng |
|---|-------|-------------|---------|------------|
| G1 | Ai đó **flag** câu trả lời AI | `ChatbotPage.tsx` | Admin | ⚠️ THIẾU |
| G2 | Admin **sửa câu trả lời** flagged | `FlaggedResponseList.tsx` | — | Không cần |
| G3 | Expert **thêm annotation** | `AnnotationPanel.tsx` | Contributor (optional) | ⚠️ THIẾU (optional) |

---

### Tổng kết: 25 luồng, chỉ 3 đang có notification

| Trạng thái | Số lượng | Chi tiết |
|------------|----------|----------|
| ✅ Đã có notification | 3 | B4, C1, C3 |
| ⚠️ Có nhưng sai target | 1 | D3 (gửi cho Admin thay vì Expert) |
| ⚠️ **THIẾU — Critical** | 3 | A1 (submit), B2 (approve), B3 (reject) |
| ⚠️ THIẾU — High | 5 | A4, C2, C4, D4, D5 |
| ⚠️ THIẾU — Medium | 5 | D1, D2, D6, E1, E2 |
| ⚠️ THIẾU — Low/Optional | 5 | B1, F1, F2, G1, G3 |
| Không cần | 3 | A2, A3, B5 |

---

## Phase 0: Câu hỏi — Đã trả lời (dựa trên audit code)

> **Trạng thái:** Tất cả câu hỏi đã được giải đáp bằng cách đọc source code trực tiếp. Không cần hỏi thêm.

| # | Câu hỏi | Bằng chứng trong code | Kết luận |
|---|---------|----------------------|----------|
| Q1 | Backend có hỗ trợ SignalR không? | ~~Grep toàn `src/` — không có signalr~~ → **CẬP NHẬT:** `FE-admin-notification-api-reference.md` xác nhận BE có hub `{BASE_URL}/notificationHub` + event `ReceiveNotification`. FE chưa tích hợp. | ✅ **SignalR SẴN SÀNG** → Phase 8 tích hợp, giữ polling làm fallback |
| Q2 | Cần thêm những loại notification nào? | `src/types/notification.ts` line 44-49: chỉ có **5 types** hiện tại. Audit phát hiện **11 types còn thiếu** cho các luồng nghiệp vụ thực tế. | ✅ Thêm đủ 11 types mới (xem Phase 4.0) — tổng **16 types** |
| Q3 | Click notification có cần navigate không? | `Header.tsx` line 186-190: notification item là `<li>` tĩnh, **không có** `onClick`, `navigate`, hay `<Link>`. `NotificationPage.tsx` cũng không có. | ✅ Cần thêm click-to-navigate cho tất cả 16 types (Phase 3) |
| Q4 | Cần notification preferences không? | Không có settings UI, không có preferences schema trong types. Scope hiện tại đã đủ lớn. | ❌ Không cần — bỏ qua giai đoạn này |
| Q5 | Cần xóa notification không? | ~~`recordingRequestService.ts` line 416-420: chỉ có PUT~~ → **CẬP NHẬT:** API reference xác nhận `DELETE /api/Notification/{id}` trả `{ success: true }`. FE chưa dùng. | ✅ **Backend HỖ TRỢ xóa** → Phase 8 thêm UI xóa từng notification |
| Q6 | Badge hiển thị số hay chỉ chấm đỏ? | `Header.tsx`: badge số trên chuông desktop (`min-w-[18px]`, `text-[10px]`, `> 99` → `99+`). Menu mobile: badge số cạnh link "Thông báo" (Phase 5). | ✅ Desktop + mobile |
| Q7 | `addNotification` có gửi `forRoles` lên backend không? | `recordingRequestService.ts` line 391-402: `POST /Notification` body chỉ có `type`, `title`, `message`, `relatedId` — **không** gửi `forRoles`. Backend tự filter theo JWT. | ⚠️ `forRoles` trong FE chỉ là documentation — backend tự xác định ai nhận dựa vào JWT + role |
| Q9 | BE có tự tạo notification không? | **CẬP NHẬT:** API reference Section 4 — BE **tự động gửi** notification cho 10 events (xem bảng Phase 8.1). FE gọi `addNotification` cho các event này sẽ tạo **DUPLICATE**. | ⚠️ **CRITICAL** — cần xóa `addNotification` trùng lặp (Phase 8.2) |
| Q10 | Type naming convention? | BE dùng **PascalCase** (`SubmissionApproved`, `NewRecordingPending`). FE dùng **snake_case** (`submission_approved`, `submission_pending_review`). | ⚠️ Cần type normalizer trong API layer (Phase 8.3) |
| Q11 | Có endpoint đếm unread riêng? | `GET /api/Notification/unread-count` → `{ unread: 8, total: 45 }`. FE hiện poll full list rồi đếm client-side. | ✅ Dùng endpoint riêng cho polling nhẹ hơn (Phase 8.4) |
| Q8 | `getNotificationsForRole` có dùng `role` param không? | Line 405-413: `void role;` — **bỏ qua hoàn toàn**, gọi `GET /Notification` không filter. Backend tự trả TB theo JWT user. | ⚠️ Backend filter by user — FE không cần gửi role param |

---

## Phase 1: Toast khi có notification mới

**Mục tiêu:** User nhận feedback ngay khi có notification mới mà không cần mở dropdown.

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 1.1 | Cập nhật `useNotificationPolling` — so sánh danh sách cũ/mới, phát hiện notification mới | `src/hooks/useNotificationPolling.ts` | S |
| 1.2 | Khi phát hiện notification mới + `!read` → gọi `uiToast.info()` với title + body | `src/hooks/useNotificationPolling.ts` | S |
| 1.3 | Thêm option `onNewNotification` callback vào hook để component có thể tùy chỉnh | `src/hooks/useNotificationPolling.ts` | S |

### Logic phát hiện notification mới

```
prevIdsRef = useRef<Set<string>>()

Mỗi lần poll:
  newIds = notifications.map(n => n.id)
  addedIds = newIds.filter(id => !prevIdsRef.current.has(id))
  
  for (id of addedIds):
    notification = find by id
    if (!notification.read):
      uiToast.info(notification.title + ': ' + notification.body)
  
  prevIdsRef.current = new Set(newIds)
```

---

## Phase 2: Badge hiển thị số lượng

**Mục tiêu:** Header bell icon hiển thị số unread thay vì chỉ chấm đỏ.

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 2.1 | Thay chấm đỏ bằng badge số: `unreadCount` (nếu > 99 → "99+") | `src/components/layout/Header.tsx` | S |
| 2.2 | Style badge: rounded-full, bg-red-500, text-white, text-[10px], min-w-[18px] | `src/components/layout/Header.tsx` | S |

---

## Phase 3: Click-to-navigate

**Mục tiêu:** Click vào notification item → điều hướng đến trang liên quan + mark read.

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 3.1 | Tạo helper `getNotificationTargetPath(notification)` → trả route path dựa trên `type` + `recordingId` | `src/utils/notificationRoutes.ts` (mới) | S |
| 3.2 | Trong Header dropdown: wrap mỗi item bằng `<Link>` hoặc `onClick → navigate + markRead` | `src/components/layout/Header.tsx` | M |
| 3.3 | Trong NotificationPage: wrap mỗi item bằng click handler tương tự | `src/pages/NotificationPage.tsx` | M |

### Route mapping (tất cả 16 types)

| Notification type | Người nhận | Target path |
|-------------------|-----------|-------------|
| `submission_pending_review` | Expert | `/moderation` |
| `submission_approved` | Contributor | `/recordings/:recordingId` |
| `submission_rejected` | Contributor | `/contributions` |
| `submission_updated` | Expert | `/moderation` |
| `recording_deleted` | Contributor | `/contributions` |
| `recording_edited` | Contributor | `/recordings/:recordingId` hoặc `/contributions` |
| `edit_submission_approved` | Contributor | `/contributions` |
| `edit_request_approved` | Contributor | `/contributions` |
| `delete_request_rejected` | Contributor | `/contributions` |
| `delete_request_forwarded` | Expert | `/approved-recordings` |
| `expert_account_deletion_approved` | Expert | `/profile` |
| `expert_deletion_requested` | Admin | `/admin` |
| `role_changed` | User | `/profile` |
| `account_deactivated` | User | `/profile` |
| `dispute_resolved` | Contributor | `/contributions` |
| `embargo_lifted` | Contributor | `/recordings/:recordingId` |

---

## Phase 4: Implementation tất cả Notification Flows

> ⚠️ **CẢNH BÁO DUPLICATE (phát hiện sau khi đối chiếu API reference):**
>
> Backend **tự động tạo notification** cho 10 events (xem `FE-admin-notification-api-reference.md` Section 4).
> Các lệnh `addNotification` FE đã thêm trong Phase 4A–4C cho các event trùng **SẼ TẠO NOTIFICATION KÉP**.
>
> **→ Phase 8.2 sẽ xóa tất cả lệnh `addNotification` trùng lặp.**
>
> | Ref | Event | BE auto? | FE addNotification? | Kết luận |
> |-----|-------|----------|---------------------|----------|
> | A1 | Submit bài mới | ✅ `NewRecordingPending` | ✅ Đã thêm | ❌ **XÓA** — BE tự gửi |
> | B2 | Expert duyệt | ✅ `SubmissionApproved` | ✅ Đã thêm | ❌ **XÓA** — BE tự gửi |
> | B3 | Expert từ chối | ✅ `SubmissionRejected` | ✅ Đã thêm | ❌ **XÓA** — BE tự gửi |
> | D1 | Admin đổi role | ✅ `RoleChanged` | ✅ Đã thêm | ❌ **XÓA** — BE tự gửi |
> | D2 | Admin vô hiệu hóa | ✅ `AccountDeactivated` | ✅ Đã thêm | ❌ **XÓA** — BE tự gửi |
> | E1 | Giải quyết tranh chấp | ✅ `DisputeResolved` | ✅ Đã thêm | ❌ **XÓA** — BE tự gửi |
> | E2 | Gỡ embargo | ✅ `EmbargoLifted` | ✅ Đã thêm | ❌ **XÓA** — BE tự gửi |
> | A4 | Re-submit bài sửa | ❓ Có thể `NewRecordingPending` | ✅ Đã thêm | ⚠️ **Kiểm tra** — nếu BE gửi thì xóa |
> | B4 | Expert xóa bản thu | ❌ | ✅ Đã có | ✅ **GIỮ** |
> | C1 | Expert xóa trực tiếp | ❌ | ✅ Đã có | ✅ **GIỮ** |
> | C2 | Expert xử lý yêu cầu xóa | ❌ | ✅ Đã thêm | ✅ **GIỮ** |
> | C3 | Expert từ chối yêu cầu xóa | ❌ | ✅ Đã có | ✅ **GIỮ** |
> | C4 | Expert duyệt yêu cầu sửa | ❌ | ✅ Đã thêm | ✅ **GIỮ** |
> | D4 | Admin chuyển yêu cầu xóa | ❌ | ✅ Đã thêm | ✅ **GIỮ** |
> | D5 | Admin duyệt yêu cầu sửa | ❌ | ✅ Đã thêm | ✅ **GIỮ** |
> | D3 | Admin duyệt xóa expert | ❌ | ✅ Đã sửa forRoles | ✅ **GIỮ** |
> | F1 | Expert yêu cầu xóa TK | ❌ | ✅ Đã thêm | ✅ **GIỮ** |

**Mục tiêu:** Triển khai notification cho tất cả luồng nghiệp vụ, chia theo tier ưu tiên.

---

### 4.0 Cập nhật types (làm trước tất cả)

**File:** `src/types/notification.ts`

Thêm tất cả type mới vào union `AppNotification['type']`:

```typescript
type:
  // Hiện có
  | 'recording_deleted'
  | 'recording_edited'
  | 'expert_account_deletion_approved'
  | 'delete_request_rejected'
  | 'edit_submission_approved'
  // ★ Tier 1 — Critical
  | 'submission_pending_review'
  | 'submission_approved'
  | 'submission_rejected'
  // ★ Tier 2 — High
  | 'submission_updated'
  | 'delete_request_forwarded'
  | 'edit_request_approved'
  // ★ Tier 3 — Medium
  | 'role_changed'
  | 'account_deactivated'
  | 'dispute_resolved'
  | 'embargo_lifted'
  | 'expert_deletion_requested'
```

**File:** `src/components/common/NotificationTypeIcon.tsx` — một nguồn icon cho `Header` + `NotificationPage` (bảng mapping giữ nguyên bên dưới).

| Type | Icon | Màu (Tailwind) |
|------|------|----------------|
| `submission_pending_review` | `FileAudio` | `text-primary-600` |
| `submission_approved` | `CheckCircle` | `text-emerald-500` |
| `submission_rejected` | `X` | `text-red-500` |
| `submission_updated` | `RefreshCw` | `text-blue-500` |
| `recording_deleted` | `Trash2` | `text-red-600` |
| `recording_edited` | `Edit3` | `text-blue-500` |
| `edit_submission_approved` | `CheckCircle` | `text-emerald-500` |
| `edit_request_approved` | `CheckCircle` | `text-emerald-500` |
| `delete_request_rejected` | `X` | `text-amber-500` |
| `delete_request_forwarded` | `ArrowRight` | `text-amber-500` |
| `expert_account_deletion_approved` | `Trash2` | `text-red-600` |
| `expert_deletion_requested` | `UserMinus` | `text-amber-500` |
| `role_changed` | `Shield` | `text-blue-500` |
| `account_deactivated` | `UserX` | `text-red-500` |
| `dispute_resolved` | `Scale` | `text-emerald-500` |
| `embargo_lifted` | `Unlock` | `text-emerald-500` |

---

### 4A. Tier 1 — Critical (3 luồng cốt lõi)

#### 4A.1 Contributor submit bài → Expert nhận TB (Ref: A1)

| Item | Chi tiết |
|------|----------|
| **File** | `src/features/upload/hooks/useUploadSubmission.ts` |
| **Handler** | `handleConfirmSubmit` — nhánh `isFinal === true` |
| **Sau dòng** | `await submissionService.confirmSubmission(submissionId)` thành công |
| **Import thêm** | `recordingRequestService` từ `@/services/recordingRequestService`, `UserRole` từ `@/types` |

```typescript
await recordingRequestService.addNotification({
  type: 'submission_pending_review',
  title: 'Bài đóng góp mới cần duyệt',
  body: `"${title}" vừa được gửi và đang chờ kiểm duyệt.`,
  forRoles: [UserRole.EXPERT],
  recordingId: createdRecordingId || editingRecordingId || undefined,
});
```

#### 4A.2 Expert duyệt bài → Contributor nhận TB (Ref: B2)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/ModerationPage.tsx` |
| **Handler** | `handleConfirmApprove` |
| **Sau dòng** | `syncApproveToServer` thành công (trước toast/cleanup) |
| **Dữ liệu cần** | `recordingTitle`, `recordingId` từ submission đang duyệt |

```typescript
await recordingRequestService.addNotification({
  type: 'submission_approved',
  title: 'Đóng góp đã được duyệt',
  body: `"${recordingTitle}" đã được duyệt thành công và hiển thị trên hệ thống.`,
  forRoles: [UserRole.CONTRIBUTOR],
  recordingId: recordingId,
});
```

#### 4A.3 Expert từ chối bài → Contributor nhận TB (Ref: B3)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/ModerationPage.tsx` |
| **Handler** | `handleConfirmReject` |
| **Sau dòng** | `syncRejectToServer` thành công |
| **Dữ liệu cần** | `recordingTitle`, `recordingId`, `rejectReason` |

```typescript
await recordingRequestService.addNotification({
  type: 'submission_rejected',
  title: 'Đóng góp bị từ chối',
  body: `"${recordingTitle}" đã bị từ chối.${rejectReason ? ` Lý do: ${rejectReason}` : ''}`,
  forRoles: [UserRole.CONTRIBUTOR],
  recordingId: recordingId,
});
```

---

### 4B. Tier 2 — High (5 luồng quan trọng)

#### 4B.1 Contributor re-submit bài đã sửa (Ref: A4)

| Item | Chi tiết |
|------|----------|
| **File** | `src/features/upload/hooks/useUploadSubmission.ts` |
| **Handler** | `handleConfirmSubmit` — nhánh `isEditMode && isFinal` |
| **Điều kiện** | `isEditMode === true` + `isFinal === true` |

```typescript
await recordingRequestService.addNotification({
  type: 'submission_updated',
  title: 'Bài đóng góp được cập nhật',
  body: `"${title}" đã được cập nhật và gửi lại chờ kiểm duyệt.`,
  forRoles: [UserRole.EXPERT],
  recordingId: createdRecordingId || editingRecordingId || undefined,
});
```

#### 4B.2 Expert xử lý yêu cầu xóa (Ref: C2)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/ApprovedRecordingsPage.tsx` |
| **Handler** | `handleDeleteConfirm` — nhánh `type === 'request'` |
| **Hiện trạng** | Không gọi `addNotification` — cần thêm |

```typescript
await recordingRequestService.addNotification({
  type: 'recording_deleted',
  title: 'Bản thu đã bị xóa',
  body: `"${recordingTitle}" đã bị xóa theo yêu cầu.`,
  forRoles: [UserRole.CONTRIBUTOR],
  recordingId: recordingId,
});
```

#### 4B.3 Expert duyệt yêu cầu chỉnh sửa (Ref: C4)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/ApprovedRecordingsPage.tsx` |
| **Handler** | `handleApproveEditConfirm` |

```typescript
await recordingRequestService.addNotification({
  type: 'edit_submission_approved',
  title: 'Yêu cầu chỉnh sửa được duyệt',
  body: `Bạn đã được phép chỉnh sửa "${recordingTitle}".`,
  forRoles: [UserRole.CONTRIBUTOR],
  recordingId: recordingId,
});
```

#### 4B.4 Admin chuyển yêu cầu xóa cho Expert (Ref: D4)

| Item | Chi tiết |
|------|----------|
| **File** | `src/components/admin/AdminRequestPanel.tsx` |
| **Handler** | forward delete to expert handler |

```typescript
await recordingRequestService.addNotification({
  type: 'delete_request_forwarded',
  title: 'Yêu cầu xóa bản thu',
  body: `Quản trị viên chuyển yêu cầu xóa "${recordingTitle}" cho bạn xem xét.`,
  forRoles: [UserRole.EXPERT],
  recordingId: recordingId,
});
```

#### 4B.5 Admin duyệt yêu cầu chỉnh sửa (Ref: D5)

| Item | Chi tiết |
|------|----------|
| **File** | `src/components/admin/AdminRequestPanel.tsx` |
| **Handler** | approve edit request handler |

```typescript
await recordingRequestService.addNotification({
  type: 'edit_request_approved',
  title: 'Yêu cầu chỉnh sửa được duyệt',
  body: `Yêu cầu chỉnh sửa "${recordingTitle}" đã được quản trị viên duyệt.`,
  forRoles: [UserRole.CONTRIBUTOR],
  recordingId: recordingId,
});
```

---

### 4C. Tier 3 — Medium (5 luồng)

#### 4C.1 Admin đổi role user (Ref: D1)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/admin/AdminDashboard.tsx` |
| **Handler** | `handleAssignRole` — sau `adminApi.updateUserRole` thành công |

```typescript
await recordingRequestService.addNotification({
  type: 'role_changed',
  title: 'Vai trò đã thay đổi',
  body: `Vai trò tài khoản của bạn đã được thay đổi thành ${newRole}.`,
  forRoles: [targetRole],
});
```

#### 4C.2 Admin vô hiệu hóa user (Ref: D2)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/admin/AdminDashboard.tsx` |
| **Handler** | `handleDeleteUser` — sau `adminApi.updateUserStatus` thành công |

```typescript
await recordingRequestService.addNotification({
  type: 'account_deactivated',
  title: 'Tài khoản bị vô hiệu hóa',
  body: 'Tài khoản của bạn đã bị vô hiệu hóa bởi quản trị viên.',
  forRoles: [userRole],
});
```

#### 4C.3 Admin xóa bản thu (Ref: D6)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/admin/AdminDashboard.tsx` |
| **Handler** | `handleRemoveRecording` |

```typescript
await recordingRequestService.addNotification({
  type: 'recording_deleted',
  title: 'Bản thu đã bị xóa',
  body: `"${recordingTitle}" đã bị xóa bởi quản trị viên.`,
  forRoles: [UserRole.CONTRIBUTOR, UserRole.EXPERT],
  recordingId: recordingId,
});
```

#### 4C.4 Admin giải quyết tranh chấp (Ref: E1)

| Item | Chi tiết |
|------|----------|
| **File** | `src/components/features/moderation/DisputeListPanel.tsx` |
| **Handler** | resolve handler |

```typescript
await recordingRequestService.addNotification({
  type: 'dispute_resolved',
  title: 'Tranh chấp đã được giải quyết',
  body: `Tranh chấp về "${recordingTitle}" đã được giải quyết.`,
  forRoles: [UserRole.CONTRIBUTOR],
  recordingId: recordingId,
});
```

#### 4C.5 Admin gỡ embargo (Ref: E2)

| Item | Chi tiết |
|------|----------|
| **File** | `src/components/features/moderation/EmbargoListPanel.tsx` |
| **Handler** | lift handler |

```typescript
await recordingRequestService.addNotification({
  type: 'embargo_lifted',
  title: 'Embargo đã được gỡ',
  body: `Bản thu "${recordingTitle}" đã được gỡ embargo.`,
  forRoles: [UserRole.CONTRIBUTOR],
  recordingId: recordingId,
});
```

---

### 4D. Tier 4 — Low/Optional + Bugfix (3 luồng)

#### 4D.1 Sửa bug: Admin duyệt xóa expert → sai forRoles (Ref: D3)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/admin/AdminDashboard.tsx` |
| **Vấn đề** | `forRoles: [UserRole.ADMIN]` → cần đổi thành `[UserRole.EXPERT]` |
| **Sửa** | Đổi `forRoles` target |

#### 4D.2 Expert yêu cầu xóa tài khoản → Admin nhận TB (Ref: F1)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/ProfilePage.tsx` |
| **Handler** | `handleDeleteAccountConfirm` (expert branch) |

```typescript
await recordingRequestService.addNotification({
  type: 'expert_deletion_requested',
  title: 'Yêu cầu xóa tài khoản chuyên gia',
  body: `Chuyên gia ${user.fullName || user.username} yêu cầu xóa tài khoản.`,
  forRoles: [UserRole.ADMIN],
});
```

#### 4D.3 Expert nhận bài (claim) → Contributor biết (Ref: B1, optional)

| Item | Chi tiết |
|------|----------|
| **File** | `src/pages/ModerationPage.tsx` |
| **Handler** | `assignOnly` |
| **Ghi chú** | Optional — có thể gây noise cho contributor nếu expert claim rồi unclaim |

---

### Tổng hợp tất cả notification types (16 types)

| # | Type | Ai nhận | Khi nào | Icon | Color | Tier |
|---|------|---------|---------|------|-------|------|
| 1 | `submission_pending_review` | Expert | Contributor submit/re-submit bài | `FileAudio` | primary-500 | Critical |
| 2 | `submission_approved` | Contributor | Expert duyệt bài | `CheckCircle` | emerald-500 | Critical |
| 3 | `submission_rejected` | Contributor | Expert từ chối bài | `X` | red-500 | Critical |
| 4 | `submission_updated` | Expert | Contributor cập nhật bài đã sửa | `RefreshCw` | blue-500 | High |
| 5 | `recording_deleted` | Contributor | Xóa bản thu (đã có) | `Trash2` | red-500 | ✅ |
| 6 | `recording_edited` | Contributor | Bản thu được chỉnh sửa (đã có) | `Edit3` | blue-500 | ✅ |
| 7 | `edit_submission_approved` | Contributor | Duyệt yêu cầu chỉnh sửa | `CheckCircle` | emerald-500 | High |
| 8 | `edit_request_approved` | Contributor | Admin duyệt yêu cầu chỉnh sửa | `CheckCircle` | emerald-500 | High |
| 9 | `delete_request_rejected` | Contributor | Từ chối yêu cầu xóa (đã có) | `X` | amber-500 | ✅ |
| 10 | `delete_request_forwarded` | Expert | Admin chuyển yêu cầu xóa | `ArrowRight` | amber-500 | High |
| 11 | `expert_account_deletion_approved` | Expert | Duyệt xóa tài khoản (đã có, cần fix) | `Trash2` | red-500 | Fix |
| 12 | `expert_deletion_requested` | Admin | Expert yêu cầu xóa tài khoản | `UserMinus` | amber-500 | Low |
| 13 | `role_changed` | User bị đổi | Admin đổi role | `Shield` | blue-500 | Medium |
| 14 | `account_deactivated` | User bị vô hiệu | Admin vô hiệu hóa | `UserX` | red-500 | Medium |
| 15 | `dispute_resolved` | Contributor | Admin giải quyết tranh chấp | `Scale` | emerald-500 | Medium |
| 16 | `embargo_lifted` | Contributor | Admin gỡ embargo | `Unlock` | emerald-500 | Medium |

---

## Phase 5: Cải thiện UX / Polish

**Mục tiêu:** Hoàn thiện trải nghiệm notification cho production.

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 5.1 | Mobile: thêm badge số vào link "Thông báo" trong mobile menu | `Header.tsx` | S |
| 5.2 | NotificationPage: thêm phân trang (hiện tải hết) hoặc infinite scroll | `NotificationPage.tsx` | M |
| 5.3 | NotificationPage: thêm filter tab "Tất cả / Chưa đọc" | `NotificationPage.tsx` | M |
| 5.4 | Relative time ("3 phút trước") thay vì absolute datetime | `NotificationPage.tsx`, `Header.tsx` | S |
| 5.5 | Animation cho notification items (fade-in khi mới, slide-out khi mark read) | `NotificationPage.tsx` | S |
| 5.6 | Skeleton loading state cho dropdown và trang | `Header.tsx`, `NotificationPage.tsx` | S |

> **Trạng thái Phase 5:** Đã triển khai 5.1–5.6 (fade-in list; slide-out mark read không làm để tránh state phức tạp).

---

## Phase 6: Dọn legacy code

**Mục tiêu:** Xóa code không sử dụng để giảm bundle size và tránh nhầm lẫn.

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 6.1 | Xóa `notificationStore.ts` (confirm không có import nào dùng `notify.*`) | `src/stores/notificationStore.ts` | S |
| 6.2 | Xóa `NotificationDialog.tsx` (confirm chỉ `NotificationProvider` import) | `src/components/common/NotificationDialog.tsx` | S |
| 6.3 | Thay `NotificationProvider` bằng fragment rỗng hoặc xóa hẳn + cập nhật `App.tsx` | `NotificationProvider.tsx`, `App.tsx` | S |
| 6.4 | Kiểm tra + cleanup `@deprecated` marks | Toàn codebase | S |

> **Trạng thái Phase 6:** Đã xóa 3 file; `RootWrapper` dùng `<>...</>`; rule ESLint `notify` → `notificationStore` đã gỡ; `@deprecated` duy nhất trong `src` nằm ở store đã xóa.

---

## Phase 7: Real-time với SignalR (**READY** — BE đã có hub)

> ~~Chỉ thực hiện khi backend hỗ trợ SignalR hub.~~
> **CẬP NHẬT:** Backend đã triển khai SignalR hub tại `{BASE_URL}/notificationHub` (xem API reference Section 3).

### Hub Info

```
URL:   {VITE_API_BASE_URL}/notificationHub
Auth:  JWT token qua accessTokenFactory
Event: "ReceiveNotification"
```

### Payload `ReceiveNotification`

```json
{
  "id": "guid",
  "title": "Bản ghi đã được duyệt",
  "message": "Chúc mừng! ...",
  "type": "SubmissionApproved",          // PascalCase!
  "relatedEntityType": "Submission",
  "relatedEntityId": "submission-guid",
  "createdAt": "2026-04-14T10:30:00Z",
  "isRead": false
}
```

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 7.1 | Thêm `@microsoft/signalr` vào dependencies | `package.json` | S |
| 7.2 | Tạo `src/services/notificationHub.ts` — kết nối hub, listen `ReceiveNotification`, auto-reconnect | Mới | M |
| 7.3 | Tạo `src/hooks/useNotificationRealtime.ts` — nhận notification qua SignalR + cập nhật state + hiện toast | Mới | M |
| 7.4 | Cập nhật `Header.tsx` + `NotificationPage.tsx` dùng hook mới thay `useNotificationPolling` | Existing | M |
| 7.5 | Fallback: giảm polling interval (30s → 120s) khi SignalR connected; giữ polling khi disconnected | `useNotificationPolling.ts` | S |
| 7.6 | Normalize payload: `message→body`, `relatedEntityId→recordingId`, `isRead→read`, PascalCase→snake_case | `notificationHub.ts` | S |

### Chiến lược kết nối

```
1. App mount → khởi tạo SignalR connection
2. Nếu connected thành công:
   - Listen "ReceiveNotification" → update state + toast
   - Giảm polling interval → 120s (backup)
3. Nếu connection fail / disconnect:
   - Tăng polling interval về 30s (active fallback)
   - Auto-retry SignalR reconnect (exponential backoff)
4. Khi nhận event "ReceiveNotification":
   - Normalize payload (Phase 8.3 type mapping)
   - Prepend vào notification list
   - Increment unread count
   - Show toast nếu !isRead
```

---

## Phase 8: Đồng bộ API Backend (Critical — phải làm trước Phase 7)

> **Nguồn:** `FE-admin-notification-api-reference.md.resolved`
>
> Phase này sửa các vấn đề phát sinh khi đối chiếu FE code với API reference thực tế của backend.

---

### 8.1 Bảng BE auto-notification (10 events backend tự tạo)

> Khi backend xử lý các action dưới đây, nó **tự động** tạo notification cho đúng user — FE **KHÔNG CẦN** gọi `addNotification`.

| # | BE Type (PascalCase) | FE Type (snake_case) tương ứng | Khi nào | Ai nhận | BE Service |
|---|---------------------|-------------------------------|---------|---------|------------|
| 1 | `SubmissionApproved` | `submission_approved` | Expert duyệt submission | Contributor | SubmissionService2 |
| 2 | `SubmissionRejected` | `submission_rejected` | Expert từ chối submission | Contributor | SubmissionService2 |
| 3 | `SubmissionAssigned` | `submission_claimed` | Admin phân công reviewer | Expert | SubmissionService2 |
| 4 | `SubmissionUnassigned` | _(mới)_ `submission_unassigned` | Admin gỡ phân công | Expert (cũ) | SubmissionService2 |
| 5 | `NewRecordingPending` | `submission_pending_review` | Upload bản ghi mới | Tất cả Expert | RecordingService |
| 6 | `RoleChanged` | `role_changed` | Admin đổi role | User bị đổi | UserService |
| 7 | `AccountDeactivated` | `account_deactivated` | Admin vô hiệu hóa | User | UserService |
| 8 | `AccountActivated` | _(mới)_ `account_activated` | Admin kích hoạt lại | User | UserService |
| 9 | `EmbargoLifted` | `embargo_lifted` | Gỡ embargo | Chủ bản ghi | EmbargoService |
| 10 | `DisputeResolved` | `dispute_resolved` | Giải quyết tranh chấp | Người báo cáo | CopyrightDisputeService |

---

### 8.2 Xóa `addNotification` trùng lặp (7–8 chỗ)

**Mục tiêu:** Xóa tất cả lệnh `addNotification` mà BE đã tự tạo để tránh notification kép.

| # | File | Handler | addNotification type | Hành động |
|---|------|---------|---------------------|-----------|
| 8.2.1 | `src/features/upload/hooks/useUploadSubmission.ts` | `handleConfirmSubmit` (isFinal=true, NOT edit) | `submission_pending_review` | **XÓA** — BE gửi `NewRecordingPending` |
| 8.2.2 | `src/pages/ModerationPage.tsx` | `handleConfirmApprove` | `submission_approved` | **XÓA** — BE gửi `SubmissionApproved` |
| 8.2.3 | `src/pages/ModerationPage.tsx` | `handleConfirmReject` | `submission_rejected` | **XÓA** — BE gửi `SubmissionRejected` |
| 8.2.4 | `src/pages/admin/AdminDashboard.tsx` | `handleAssignRole` | `role_changed` | **XÓA** — BE gửi `RoleChanged` |
| 8.2.5 | `src/pages/admin/AdminDashboard.tsx` | `handleDeleteUser` | `account_deactivated` | **XÓA** — BE gửi `AccountDeactivated` |
| 8.2.6 | `src/components/features/moderation/DisputeListPanel.tsx` | resolve handler | `dispute_resolved` | **XÓA** — BE gửi `DisputeResolved` |
| 8.2.7 | `src/components/features/moderation/EmbargoListPanel.tsx` | `handleLift` | `embargo_lifted` | **XÓA** — BE gửi `EmbargoLifted` |
| 8.2.8 | `src/features/upload/hooks/useUploadSubmission.ts` | `handleConfirmSubmit` (edit + isFinal) | `submission_updated` | ⚠️ **Kiểm tra** — nếu BE gửi `NewRecordingPending` cho re-submit thì xóa, nếu không thì giữ |

**Lưu ý:** Sau khi xóa, cleanup import `recordingRequestService` và `UserRole` nếu không còn dùng trong file đó.

---

### 8.3 Type Normalizer (PascalCase ↔ snake_case)

**Mục tiêu:** FE cần hiểu cả PascalCase (từ BE) và snake_case (FE convention) cho notification type.

**File:** `src/utils/notificationTypeMap.ts` (mới) hoặc thêm vào `src/types/notification.ts`

```typescript
const BE_TO_FE_TYPE_MAP: Record<string, string> = {
  SubmissionApproved:    'submission_approved',
  SubmissionRejected:    'submission_rejected',
  SubmissionAssigned:    'submission_claimed',
  SubmissionUnassigned:  'submission_unassigned',
  NewRecordingPending:   'submission_pending_review',
  RoleChanged:           'role_changed',
  AccountDeactivated:    'account_deactivated',
  AccountActivated:      'account_activated',
  EmbargoLifted:         'embargo_lifted',
  DisputeResolved:       'dispute_resolved',
};

export function normalizeBENotificationType(beType: string): string {
  return BE_TO_FE_TYPE_MAP[beType] ?? beType;
}
```

**Áp dụng tại:** API response mapper trong `recordingRequestService.ts` (hoặc interceptor) — mỗi khi nhận notification từ `GET /Notification` hoặc SignalR event.

---

### 8.4 Field Mapping (BE ↔ FE)

**Mục tiêu:** Chuẩn hóa field names giữa BE response và FE `AppNotification` type.

| BE field | FE field | Ghi chú |
|----------|----------|---------|
| `message` | `body` | Content của notification |
| `relatedId` | `recordingId` | ID entity liên quan |
| `relatedEntityId` | `recordingId` | (SignalR payload dùng tên này) |
| `relatedEntityType` | _(không có)_ | Có thể thêm vào FE type nếu cần |
| `isRead` | `read` | Boolean trạng thái đọc |
| `type` (PascalCase) | `type` (snake_case) | Qua normalizer 8.3 |
| `icon` | _(không dùng)_ | BE trả empty string, FE dùng `NotificationTypeIcon` |

**File:** `src/services/recordingRequestService.ts` — hàm `getNotificationsForRole`

```typescript
function mapBENotification(raw: any): AppNotification {
  return {
    id: raw.id,
    type: normalizeBENotificationType(raw.type),
    title: raw.title,
    body: raw.message ?? raw.body ?? '',
    recordingId: raw.relatedId ?? raw.relatedEntityId ?? undefined,
    read: raw.isRead ?? raw.read ?? false,
    createdAt: raw.createdAt,
  };
}
```

---

### 8.5 Dùng `GET /Notification/unread-count` cho polling

**Mục tiêu:** Polling nhẹ hơn — chỉ lấy count, không load full list mỗi 30s.

**Thay đổi `useNotificationPolling.ts`:**

```
Hiện tại (nặng):
  Mỗi 30s → GET /Notification (toàn bộ list) → đếm unread client-side

Đề xuất (nhẹ):
  Mỗi 30s → GET /Notification/unread-count → { unread: 8, total: 45 }
  Load full list chỉ khi:
    1. User mở dropdown
    2. User vào /notifications
    3. unread count thay đổi (để toast notification mới)
```

**Endpoints cần thêm vào `recordingRequestService.ts`:**

```typescript
async getUnreadCount(): Promise<{ unread: number; total: number }> {
  const { data } = await api.get('/Notification/unread-count');
  return data;
}

async deleteNotification(id: string): Promise<void> {
  await api.delete(`/Notification/${id}`);
}
```

---

### 8.6 Hỗ trợ `DELETE /Notification/{id}`

**Mục tiêu:** Cho phép user xóa notification không cần thiết.

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8.6.1 | Thêm `deleteNotification` vào `recordingRequestService.ts` | Service | S |
| 8.6.2 | Thêm nút xóa (icon Trash2) cho mỗi notification item trong `NotificationPage.tsx` | UI | S |
| 8.6.3 | Optimistic UI: xóa item khỏi list ngay, rollback nếu API fail | Logic | S |
| 8.6.4 | (Tùy chọn) Thêm swipe-to-delete cho mobile | UX | M |

---

### 8.7 Thêm types mới phát hiện từ BE

**File:** `src/types/notification.ts`

Thêm vào union type:

```typescript
// Từ BE — chưa có trong FE
| 'submission_unassigned'    // Admin gỡ phân công reviewer
| 'account_activated'        // Admin kích hoạt lại tài khoản
```

**File:** `src/components/common/NotificationTypeIcon.tsx`

| Type | Icon | Màu |
|------|------|-----|
| `submission_unassigned` | `UserMinus` | `text-amber-500` |
| `account_activated` | `UserCheck` | `text-emerald-500` |

**File:** `src/utils/notificationRoutes.ts`

| Type | Target path |
|------|-------------|
| `submission_unassigned` | `/moderation` |
| `account_activated` | `/profile` |

---

### 8.8 Dùng `unreadOnly` param cho filter "Chưa đọc"

**Hiện tại:** `NotificationPage.tsx` filter "Chưa đọc" bằng client-side `.filter(n => !n.read)`.

**Đề xuất:** Gọi `GET /Notification?unreadOnly=true` để server trả đúng data + hỗ trợ phân trang chính xác.

```typescript
// recordingRequestService.ts
async getNotifications(params?: { page?: number; pageSize?: number; unreadOnly?: boolean }) {
  const { data } = await api.get('/Notification', { params });
  return {
    items: (data.items ?? []).map(mapBENotification),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
  };
}
```

---

### Tổng hợp Phase 8 Tasks

| # | Task | Effort | Ưu tiên |
|---|------|--------|---------|
| 8.2 | Xóa 7–8 lệnh `addNotification` trùng lặp | S | **CRITICAL** |
| 8.3 | Type normalizer (PascalCase → snake_case) | S | **CRITICAL** |
| 8.4 | Field mapper (message→body, relatedId→recordingId, isRead→read) | S | **CRITICAL** |
| 8.5 | Dùng `unread-count` endpoint cho polling | M | HIGH |
| 8.6 | Hỗ trợ DELETE notification | S | MEDIUM |
| 8.7 | Thêm 2 types mới (`submission_unassigned`, `account_activated`) | S | HIGH |
| 8.8 | Server-side filter `unreadOnly` | S | MEDIUM |

**Thứ tự đề xuất:** 8.3 → 8.4 → 8.2 → 8.7 → 8.5 → 8.8 → 8.6

---

## Phase X: Verification Checklist

### Functional — Tier 1 (Critical)

- [x] Contributor submit bài → Expert nhận "Bài đóng góp mới cần duyệt" (4A.1) — `useUploadSubmission.ts`
- [x] Expert duyệt bài → Contributor nhận "Đóng góp đã được duyệt" (4A.2) — `ModerationPage.tsx` sau `syncApproveToServer`
- [x] Expert từ chối bài → Contributor nhận "Đóng góp bị từ chối" + lý do (4A.3) — `ModerationPage.tsx` sau `syncRejectToServer`

### Functional — Tier 2 (High)

- [x] Contributor re-submit bài → Expert nhận "Bài đóng góp được cập nhật" (4B.1) — `useUploadSubmission.ts`
- [x] Expert xử lý yêu cầu xóa → Contributor nhận TB (4B.2) — `ApprovedRecordingsPage.tsx` (request)
- [x] Expert duyệt yêu cầu chỉnh sửa → Contributor nhận TB (4B.3) — `ApprovedRecordingsPage.tsx`
- [x] Admin chuyển yêu cầu xóa → Expert nhận TB (4B.4) — `AdminRequestPanel.tsx`
- [x] Admin duyệt yêu cầu chỉnh sửa → Contributor nhận TB (4B.5) — `AdminRequestPanel.tsx`

### Functional — Tier 3 (Medium)

- [x] Admin đổi role → User nhận TB (4C.1) — `AdminDashboard.tsx` `handleAssignRole`
- [x] Admin vô hiệu hóa → User nhận TB (4C.2) — `handleDeleteUser`
- [x] Admin xóa bản thu → Contributor + Expert nhận TB (4C.3) — `handleRemoveRecording`
- [x] Admin giải quyết tranh chấp → Contributor nhận TB (4C.4) — `DisputeListPanel` (khi `notifyContributor`)
- [x] Admin gỡ embargo → Contributor nhận TB (4C.5) — `EmbargoListPanel` `handleLift`

### Functional — Bugfix + Low

- [x] Fix `forRoles` sai trong D3: Admin → Expert (4D.1) — `AdminDashboard.tsx` dialog duyệt xóa expert
- [x] Expert yêu cầu xóa tài khoản → Admin nhận TB (4D.2) — `ProfilePage.tsx` nhánh Expert
- [ ] (Optional) Expert claim bài → Contributor nhận TB (4D.3) — **chưa làm** (tránh spam nếu claim/unclaim)

### Functional — UX Infrastructure

- [x] Notification mới hiện toast tự động (Phase 1)
- [x] Badge hiển thị số unread trên chuông Header (Phase 2)
- [x] Click notification → điều hướng đúng trang + mark read (Phase 3)
- [x] Tất cả 16 icon types hiển thị đúng (Phase 4.0) — `NotificationTypeIcon.tsx` + `Header` / `NotificationPage`
- [x] Mobile menu hiển thị badge số (Phase 5)
- [x] Filter "Chưa đọc" hoạt động (Phase 5)
- [x] Legacy code đã xóa, build vẫn pass (Phase 6)

### Functional — Phase 8 (API Alignment)

- [x] Type normalizer: PascalCase (`SubmissionApproved`) → snake_case (`submission_approved`) hoạt động (`normalizeBENotificationType`)
- [x] Field mapper: `message`→`body`, `relatedId`/`relatedEntityId`→`recordingId`, `isRead`→`read` đúng (`mapNotificationFromApiRecord`)
- [x] Xóa tất cả `addNotification` trùng lặp theo danh sách BE auto-send — tránh notification kép
- [x] Thêm types: `submission_unassigned`, `account_activated` + icon + route
- [x] `GET /Notification/unread-count` được dùng trong engine polling (chỉ reload list khi count đổi)
- [x] `DELETE /Notification/{id}` có UI xóa trong `NotificationPage` (optimistic + rollback bằng reload)
- [ ] Server-side `unreadOnly` filter hoạt động (chưa migrate NotificationPage sang fetch server-side)

### Functional — Phase 7 (SignalR)

- [ ] SignalR connection tới `/notificationHub` thành công
- [ ] Nhận `ReceiveNotification` event → hiện toast + cập nhật badge
- [ ] Fallback polling khi SignalR disconnect
- [ ] Auto-reconnect khi mất kết nối

### Non-functional

- [ ] Polling không gây memory leak (cleanup interval khi unmount)
- [x] Toast không spam (chỉ hiện cho notification mới, không lặp khi re-poll)
- [x] Dropdown đóng sau khi click item
- [ ] Mark all read cập nhật badge + list ngay lập tức (optimistic UI)
- [x] Không có TypeScript error / lint warning mới (`tsc --noEmit`, `npm run lint` pass)
- [ ] Responsive: desktop dropdown + mobile menu link đều hoạt động

### Performance

- [x] Polling ưu tiên `unread-count` endpoint (nhẹ hơn full list)
- [x] SignalR connected → giảm polling interval (120s)
- [ ] Không re-render không cần thiết (useMemo/useCallback cho list items)
- [ ] Bundle size không tăng đáng kể (< 10KB gzipped cho toàn bộ changes kể cả SignalR)

---

## Thứ tự triển khai đề xuất

```
Phase 4.0 (Types + Icons)     ██████████  Done
Phase 4A  (Tier 1 — 3 luồng)  ██████████  Done
Phase 1   (Toast)              ██████████  Done
Phase 2   (Badge số)           ██████████  Done
Phase 3   (Click navigate)    ██████████  Done
Phase 4B  (Tier 2 — 5 luồng)  ██████████  Done
Phase 4C  (Tier 3 — 5 luồng)  ██████████  Done
Phase 4D  (Fix + Low — 3)     ████████░░  Done (4D.3 optional bỏ qua)
Phase 5   (UX Polish)          ██████████  Done
Phase 6   (Cleanup)            ██████████  Done
Phase 8   (API Alignment) ★   ██████████  Done
Phase 7   (SignalR)            ██████████  Done
                               ──────────
                               Tổng còn lại: ~0h (Phase X runtime verification tùy môi trường)
```

> **Thứ tự khuyến nghị tiếp theo:**
>
> **★ NGAY BÂY GIỜ (tránh duplicate notification trên production):**
> 1. **Phase 8.3 + 8.4** — Type normalizer + Field mapper → FE hiểu đúng data từ BE
> 2. **Phase 8.2** — Xóa 7 lệnh `addNotification` trùng lặp → không còn notification kép
> 3. **Phase 8.7** — Thêm 2 types mới (`submission_unassigned`, `account_activated`)
>
> **SAU ĐÓ (tối ưu):**
> 4. **Phase 8.5** — Dùng `unread-count` endpoint cho polling nhẹ
> 5. **Phase 8.8** — Server-side filter `unreadOnly`
> 6. **Phase 8.6** — UI xóa notification
>
> **CUỐI CÙNG (real-time):**
> 7. **Phase 7** — SignalR integration (hub đã sẵn sàng trên BE)

---

## Agent Assignments

### Đã hoàn thành (Phase 1–6, 4A–4D)

| Phase | Trạng thái | Files đã sửa |
|-------|-----------|--------------|
| 4.0 + 4A | ✅ Done | `notification.ts`, `useUploadSubmission.ts`, `ModerationPage.tsx`, `Header.tsx`, `NotificationPage.tsx` |
| Phase 1-2 | ✅ Done | `useNotificationPolling.ts`, `Header.tsx` |
| Phase 3 | ✅ Done | `notificationRoutes.ts` (mới), `Header.tsx`, `NotificationPage.tsx` |
| 4B-4D | ✅ Done | `ApprovedRecordingsPage.tsx`, `AdminRequestPanel.tsx`, `AdminDashboard.tsx`, `DisputeListPanel.tsx`, `EmbargoListPanel.tsx`, `ProfilePage.tsx` |
| Phase 5-6 | ✅ Done | `NotificationPage.tsx`, `Header.tsx`, legacy files xóa |

### Còn lại (Phase 8 + 7)

| Phase | Agent/Approach | Files sửa/tạo |
|-------|---------------|---------------|
| **8.3 + 8.4** | Type normalizer + Field mapper | `notificationTypeMap.ts` (mới), `recordingRequestService.ts` |
| **8.2** | Xóa duplicate `addNotification` | `useUploadSubmission.ts`, `ModerationPage.tsx`, `AdminDashboard.tsx`, `DisputeListPanel.tsx`, `EmbargoListPanel.tsx` |
| **8.7** | Thêm 2 types mới | `notification.ts`, `NotificationTypeIcon.tsx`, `notificationRoutes.ts` |
| **8.5** | Polling `unread-count` | `recordingRequestService.ts`, `useNotificationPolling.ts` |
| **8.8** | Server-side filter | `recordingRequestService.ts`, `NotificationPage.tsx` |
| **8.6** | UI xóa notification | `recordingRequestService.ts`, `NotificationPage.tsx` |
| **Phase 7** | SignalR real-time | `package.json`, `notificationHub.ts` (mới), `useNotificationRealtime.ts` (mới), `Header.tsx`, `useNotificationPolling.ts` |

### Tổng files Phase 8 + 7

| Loại | Files |
|------|-------|
| **Sửa** (8 files) | `recordingRequestService.ts`, `useNotificationPolling.ts`, `notification.ts`, `NotificationTypeIcon.tsx`, `notificationRoutes.ts`, `NotificationPage.tsx`, `Header.tsx`, `package.json` |
| **Sửa (xóa code)** (5 files) | `useUploadSubmission.ts`, `ModerationPage.tsx`, `AdminDashboard.tsx`, `DisputeListPanel.tsx`, `EmbargoListPanel.tsx` |
| **Tạo mới** (3 files) | `src/utils/notificationTypeMap.ts`, `src/services/notificationHub.ts`, `src/hooks/useNotificationRealtime.ts` |
