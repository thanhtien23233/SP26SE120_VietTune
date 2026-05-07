# PLAN — Cập nhật Swagger/OpenAPI phía Backend (để FE type-safe hoàn toàn)

> **Mục tiêu:** Swagger/OpenAPI mô tả **đúng & đủ** request/response cho các endpoint mà Frontend đang dùng.
> Khi hoàn tất, Frontend có thể bỏ “escape hatch” và dùng `openapi-fetch` với type-safety đầy đủ (không `as any`/`unknown`).

## Bối cảnh

- FE đã triển khai pipeline sinh type từ swagger (`openapi-typescript`) và bắt đầu migrate sang `openapi-fetch`.
- Hiện vẫn có các chỗ FE phải xử lý “mềm” vì swagger:
  - **Thiếu endpoint** so với route thực tế FE đang gọi, hoặc
  - Endpoint có nhưng **thiếu response schema** (`content?: never`), hoặc
  - Có endpoint nhưng **thiếu query/paging** trong spec (thực tế backend có/FE cần), hoặc
  - Route prefix **không đồng nhất** (`/auth/*` vs `/api/Auth/*`, v.v.)

## Nguyên tắc cập nhật Swagger (ưu tiên)

- **P0 — Đúng route + đúng response schema** cho các endpoint FE dùng thường xuyên.
- **P1 — Chuẩn hoá envelope**: `ServiceResponse<T>` / `PagedResponse<T>` và field naming/casing.
- **P2 — Chuẩn hoá query/paging**: `page`, `pageSize` (camelCase) hoặc `Page`, `PageSize` (PascalCase) nhưng **phải nhất quán**.
- **P3 — Bổ sung error schema** cho 4xx/5xx (ít nhất `{ message, errors? }`) để FE type-safe với `error`.

## Danh sách vấn đề cần BE xử lý

## Trạng thái kiểm tra theo swagger mới nhất (2026-04-16)

> Nguồn đối chiếu: `src/api/swagger.latest.json` (fetch từ Swagger URL).

### Tóm tắt ✅/❌

- ✅ **Review**: đã có `/api/Review/reviewer/{reviewerId}` và `/api/Review/decision/{decision}` kèm response schema.
- ❌ **Analytics**: vẫn **thiếu** `/api/Analytics/overview` và `/api/Analytics/submissions`.
- ❌ **Auth login**: `/api/Auth/login` vẫn **thiếu response schema** (200 chỉ có `description`).
- ❌ **QAMessage get-by-conversation**: `/api/QAMessage/get-by-conversation` vẫn **thiếu response schema** (200 chỉ có `description`).
- ❌ **District/Commune get-by-***: 
  - `/api/District/get-by-province/{provinceId}` vẫn **thiếu response schema**
  - `/api/Commune/get-by-district/{districtId}` vẫn **thiếu response schema**

### 1) Nhóm Review (Recording Request) — thiếu endpoint trong swagger

**FE đang dùng** (từ `src/services/recordingRequestService.ts`):

- `GET /Review/decision/{decision}`
- `GET /Review/reviewer/{reviewerId}`
- `PUT /Review/{id}`
- `GET /Review/{id}`
- `DELETE /Review/{id}`
- `POST /Review`

**Trong swagger hiện tại**:

- ✅ Có `/api/Review`, `/api/Review/{id}` (CRUD cơ bản)
- ✅ Có `/api/Review/decision/{decision}` (response schema có)
- ✅ Có `/api/Review/reviewer/{reviewerId}` (response schema có)

**Yêu cầu BE (P0):**

- Bổ sung 2 endpoints vào swagger:
  - `GET /api/Review/decision/{decision}`
  - `GET /api/Review/reviewer/{reviewerId}`
- Response schema:
  - `GET` list: `PagedResponse<ReviewDto>` hoặc `List<ReviewDto>` (nếu không paging)
  - `GET` detail: `ServiceResponse<ReviewDto>` (hoặc raw `ReviewDto`)
- Nếu backend trả 400/404 khi “không có dữ liệu”, cân nhắc đổi thành `200 []` để FE khỏi phải bắt lỗi theo logic.

### 2) Nhóm Analytics — thiếu endpoint hoặc thiếu response schema

**FE đang dùng** (`src/services/analyticsApi.ts`):

- `GET /Analytics/overview`
- `GET /Analytics/coverage`
- `GET /Analytics/submissions`
- `GET /Analytics/contributors`
- `GET /Analytics/experts?period=...`
- `GET /Analytics/content?type=...`

**Trong swagger**:

- Có `/api/Analytics/coverage`, `/api/Analytics/content`, `/api/Analytics/experts`, `/api/Analytics/contributors`
- ❌ **Thiếu** `/api/Analytics/overview`, `/api/Analytics/submissions`
- Với các endpoint đang có, nhiều chỗ vẫn **không có response schema** (`content?: never`)

**Yêu cầu BE (P0):**

- Thêm vào swagger:
  - `GET /api/Analytics/overview` → schema `AnalyticsOverviewDto`
  - `GET /api/Analytics/submissions` → schema `Record<string, number>` hoặc `SubmissionsTrendDto`
- Cho các endpoint đã có, khai báo response schema cụ thể:
  - `coverage`: `CoverageRow[]` hoặc `ServiceResponse<CoverageRow[]>`
  - `contributors`: `ContributorRow[]` hoặc `ServiceResponse<ContributorRow[]>`
  - `experts`: `ExpertPerformanceDto[]` hoặc `ServiceResponse<ExpertPerformanceDto[]>`
  - `content`: `ContentAnalyticsDto` hoặc `ServiceResponse<ContentAnalyticsDto>`

### 3) Auth routes — không đồng nhất prefix và/hoặc thiếu response schema login

**FE đang dùng** (`src/services/authService.ts`):

- `POST /auth/login` (response có `{ token, role, fullName, phoneNumber, isActive, userId? }`)
- `POST /auth/register`
- `POST /auth/register-researcher`
- `POST /auth/verify-otp`
- `GET /auth/confirm-email?token=...`
- `GET /auth/me`
- `PUT /auth/profile`

**Trong swagger**:

- Có `/api/Auth/login`… (nhưng không khớp hoàn toàn với `/auth/*` mà FE gọi)
- ❌ Response login vẫn thiếu schema (200 không có `content`) khiến FE phải tự định nghĩa `LoginResponse`.

**Yêu cầu BE (P0):**

- Chọn 1 chuẩn route và **đồng bộ**:
  - **Option A (khuyến nghị):** expose toàn bộ Auth dưới `/api/Auth/*` và cập nhật FE dần.
  - **Option B:** giữ `/auth/*` nhưng phải được swagger expose đầy đủ (đúng path).
- Khai báo response schema cho login:
  - `AuthLoginResponseDto { token: string; userId: string; role: string; fullName: string; phoneNumber?: string; isActive: boolean; }`
- Khai báo response schema cho `/auth/me`, `/auth/profile`.

### 4) QAMessage get-by-conversation — swagger có path nhưng thiếu response schema

**FE đang dùng**:

- `GET /api/QAMessage/get-by-conversation?conversationId=...` → `QAMessageDto[]` (hoặc envelope)

**Trong swagger hiện tại**:

- ❌ Path có, nhưng response vẫn thiếu schema (200 không có `content`)

**Yêu cầu BE (P0):**

- Cập nhật response schema:
  - `200: QAMessageDto[]` hoặc `ServiceResponse<List<QAMessageDto>>`
- Nếu backend hiện trả `{ data: [...] }`, nên chọn 1 envelope và **khai báo đúng**.

### 5) District/Commune “get-by-*” — swagger có path nhưng thiếu response schema + thiếu paging query

**FE đang dùng**:

- `GET /api/District/get-by-province/{provinceId}`
- `GET /api/Commune/get-by-district/{districtId}`

**Trong swagger hiện tại**:

- ❌ Path có, nhưng response vẫn thiếu schema (200 không có `content`)
- Query paging không có (nếu backend thực sự hỗ trợ paging)

**Yêu cầu BE (P0/P1):**

- Khai báo response schema:
  - `200: PagedResponse<DistrictDto>` hoặc `List<DistrictDto>`
  - `200: PagedResponse<CommuneDto>` hoặc `List<CommuneDto>`
- Nếu backend hỗ trợ `page/pageSize`, hãy thêm vào swagger `parameters.query`.

### 6) Các endpoint FE gọi nhưng swagger không có (cần rà soát)

Những endpoint có nguy cơ lệch giữa FE và swagger (cần backend xác nhận & bổ sung nếu thiếu):

- `GET /api/Search/semantic` (đã có trong swagger, nhưng cần đảm bảo response schema đầy đủ)
- `GET /api/Song/*` (popular/recent/featured/by-ethnic-group…) — nên khai báo response là `SongSummaryDto[]` hoặc `PagedResponse<SongSummaryDto>`
- `POST /api/Submission/*` các action endpoints (`approve/reject/assign...`) — cần khai báo rõ response (thường `ServiceResponse<bool>`)

## Checklist triển khai bên Backend (khuyến nghị)

- **(P0)** Bổ sung endpoint thiếu vào swagger (Review decision/reviewer, Analytics overview/submissions, Auth prefix đúng).
- **(P0)** Cho mọi endpoint FE dùng, đảm bảo `responses[200].content['application/json']` có schema.
- **(P1)** Thống nhất 1 envelope:
  - `ServiceResponse<T> { isSuccess: boolean; message?: string; data: T }`
  - `PagedResponse<T> { items: T[]; total: number; page: number; pageSize: number }`
- **(P1)** Thống nhất casing cho paging query: `page/pageSize` (khuyến nghị) và update code binding.
- **(P2)** Bổ sung error schema:
  - `400/401/403/404/500` trả `ProblemDetails` hoặc `ApiError { message; errors?; traceId? }`
- **(P2)** Thêm `operationId` ổn định cho các endpoint để codegen/clients dễ dùng.

## Tiêu chí “Done”

- FE có thể gọi `apiFetch.GET/POST/...` mà **không cần**:
  - `as unknown as ...`
  - `as any`
  - normalize “mềm” vì `content?: never` (trừ các endpoint cố ý trả dynamic)
- `openapi-typescript` sinh type với response/params đầy đủ cho các endpoint FE đang dùng.

