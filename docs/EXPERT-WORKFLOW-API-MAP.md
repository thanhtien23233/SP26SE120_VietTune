# T1 — Expert workflow ↔ API contracts (VietTune)

**Scope:** Luồng Chuyên gia trên `/moderation` (`ModerationPage.tsx`), không gồm milestone **Annotations** (xem `PLAN-expert-workflow.md`).  
**Nguồn:** `swagger_summary.txt`, `src/pages/ModerationPage.tsx`, `src/services/recordingStorage.ts`, `src/services/recordingRequestService.ts`, `src/services/storageService.ts`.

---

## 1. Tóm tắt rủi ro (P0)

| Vấn đề | Mô tả |
|--------|--------|
| **Queue sai nguồn** | Expert đang load danh sách qua `getLocalRecordingMetaList()` → **`GET /api/Submission/my`**. Endpoint này theo ngữ nghĩa là *submission của user đăng nhập*, không phải *hàng chờ kiểm duyệt toàn hệ thống*. Trừ khi backend định nghĩa đặc biệt cho role Expert, **hàng chờ thực tế có thể trống hoặc sai**. |
| **Ghi trạng thái kiểm duyệt** | `saveItems` → `setLocalRecording` → **`PUT /api/Recording/{id}`** với object kiểu `LocalRecording` (gồm `moderation`, `claimedBy`, …). Cần xác nhận backend **Recording** có nhận đủ field moderation hay chỉ metadata bản thu; nếu không, claim/approve/reject **không bền vững** sau refresh. |
| **Claim đa chuyên gia** | `claimedBy` / `IN_REVIEW` hiện chủ yếu **client-side** sau khi merge response map từ Submission. Không thấy gọi **`POST /api/Admin/submissions/{id}/assign`** trong `ModerationPage` → không có khóa phía server cho claim. |

---

## 2. Ma trận: hành động UI → triển khai hiện tại → API (Swagger) → khoảng trống

Base URL client: `API_BASE_URL` + path dưới đây (Swagger có tiền tố `/api`).

### 2.1 Tab **Xem duyệt bản thu** (queue + chi tiết + quyết định)

| UI / hành động | Code hiện tại | Endpoint / cơ chế | Payload / query (ước lượng) | Ghi chú & gap |
|----------------|---------------|-------------------|-----------------------------|---------------|
| Load hàng chờ (meta list) | `load()` → `getLocalRecordingMetaList()` | **`GET /api/Submission/my`** | Bearer token | **GAP:** Cần endpoint hàng chờ expert: ứng viên **`GET /api/Admin/submissions`**, **`GET /api/Submission/get-by-status`**, **`GET /api/Submission/get-all`** (tuỳ quyền & filter). Map response → `moderation.status`, `claimedBy`, … |
| Refresh định kỳ | `setInterval(load, 3000)` | Như trên | — | Poll OK; cần nguồn dữ liệu đúng. |
| Xem chi tiết bản thu đã chọn | `getLocalRecordingFull(selectedId)` | **`GET /api/Submission/{id}`** | — | Hợp lý nếu expert được authorize đọc submission người khác. **Cần xác nhận 403/404** trên môi trường thật. |
| Claim (bắt đầu kiểm duyệt) | `claim` → `saveItems` | `setLocalRecording` → **`PUT /api/Recording/{id}`** (fallback **`POST /api/Submission/create-submission`**) | Body: merged `LocalRecording` (kèm `moderation`) | **GAP lớn:** Không dùng **`POST /api/Admin/submissions/{id}/assign`**. PUT Recording có thể không map 1-1 với Submission ID. |
| Bước verification (lưu tiến độ) | `prev/nextVerificationStep`, form | `saveItems` → `PUT /api/Recording/{id}` | `moderation.verificationStep`, `verificationData` | Phụ thuộc Recording API chấp nhận JSON lồng nhau. |
| Unclaim | `handleConfirmUnclaim` → `saveItems` | Như trên | `PENDING_REVIEW`, xóa `claimedBy` | Cần tương đương server (unassign) khi Phase 2. |
| Approve (sau bước 3) | `handleConfirmApprove` → `saveItems` | Như trên | `moderation.status = APPROVED`, `reviewerId`, … | Có thể cần **`PUT /api/Submission/{id}`** hoặc domain **Review** nếu backend tách workflow. |
| Reject (tạm / vĩnh viễn) | `reject` → `saveItems` | Như trên | `REJECTED` / `TEMPORARILY_REJECTED`, `rejectionNote` | Tương tự approve — xác nhận contract Submission/Review. |
| Xóa bản thu (expert) | `handleConfirmDelete` | **`DELETE /api/Submission/{id}`** + `recordingRequestService.addNotification` | DELETE: path `id`; POST Notification: `type`, `title`, `body`, `forRoles`, `recordingId` | **Đã tách rõ API.** Notification: **`POST /api/Notification`**. |

### 2.2 Tab **Giám sát phản hồi của AI**

| UI / hành động | Code hiện tại | Endpoint | Gap |
|----------------|---------------|----------|-----|
| Load danh sách phản hồi AI | `getItemAsync(AI_RESPONSES_REVIEW_KEY)` | **Không có API** — lưu qua `storageService` | **Local-only** (`EXPERT-WORKFLOW-API-MAP`: không map Swagger). Phase sau có thể dùng **`/api/QAConversation`**, **`/api/QAMessage`**, hoặc endpoint nội bộ riêng. |
| Gắn cờ / ghi chú | `setItem(AI_RESPONSES_REVIEW_KEY, …)` | Như trên | Cùng gap. |

### 2.3 Tab **Kho tri thức**

| UI / hành động | Code hiện tại | Endpoint (Swagger) | Ghi chú |
|----------------|---------------|--------------------|---------|
| Nội dung tab | Placeholder (copy + icon), **không gọi API** | Ứng viên sau này: **`/api/KnowledgeBase/*`**, **`/api/KBEntry/*`**, … | **GAP:** Chưa có luồng expert ↔ KB trong code. |

### 2.4 Dịch vụ liên quan expert (đã có trong `recordingRequestService`, **ít dùng trực tiếp** trên `ModerationPage`)

Các luồng sau **đã gắn REST** và hữu ích cho Phase 2 hoặc tab mở rộng:

| Mục đích | Methods | Endpoints (từ code) |
|----------|---------|---------------------|
| Yêu cầu xóa / chuyển expert / hoàn tất xóa | `post`, `get`, `put`, `delete` | **`/api/Review`**, **`/api/Review/{id}`**, **`/api/Review/decision/*`**, **`/api/Review/reviewer/{id}`** |
| Yêu cầu sửa / duyệt sửa | Tương tự | **`/api/Review/*`** |
| Thông báo | `addNotification`, … | **`/api/Notification`**, **`/api/Notification/{id}/read`**, **`/api/Notification/read-all`** |

`ModerationPage` hiện gọi trực tiếp **`recordingRequestService.addNotification`** khi expert xóa submission (mục 2.1).

---

## 3. Endpoint Swagger “ứng viên” cho Phase 2 (không triển khai trong T1)

| Mục tiêu | Endpoint |
|----------|----------|
| Hàng chờ admin / assign | **`GET /api/Admin/submissions`**, **`POST /api/Admin/submissions/{id}/assign`** |
| Lọc submission theo trạng thái | **`GET /api/Submission/get-by-status`** (query: theo contract backend) |
| Toàn bộ submission (nếu được phép) | **`GET /api/Submission/get-all`** |
| Ghi nhận quyết định kiểu review | **`POST/PUT /api/Review`**, **`GET /api/Review/submission/{submissionId}`**, **`GET /api/Review/pending-count`** |
| Ghi metadata bản thu | **`PUT /api/Recording/{id}`** (nếu chỉ metadata) hoặc **`PUT /api/Submission/{id}`** (nếu submission là aggregate) — **cần OpenAPI chi tiết** |
| Media | **`GET/POST ... /api/Media/submissions/{submissionId}/files`**, stream/download |
| Analytics expert | **`GET /api/Analytics/experts`** |
| Audit | **`GET /api/Admin/audit-logs`** |

**Annotations (milestone riêng):** **`/api/Annotation/*`**, **`GET /api/Song/{songId}/annotations`** — không blocker epic moderation.

---

## 4. Gợi ý adapter (Phase 2, sau khi chốt UX)

Tách interface ví dụ:

- `listModerationQueue(expertContext)` → thay thế nguồn `Submission/my` bằng `Admin/submissions` hoặc `Submission/get-by-status`.
- `getSubmissionDetail(id)` → giữ `GET /Submission/{id}` nếu đủ quyền.
- `assignSubmission(id, expertId)` → `POST /Admin/submissions/{id}/assign`.
- `updateModerationState(id, patch)` → một endpoint **một nguồn sự thật** (Submission vs Review vs Recording) sau khi đọc schema thật từ OpenAPI.

---

## 5. VERIFY (theo PLAN T1)

| Hành động tới hạn của expert | Đã gán “API” / “local” / “gap”? |
|------------------------------|----------------------------------|
| Xem queue | API gọi có (**Submission/my**) nhưng **semantic gap** → ghi trong mục 1 & 2.1 |
| Claim / unclaim / approve / reject | Ghi qua **PUT Recording** → **contract gap** |
| Xóa + thông báo | **API rõ** (DELETE Submission + POST Notification) |
| AI review tab | **explicitly local** |
| Assign server-side | **Chưa dùng** → gap Phase 2 |

---

## 6. Bước tiếp theo (T2)

1. Xác nhận với backend: submission id dùng cho **Recording** PUT có trùng **`Submission/{id}`** không.  
2. Chốt endpoint **một** cho queue expert.  
3. Implement **interface** + implementation hiện tại (giữ behavior) trước khi đổi sang Admin/assign.

---

*Tài liệu này là deliverable của **T1 — Map expert workflow to API contracts** (`docs/PLAN-expert-workflow.md`).*
