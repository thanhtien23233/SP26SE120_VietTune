# PLAN — Migrate legacy axios services

> **Mục tiêu:** Xác định chính xác các chỗ còn dùng axios client cũ (`api.get/post/put/delete`) trong `src/services/*`, sau đó migrate theo batch sang `apiFetch` (OpenAPI) một cách tuần tự, ưu tiên nhóm đơn giản trước.

| Key | Value |
|---|---|
| Cập nhật | 2026-04-16 |
| Scope | `src/services/**` |
| “Cách cũ” | Import `api` (axios) từ `@/services/api` và gọi `api.get/post/put/delete` |
| “Cách mới” | `apiFetch.(GET|POST|PUT|DELETE)` + `apiOk(...)` + generated types từ `@/api` |

---

## Socratic Gate (câu hỏi làm rõ)

1. Bạn muốn **ưu tiên làm Inventory (liệt kê dòng) trước** hay **migrate ngay nhóm đơn giản** trước?
2. Mục tiêu cuối: **bỏ axios trong services = 0 file** hay chấp nhận còn axios ở những endpoint **không có schema/không có trong Swagger**?

> **Mặc định nếu chưa trả lời:** làm Inventory trước để có checklist rõ ràng, sau đó migrate nhóm đơn giản (instrument/ethnicity/performer), rồi migrate phần còn lại theo batch.

---

## Phase 0 — Definitions & Rules of the Road

### Định nghĩa “legacy usage”

- Bất kỳ đoạn code có dạng:
  - `import api from '@/services/api'` (hoặc tương đương) và gọi:
    - `api.get(...)`, `api.post(...)`, `api.put(...)`, `api.delete(...)`

### Nguyên tắc migrate

- **Không thay đổi hành vi runtime** trừ khi cần để match spec.
- Ưu tiên migrate endpoint **có trong Swagger** và có schema tương đối đầy đủ.
- Với endpoint **không có/thiếu schema**:
  - Tạm giữ axios hoặc dùng “escape hatch” có kiểm soát (cast tối thiểu).

---

## Phase 1 — Inventory: Liệt kê chính xác từng dòng còn `api.get/post/...`

### Output kỳ vọng

- Một bảng “Inventory” theo format:
  - `filePath:line` → `api.<method>(...)` (kèm 1 dòng context nếu cần)
- Gắn nhãn:
  - **MIGRATE**: endpoint có trong Swagger, migrate sang `apiFetch`.
  - **HOLD**: endpoint thiếu/không có trong Swagger, giữ tạm.

### Cách làm (lệnh tìm kiếm)

- Quét gọi axios:
  - `rg -n "\\bapi\\.(get|post|put|delete)\\b" src/services`
- Quét import axios client:
  - `rg -n "from ['\\\"]@/services/api['\\\"]|import\\s+api\\s+from" src/services`

### Deliverables

- [x] Dán full inventory (file + line) vào plan để làm checklist migrate.

### Inventory hiện tại (2026-04-16)

> Format: `file:line` — `call` — **MIGRATE/HOLD** (+ ghi chú)

- `src/services/recordingStorage.ts:40` — `api.get('/Submission/my', ...)` — **MIGRATE** (DONE: đã chuyển sang `apiFetch.GET('/api/Submission/my')`)
- `src/services/recordingStorage.ts:53` — `api.get('/Submission/my', ...)` — **MIGRATE**
- `src/services/recordingStorage.ts:63` — `api.get(\`/Submission/${id}\`)` — **MIGRATE**
- `src/services/recordingStorage.ts:78` — `api.put(\`/Recording/${recording.id}/upload\`)` — **MIGRATE**
- `src/services/recordingStorage.ts:94` — `api.post('/Submission/create-submission', ...)` — **MIGRATE**
- `src/services/recordingStorage.ts:102` — `api.delete(\`/Submission/${id}\`)` — **MIGRATE**

- `src/services/authService.ts:30` — `api.post('/auth/login', ...)` — **MIGRATE** (DONE: chuyển sang `apiFetch.POST('/api/Auth/login')` + escape-hatch do `content?: never`)
- `src/services/authService.ts:81` — `api.post('/auth/register', ...)` — **MIGRATE** (DONE: chuyển sang `apiFetch.POST('/api/Auth/register-contributor')` + escape-hatch do `content?: never`)
- `src/services/authService.ts:98` — `api.post('/auth/register-researcher', ...)` — **MIGRATE** (DONE: chuyển sang `apiFetch.POST('/api/Auth/register-researcher')` + escape-hatch do `content?: never`)
- `src/services/authService.ts:115` — `api.post('/auth/verify-otp', ...)` — **HOLD** (chưa xác nhận endpoint trong Swagger hiện tại)
- `src/services/authService.ts:130` — `api.get('/auth/confirm-email', ...)` — **MIGRATE** (DONE: chuyển sang `apiFetch.GET('/api/Auth/confirm-email')` + escape-hatch do `content?: never`)
- `src/services/authService.ts:150` — `api.get('/auth/me')` — **HOLD** (chưa thấy `/api/Auth/me` trong spec; cần BE bổ sung hoặc xác nhận endpoint)
- `src/services/authService.ts:155` — `api.put('/auth/profile', ...)` — **HOLD** (chưa thấy trong spec)
- `src/services/authService.ts:182` — `api.put('/auth/profile', ...)` — **HOLD**
- `src/services/authService.ts:220` — `api.post('/auth/change-password', ...)` — **HOLD** (chưa thấy trong spec)

- `src/services/researcherRecordingFilterSearch.ts:124` — `api.get('/Recording/search-by-filter', ...)` — **MIGRATE** (DONE: đã chuyển sang `apiFetch.GET('/api/Recording/search-by-filter')`)

- `src/services/annotationApi.ts:61` — `api.get(...)` — **MIGRATE** (DONE: chuyển sang `apiFetch.GET('/api/Song/{songId}/annotations')` — Swagger không có query pagination)

- `src/services/researcherArchiveService.ts:45` — `api.get('/Submission/get-by-status', ...)` — **MIGRATE** (DONE: đã chuyển sang `apiFetch.GET('/api/Submission/get-by-status')`)

- `src/services/adminApi.ts:72` — `api.get('/User/GetAll')` — **MIGRATE** (DONE: chuyển sang `apiFetch.GET('/api/User/GetAll')`)

- `src/services/recordingRequestService.ts:84` — `api.post('/Review', ...)` — **MIGRATE** (DONE: chuyển sang `/api/Review*` + escape-hatch do Swagger đang type sai `decision/stage` number vs string)
- `src/services/recordingRequestService.ts:100` — `api.get('/Review/decision/delete_request')` — **MIGRATE** (Swagger có `/api/Review/decision/{decision}`; cần map param)
- `src/services/recordingRequestService.ts:110` — `api.put(\`/Review/${requestId}\`, ...)` — **MIGRATE** (Swagger có `/api/Review/{id}`)
- `src/services/recordingRequestService.ts:123` — `api.get(\`/Review/reviewer/${expertId}\`)` — **MIGRATE** (Swagger có `/api/Review/reviewer/{reviewerId}`)
- `src/services/recordingRequestService.ts:147` — `api.get(\`/Review/${requestId}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:158` — `api.put(\`/Review/${requestId}\`, ...)` — **MIGRATE**
- `src/services/recordingRequestService.ts:170` — `api.delete(\`/Review/${requestId}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:179` — `api.get(\`/Review/reviewer/${contributorId}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:193` — `api.get(\`/Review/reviewer/${contributorId}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:207` — `api.post('/Review', ...)` — **MIGRATE**
- `src/services/recordingRequestService.ts:223` — `api.get('/Review/decision/delete_approved')` — **MIGRATE**
- `src/services/recordingRequestService.ts:227` — `api.delete(\`/Review/${match.id}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:244` — `api.post('/Review', ...)` — **MIGRATE**
- `src/services/recordingRequestService.ts:260` — `api.get('/Review/decision/edit_request')` — **MIGRATE**
- `src/services/recordingRequestService.ts:270` — `api.put(\`/Review/${requestId}\`, ...)` — **MIGRATE**
- `src/services/recordingRequestService.ts:282` — `api.get('/Review/decision/edit_approved')` — **MIGRATE**
- `src/services/recordingRequestService.ts:293` — `api.get(\`/Review/reviewer/${contributorId}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:307` — `api.get('/Review/decision/edit_approved')` — **MIGRATE**
- `src/services/recordingRequestService.ts:311` — `api.delete(\`/Review/${match.id}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:328` — `api.post('/Review', ...)` — **MIGRATE**
- `src/services/recordingRequestService.ts:343` — `api.get('/Review/decision/edit_submission')` — **MIGRATE**
- `src/services/recordingRequestService.ts:359` — `api.get(\`/Review/${submissionId}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:363` — `api.put(\`/Review/${submissionId}\`, ...)` — **MIGRATE**
- `src/services/recordingRequestService.ts:382` — `api.get(\`/Review/reviewer/${contributorId}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:397` — `api.post('/Notification', ...)` — **MIGRATE** (Swagger có `/api/Notification`)
- `src/services/recordingRequestService.ts:414` — `api.get('/Notification', ...)` — **MIGRATE**
- `src/services/recordingRequestService.ts:436` — `api.get('/Notification/unread-count')` — **MIGRATE**
- `src/services/recordingRequestService.ts:449` — `api.delete(\`/Notification/${id}\`)` — **MIGRATE**
- `src/services/recordingRequestService.ts:456` — `api.get('/Notification')` — **MIGRATE**
- `src/services/recordingRequestService.ts:466` — `api.put(\`/Notification/${id}/read\`, ...)` — **MIGRATE**
- `src/services/recordingRequestService.ts:476` — `api.put('/Notification/read-all', ...)` — **MIGRATE**

- `src/services/ethnicityService.ts:8` — `api.get('/ethnicities?...')` — **MIGRATE** (Swagger dùng `/api/EthnicGroup`)
- `src/services/ethnicityService.ts:13` — `api.get('/ethnicities/{id}')` — **MIGRATE** (Swagger dùng `/api/EthnicGroup/{id}`)
- `src/services/ethnicityService.ts:18` — `api.post('/ethnicities', ...)` — **MIGRATE** (Swagger dùng `/api/EthnicGroup`)
- `src/services/ethnicityService.ts:23` — `api.put('/ethnicities/{id}', ...)` — **MIGRATE** (Swagger dùng `/api/EthnicGroup/{id}`)
- `src/services/ethnicityService.ts:28` — `api.delete('/ethnicities/{id}')` — **MIGRATE** (Swagger dùng `/api/EthnicGroup/{id}`)

- `src/services/performerService.ts:8` — `api.get('/performers?...')` — **HOLD** (chưa có endpoint tương ứng trong Swagger hiện tại)
- `src/services/performerService.ts:13` — `api.get('/performers/{id}')` — **HOLD**
- `src/services/performerService.ts:18` — `api.get('/performers/search?...')` — **HOLD**
- `src/services/performerService.ts:23` — `api.post('/performers', ...)` — **HOLD**
- `src/services/performerService.ts:28` — `api.put('/performers/{id}', ...)` — **HOLD**
- `src/services/performerService.ts:33` — `api.delete('/performers/{id}')` — **HOLD**

- `src/services/instrumentService.ts:8` — `api.get('/instruments?...')` — **MIGRATE** (Swagger dùng `/api/Instrument`)
- `src/services/instrumentService.ts:13` — `api.get('/instruments/{id}')` — **MIGRATE** (Swagger dùng `/api/Instrument/{id}`)
- `src/services/instrumentService.ts:18` — `api.get('/instruments/search?...')` — **MIGRATE** (Swagger dùng `/api/Instrument/search`)
- `src/services/instrumentService.ts:23` — `api.post('/instruments', ...)` — **MIGRATE** (Swagger dùng `/api/Instrument`)
- `src/services/instrumentService.ts:28` — `api.put('/instruments/{id}', ...)` — **MIGRATE** (Swagger dùng `/api/Instrument/{id}`)
- `src/services/instrumentService.ts:33` — `api.delete('/instruments/{id}')` — **MIGRATE** (Swagger dùng `/api/Instrument/{id}`)

---

## Phase 2 — Migrate batch đơn giản: `instrumentService`, `ethnicityService`, `performerService`

### Lý do ưu tiên

- CRUD/search cơ bản, ít phụ thuộc domain mapping, dễ đối chiếu Swagger.

### Checklist cho mỗi service

- [ ] Thay `api.get/post/put/delete` bằng `apiFetch.GET/POST/PUT/DELETE` + `apiOk`.
- [ ] Dùng request/response types từ `@/api` (hoặc alias từ `src/api/adapters.ts` nếu đã có).
- [ ] Xoá type wrappers FE cũ (`ApiResponse<T>`, `PaginatedResponse<T>`) nếu không còn cần.
- [ ] Đảm bảo query param keys match Swagger (`page`, `limit`, v.v…).
- [ ] `npm run build` pass.

### Deliverables

- [x] `instrumentService` không còn axios calls (migrate sang `/api/Instrument*`).
- [x] `ethnicityService` không còn axios calls (migrate sang `/api/EthnicGroup*`).
- [ ] `performerService` **HOLD**: Swagger hiện tại **không có** endpoint `/api/*` tương ứng (Performer/Master). Chờ BE bổ sung schema + endpoints.

---

## Phase 3 — Migrate các service còn lại theo batch

### Batch đề xuất

1. **Recording-related**
   - `recordingStorage.ts` (có `/Submission/my`, `/Submission/{id}`, `/Recording/{id}/upload`, ...)
   - `researcherArchiveService.ts`
   - `researcherRecordingFilterSearch.ts`
2. **Review/Notification legacy**
   - `recordingRequestService.ts` (nhiều endpoint `/Review/*` + `/Notification/*`)
3. **Auth**
   - `authService.ts` (thường gặp thiếu schema → có thể cần giữ một phần axios hoặc soft-parse)
4. **Các file “external-ish”**
   - `geocodeService.ts`, `metadataSuggestService.ts`, `aiApiClient.ts` (tuỳ chúng có phải VietTune API không)

### Deliverables

- [ ] Mỗi batch có PR checklist + verify.

### Trạng thái sau Phase 3 (2026-04-16)

- ✅ Đã migrate sang `apiFetch`: `recordingStorage.ts`, `researcherArchiveService.ts`, `researcherRecordingFilterSearch.ts`, `recordingRequestService.ts`, `adminApi.ts`, `annotationApi.ts`.
- ⚠️ **HOLD (chờ BE Swagger)**:
  - `performerService.ts`: chưa có endpoint `/api/*` tương ứng trong Swagger.
  - `authService.ts`: các hàm còn dùng axios do Swagger thiếu endpoint/schema:
    - `verifyOtp`
    - `getCurrentUser`
    - `updateProfile`
    - `processPendingProfileUpdates` (phụ thuộc `updateProfile`)
    - `changePassword`

---

## Phase X — Verification Checklist

| # | Kiểm tra | Cách verify | Status |
|---|----------|-------------|--------|
| 1 | Inventory đầy đủ `api.(get|post|put|delete)` trong `src/services` | `rg -n` xuất line numbers | ✅ |
| 2 | 2/3 service đơn giản migrate xong (Instrument + EthnicGroup) | `rg -n "\\bapi\\.(get|post|put|delete)\\b" src/services/{instrumentService,ethnicityService}.ts` = 0 | ✅ |
| 3 | `npx tsc --noEmit` | pass | ✅ |
| 4 | `npm run build` | pass | ✅ |
| 5 | E2E smoke | `npm run test:e2e:features` | ✅ |
| 6 | Legacy axios còn lại (HOLD) | `rg -n "\\bapi\\.(get|post|put|delete)\\b" src/services` chỉ còn `authService.ts`, `performerService.ts` | ✅ |

---

## Agent Assignments

| Phase | Agent | Ghi chú |
|---|---|---|
| 1 | Cursor Agent | Inventory + label MIGRATE/HOLD |
| 2 | Cursor Agent | Migrate 3 service đơn giản |
| 3 | Cursor Agent | Migrate phần còn lại theo batch |

