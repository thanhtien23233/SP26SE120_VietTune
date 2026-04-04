# Plan: Expert role — API fit (VietTune Archive API)

## Overview

**What:** Rà soát toàn bộ contract OpenAPI **VietTuneArchive v1** (nguồn: [Swagger UI](https://viettunearchiveapi-fufkgcayeydnhdeq.japanwest-01.azurewebsites.net/Swagger/index.html) → `GET …/swagger/v1/swagger.json`, đối chiếu repo `swagger.txt`) và gắn từng nhóm endpoint với **luồng Chuyên gia** trong [`docs/PLAN-expert-workflow.md`](./PLAN-expert-workflow.md) (queue → claim → review → quyết định → ghi chú; Phase 1 local / Phase 2 API).

**Why:** Team cần danh sách endpoint “đúng nghiệp vụ Expert” để Phase 2 không đoán mò; đồng thời tách rõ **phù hợp domain**, **chỉ hợp lý nếu backend cấp quyền Expert**, và **không thuộc epic moderation**.

## Socratic gate (đã đóng)

- Yêu cầu đủ rõ: map Swagger ↔ role Expert theo plan hiện có.
- Giả định có ghi rõ dưới đây; nếu sai cần chỉnh với backend.

## Project type

**WEB** + **REST consumer** (không viết code trong plan mode). Agent chính khi implement: `frontend-specialist` + `backend-specialist` cho xác nhận RBAC.

## Success criteria

1. Mỗi endpoint trong các tag trọng yếu được xếp loại **Expert-core / Expert-conditional / Supporting read / Admin-only / Out-of-scope / Không phù hợp**.
2. Liên kết được với task **T1–T4** trong `PLAN-expert-workflow.md` (queue, assign, persist, notifications/audit).
3. Ghi nhận **lệch OpenAPI ↔ code hiện tại** (ví dụ `PUT /api/Recording/{id}` không có trong spec; `POST /api/Notification` không có trong spec).

## Rủi ro & giả định (bắt buộc đọc)

| Điểm | Ghi chú |
|------|--------|
| **RBAC** | Swagger **không** mô tả `[Authorize(Roles=…)]`. Nhãn “Expert” ở đây = *phù hợp nghiệp vụ moderation/review*, không đảm bảo token Expert gọi được. |
| **Admin tag** | Đường dẫn `/api/Admin/*` thường là Admin; chỉ liệt kê **conditional** nếu product quyết định mở cho Expert (ví dụ assign). |
| **Annotations** | Theo Q2 plan gốc: **milestone riêng**, không blocker epic moderation. |

## Nguồn dữ liệu

- OpenAPI 3.0.1, `info.title`: VietTuneArchive, `version`: v1.
- File tham chiếu repo: `swagger.txt` (snapshot; nên refresh khi backend đổi).

---

## 1. Ma trận: API phù hợp role Expert (theo epic moderation)

Chú thích cột **Fit**: **Y** = core/supporting cho expert trong phạm vi epic; **C** = chỉ hợp lý nếu backend cho phép hoặc dùng thay thế Admin; **N** = không coi là luồng expert tiêu chuẩn; **Later** = milestone Annotations / KB (plan đã tách).

### 1.1 Auth

| Method | Path | Fit | Ghi chú (vs PLAN-expert-workflow) |
|--------|------|-----|-----------------------------------|
| POST | `/api/Auth/login` | Y | Bắt buộc để có Bearer cho mọi call. |
| POST | `/api/Auth/register-contributor` | N | Contributor. |
| POST | `/api/Auth/register-researcher` | N | Researcher. |
| … | các endpoint confirm-email, forgot-password, reset-password | N | Self-service account, không cốt lõi moderation. |

### 1.2 Submission (trọng tâm queue + chi tiết + xóa)

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/Submission/get-by-status` | Y | Ứng viên **hàng chờ** theo `SubmissionStatus` + `page`/`pageSize`. Phase 2 queue (T2/T3). Response 200 trong spec **không** có schema — cần sample thực tế. |
| GET | `/api/Submission/get-all` | C | Toàn bộ submission; thường cần quyền rộng — xác nhận có cho Expert hay chỉ Admin. |
| GET | `/api/Submission/my` | C | Theo T1 map: semantic *của tôi*, không phải queue hệ thống; vẫn có thể dùng trong edge case. |
| GET | `/api/Submission/{id}` | Y | Chi tiết submission đang duyệt (nếu 403/404 thì flow gãy — cần test). |
| DELETE | `/api/Submission/{id}` | Y | Xóa submission (đã ghi trong EXPERT-WORKFLOW-API-MAP). |
| PUT | `/api/Submission/approve-submission` | Y | Tham số query `submissionId` — ứng viên **approve** server-side (bổ sung/alternative cho persist qua Recording). |
| PUT | `/api/Submission/reject-submission` | Y | Tương tự cho **reject**. |
| PUT | `/api/Submission/confirm-submit-submission` | N | Luồng contributor xác nhận nộp. |
| PUT | `/api/Submission/edit-request-submission`, `confirm-edit-submission` | N/C | Chủ yếu contributor/edit workflow; Expert chỉ liên quan gián tiếp. |
| POST | `/api/Submission/create-submission` | C | Contributor tạo mới; Expert hiện có thể gọi fallback trong code — không phải hành vi moderation tiêu chuẩn. |

### 1.3 Admin (chỉ phần chạm moderation)

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/Admin/submissions` | C | Hàng chờ kiểu admin + filter `status`, `reviewer`. **Rất phù hợp** Phase 2 nếu policy cho Expert (T3). |
| POST | `/api/Admin/submissions/{id}/assign` | C | **Claim/assign** server-side (T3). Cần `AssignReviewerRequest` + quyền. |
| GET | `/api/Admin/audit-logs` | C | Oversight; thường Admin. Expert chỉ nếu product mở read-only. |
| GET/PUT | `/api/Admin/users`, `…/{id}`, `…/role`, `…/status` | N | Quản trị user. |
| GET | `/api/Admin/system-health` | N | Vận hành. |
| GET/PUT/POST/DELETE | `/api/Admin/reference-data/...` | N | Quản trị reference data. |

### 1.4 Review (song song với moderation — service layer đã có stub)

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/Review` | Y | Danh sách phân trang. |
| POST | `/api/Review` | Y | Tạo bản ghi review. |
| GET/PUT/DELETE | `/api/Review/{id}` | Y | Đọc/cập nhật/xóa review. |
| GET | `/api/Review/submission/{submissionId}` | Y | Gắn submission ↔ review. |
| GET | `/api/Review/reviewer/{reviewerId}` | Y | Việc theo expert. |
| GET | `/api/Review/decision/{decision}` | Y | Lọc theo quyết định. |
| GET | `/api/Review/stage/{stage}` | Y | Lọc theo giai đoạn. |
| GET | `/api/Review/recent` | Y | Tiện dashboard/tab phụ. |
| GET | `/api/Review/pending-count` | Y | Badge / tải queue meta. |

### 1.5 Recording & RecordingImage

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/Recording`, `/api/Recording/{id}`, `/api/Recording/search-by-title` | Y | Đọc metadata bản thu khi duyệt. |
| PUT | `/api/Recording/{id}/upload` | C | Body `RecordingDto` — **ứng viên cập nhật metadata**; T1 map đề cập `PUT /api/Recording/{id}` nhưng **trong OpenAPI snapshot không có** `PUT` trực tiếp trên `{id}` (chỉ `GET`). Cần thống nhất contract với backend. |
| GET/POST | `/api/RecordingImage`, `/api/RecordingImage/{id}` | C | Ảnh minh hoạ bản thu — hữu ích nếu UI expert hiển thị. |

### 1.6 Media (file âm thanh / stream)

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/Media/submissions/{submissionId}/files` | Y | Liệt kê file của submission. |
| POST | `/api/Media/submissions/{submissionId}/files` | C | Upload — thường contributor; Expert ít khi cần. |
| GET | `/api/Media/{mediaFileId}` | Y | Chi tiết file. |
| DELETE | `/api/Media/{mediaFileId}` | C | Chỉ nếu policy cho expert xóa file. |
| PUT | `/api/Media/{mediaFileId}/set-primary` | C | Đặt file chính — có thể là thao tác moderation. |
| GET | `/api/Media/{mediaFileId}/stream`, `/download`, `/thumbnail` | Y | Nghe/xem trong UI duyệt. |

### 1.7 AIAnalysis (tab / bước hỗ trợ AI trên ModerationPage)

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| POST | `/api/AIAnalysis/media/{mediaFileId}/analyze` | Y | Gợi ý phân tích. |
| GET | `/api/AIAnalysis/media/{mediaFileId}/result`, `/status` | Y | Đọc kết quả / trạng thái. |
| POST | `/api/AIAnalysis/media/{mediaFileId}/transcribe` | Y | Transcribe. |
| POST | `/api/AIAnalysis/suggest-metadata` | Y | Gợi ý metadata khi expert chỉnh. |

### 1.8 AudioAnalysisResult

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET/POST/PUT/DELETE | `/api/AudioAnalysisResult`, `/api/AudioAnalysisResult/{id}` | C | Hữu ích nếu UI hiển thị lịch sử phân tích âm thanh chi tiết; không bắt buộc epic cốt lõi. |

### 1.9 Notification

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/Notification` | Y | Hộp thông báo expert. |
| GET | `/api/Notification/unread-count` | Y | Badge. |
| PUT | `/api/Notification/{id}/read`, `/api/Notification/read-all` | Y | Đánh dấu đã đọc. |
| DELETE | `/api/Notification/{id}` | Y | Xóa thông báo. |
| *Thiếu trong spec* | `POST` tạo notification | Gap | T1 map nhắc `POST /api/Notification` khi expert xóa submission — **OpenAPI snapshot không có**; cần xác nhận endpoint thực tế hoặc server-side only. |

### 1.10 AuditLog (T5 notes / audit)

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/AuditLog`, GET `/api/AuditLog/{id}` | C | Đọc nhật ký nếu được cấp quyền. |
| POST/PUT/DELETE | `/api/AuditLog` … | C | Ghi audit từ client là hiếm; thường server ghi — chỉ dùng nếu backend thiết kế vậy. |

### 1.11 ReferenceData (đọc — form moderation)

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/ReferenceData/ethnic-groups`, `provinces`, `ceremonies`, `vocal-styles`, `musical-scales`, `tags` (+ search) | Y | Dropdown/lọc trong UI. |
| GET | `/api/EthnicGroup`, `/api/District`, `/api/Commune`, `/api/Instrument`, `/api/Ceremony`, `/api/MusicalScale` (+ CRUD paths) | Y/N | **GET** = supporting; **POST/PUT/DELETE** = quản trị nội dung, không phải vai trò expert tiêu chuẩn (trừ khi product cho phép expert sửa master data). |

### 1.12 Analytics

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/Analytics/experts` | C | Attribution expert — plan mục observability; thường Admin dashboard. |
| GET | `/api/Analytics/overview`, `submissions`, `coverage`, `contributors`, `content` | N/C | Chủ yếu báo cáo; Expert không bắt buộc. |

### 1.13 Song, KnowledgeBase, KB*, QA*, Annotation

| Path prefix | Fit | Ghi chú |
|-------------|-----|--------|
| `/api/Song/*` | C | Discovery; không cốt lõi tab “Xem duyệt bản thu”. |
| `/api/KnowledgeBase/*`, `/api/KBEntry/*`, `/api/KBCitation/*`, `/api/KBRevision/*` | Later / N | Tab KB trong UI còn placeholder (T1 map). |
| `/api/QAConversation/*`, `/api/QAMessage/*` | Later | Tab AI response review hiện local-only; ứng viên tương lai. |
| `/api/Annotation/*`, `/api/Song/{songId}/annotations` | Later | Milestone Annotations (Q2). |

### 1.14 SubmissionVersion

| Method | Path | Fit | Ghi chú |
|--------|------|-----|--------|
| GET | `/api/SubmissionVersion`, `/{id}`, `/submission/{submissionId}`, `…/latest`, `…/all` | C | Hữu ích nếu expert cần lịch sử phiên bản submission. |

---

## 2. Tóm tắt “danh sách ngắn” — API nên ưu tiên cắm Phase 2 cho Expert

**Đọc queue / lọc**

- `GET /api/Submission/get-by-status`
- `GET /api/Admin/submissions` *(nếu được cấp quyền)*
- `GET /api/Review/pending-count`, `GET /api/Review/recent`, các GET lọc `decision` / `stage` / `reviewer`

**Chi tiết & tài nguyên**

- `GET /api/Submission/{id}`
- `GET /api/Recording/{id}` (và list/search khi cần)
- `GET /api/Media/submissions/{submissionId}/files` + stream/download/thumbnail
- `GET /api/ReferenceData/*` (và các GET master data liên quan form)

**Claim / assign**

- `POST /api/Admin/submissions/{id}/assign` *(conditional)*

**Quyết định / trạng thái**

- `PUT /api/Submission/approve-submission`, `PUT /api/Submission/reject-submission`
- `POST`/`PUT` `/api/Review` và `GET /api/Review/submission/{submissionId}` *(chọn một nguồn sự thật với backend)*
- `PUT /api/Recording/{id}/upload` *(metadata — thay thế cho `PUT /Recording/{id}` nếu đó là contract thật)*

**Xóa / thông báo**

- `DELETE /api/Submission/{id}`
- Notification: các `GET`/`PUT`/`DELETE` hiện có; làm rõ cách **tạo** thông báo cho contributor.

**Hỗ trợ AI trong màn duyệt**

- Toàn bộ `/api/AIAnalysis/*` liệt kê ở §1.7

---

## 3. Liên kết task PLAN-expert-workflow

| Task | Endpoint chính (từ ma trận trên) |
|------|----------------------------------|
| T1 | Đã có [`docs/EXPERT-WORKFLOW-API-MAP.md`](./EXPERT-WORKFLOW-API-MAP.md); bổ sung **gap OpenAPI**: không có `PUT /api/Recording/{id}`; không có `POST /api/Notification`. |
| T2 | Interface queue → ưu tiên implement mock trỏ tới shape của `get-by-status` / `Admin/submissions`. |
| T3 | `POST …/assign` + `GET …/Admin/submissions` hoặc queue đã filter. |
| T4 | Thống nhất một trong: `approve-submission` / `reject-submission` / `Review` / `Recording/{id}/upload`. |
| T5 | `AuditLog` read/post nếu policy cho phép; không bắt buộc Phase 1. |

---

## 4. Task breakdown (planning follow-up)

| task_id | name | agent | priority | dependencies | INPUT → OUTPUT → VERIFY |
|---------|------|-------|----------|--------------|-------------------------|
| E1 | Xác nhận RBAC từng nhóm path (Expert vs Admin) với backend | backend-specialist | P0 | — | Swagger list → bảng role → test 403 matrix trên staging |
| E2 | Chốt single source of truth cho approve/reject + metadata | backend-specialist + frontend-specialist | P0 | E1 | OpenAPI + DB model → ADR ngắn → một path được chọn |
| E3 | Cập nhật EXPERT-WORKFLOW-API-MAP nếu E2 đổi contract Recording/Notification | frontend-specialist | P1 | E2 | Diff OpenAPI → doc cập nhật → review |

---

## 5. Phase X (verification cho deliverable plan này)

- [ ] So sánh lại `swagger.txt` với `…/swagger/v1/swagger.json` trên Azure sau mỗi release backend.
- [ ] Hoàn thành E1–E2 trước khi merge Phase 2 adapter.
- [ ] `npm run build` / app smoke: nằm trong PLAN gốc expert workflow.

---

## 6. File output

- **Plan file:** `docs/PLAN-expert-role-apis.md` (slug: `expert-role-apis`).

---

*Kế hoạch này tuân thủ workflow `/plan`: chỉ tài liệu, không chỉnh sửa mã nguồn ứng dụng.*
