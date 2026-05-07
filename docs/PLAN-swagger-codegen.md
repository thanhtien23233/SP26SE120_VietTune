# PLAN — TypeScript Auto-Generated từ Swagger

> **Mục tiêu:** Frontend luôn biết hình thù API thực tế. Mọi request/response type được sinh tự động từ OpenAPI spec của backend, loại bỏ hoàn toàn rủi ro lệch type thủ công.

| Key | Value |
|---|---|
| Cập nhật | 2026-04-15 |
| Swagger URL | `https://viettunearchiveapi-fufkgcayeydnhdeq.japanwest-01.azurewebsites.net/swagger/v1/swagger.json` |
| API Base | `VITE_API_BASE_URL` (`.env.development`) |
| Tool đề xuất | **openapi-typescript** (types only) + **openapi-fetch** (type-safe client) |
| Effort ước tính | ~14–20 giờ (5 phase) |

---

## Mục lục

| Phase | Nội dung | Effort |
|-------|---------|--------|
| 0 | Khảo sát hiện trạng & Quyết định tool | — |
| 1 | Setup codegen pipeline | 2–3h |
| 2 | Sinh types, diff với types thủ công, tạo adapter layer | 4–6h |
| 3 | Migrate services sang generated types | 4–6h |
| 4 | Type-safe API client (openapi-fetch) | 2–3h |
| 5 | CI guard & cleanup | 2–3h |
| X | Verification Checklist | — |

---

## Phase 0 — Khảo sát hiện trạng

### Hiện trạng types thủ công

| File | Exports (type/interface) | Ghi chú |
|------|------------------------|---------|
| `src/types/recording.ts` | `Recording`, `LocalRecording`, `RecordingMetadata`, `UploadRecordingForm`, enums (`RecordingType`, `RecordingQuality`, `VerificationStatus`) | ~158 dòng, nhiều optional fields |
| `src/types/user.ts` | `User`, `LoginForm`, `RegisterForm`, `RegisterResearcherForm`, `ConfirmAccountForm`, `UserRole` | ~50 dòng |
| `src/types/api.ts` | `SearchFilters`, `SearchResult`, `ApiResponse<T>`, `PaginatedResponse<T>` | Generic wrappers |
| `src/types/notification.ts` | `AppNotification`, `ExpertAccountDeletionRequest`, `DeleteRecordingRequest`, `EditRecordingRequest`, `EditSubmissionForReview` | ~71 dòng |
| `src/types/moderation.ts` | `ModerationStatus` enum | 8 dòng |
| `src/types/reference.ts` | `Ethnicity`, `Instrument`, `Performer`, `Region`, `InstrumentCategory` | ~60 dòng |
| `src/types/knowledgeBase.ts` | `KBEntry`, `KBCitation`, `KBRevision`, CRUD DTOs, `KBListFilters`, Search DTOs | ~103 dòng |
| `src/types/annotation.ts` | `AnnotationDto`, `CreateAnnotationDto`, `UpdateAnnotationDto`, `AnnotationDtoPagedList` | ~58 dòng |
| `src/types/embargo.ts` | `EmbargoDto`, `EmbargoCreateUpdateDto`, `EmbargoLiftDto`, `EmbargoListFilters`, `EmbargoPagedResult` | ~44 dòng |
| `src/types/copyrightDispute.ts` | `CopyrightDisputeDto`, CRUD DTOs, `CopyrightDisputePagedResult` | ~58 dòng |
| `src/types/analytics.ts` | `AnalyticsOverview`, `CoverageRow`, `ContributorRow`, `ExpertPerformanceDto`, `ContentAnalyticsDto` | ~43 dòng |
| `src/types/submissionVersion.ts` | `SubmissionVersionDto`, CRUD DTOs, `SubmissionVersionPagedResult`, parse helper | ~51 dòng |
| `src/types/chat.ts` | `Message`, `MessageRole` | ~13 dòng |
| `src/types/graph.ts` | `GraphNode`, `GraphLink`, `KnowledgeGraphData` | ~35 dòng — FE-only, không có trên API |
| `src/types/mutationResult.ts` | `MutationResult`, helpers | ~13 dòng — FE-only utility |
| `src/services/recordingDto.ts` | `RecordingDto`, `buildRecordingUploadPayload()` | Manual mapping OpenAPI → FE |

**Tổng cộng:** ~80+ types/interfaces thủ công, 20+ service files mỗi file tự `as`/cast response.

### Rủi ro hiện tại

1. **Type drift:** BE thêm/đổi field → FE không biết → runtime crash hoặc data mất.
2. **Defensive coding:** Hầu hết service files dùng `as unknown as T` hoặc `normalizeObjectKeys()` để handle response shape không chắc chắn.
3. **Duplicate effort:** `recordingDto.ts` tự viết lại OpenAPI schema bằng tay.
4. **Không CI guard:** Không có bước nào check type khớp API spec.

### So sánh công cụ

| Tool | Output | Client tích hợp | Bundle size | Runtime dep | Độ phổ biến |
|------|--------|-----------------|-------------|-------------|-------------|
| **openapi-typescript** | `.d.ts` types only | Không (kết hợp openapi-fetch) | 0 KB (type-only) | Không | ⭐⭐⭐⭐⭐ |
| **orval** | Types + axios/fetch hooks | Có (axios, react-query) | Nhỏ | Có | ⭐⭐⭐⭐ |
| **swagger-typescript-api** | Types + class-based client | Có | Trung bình | Có | ⭐⭐⭐ |
| **openapi-generator** | Types + client (nhiều ngôn ngữ) | Có | Lớn | Có (Java runtime) | ⭐⭐⭐ |

### Quyết định: **openapi-typescript** + **openapi-fetch**

**Lý do:**

1. **Zero runtime overhead** — Chỉ sinh `.d.ts`, không thêm runtime code vào bundle.
2. **Type-safe mà không phá codebase** — Có thể migrate dần, service cũ vẫn hoạt động.
3. **Nhỏ gọn** — openapi-typescript ~50KB dev dep, openapi-fetch ~5KB runtime.
4. **Dự án dùng axios** — Giai đoạn đầu chỉ dùng types, giữ nguyên axios. Sau đó có thể chuyển dần sang openapi-fetch.
5. **Community lớn** — 5k+ GitHub stars, maintained tốt, hỗ trợ OpenAPI 3.x.

---

## Phase 1 — Setup codegen pipeline

### Task 1.1 — Cài đặt dependencies

```bash
npm install -D openapi-typescript
npm install openapi-fetch
```

### Task 1.2 — Tải swagger.json và lưu local

Tạo script `scripts/fetch-swagger.mjs`:

```js
// Tải swagger.json từ backend, lưu vào src/api/swagger.json
// Sử dụng: node scripts/fetch-swagger.mjs [--url <custom-url>]
```

**Lưu ý:** Repo đang theo hướng **commit `src/api/swagger.json`** để CI và mọi dev reproduce được types.

- **Khi BE cập nhật API**: chạy `npm run api:pull` để cập nhật `src/api/swagger.json`, sau đó `npm run api:generate` để cập nhật `src/api/generated.d.ts`.
- **Khi cần đồng bộ trọn gói**: chạy `npm run api:sync`.

### Task 1.3 — Thêm npm scripts

```jsonc
{
  "scripts": {
    "api:pull": "node scripts/fetch-swagger.mjs",
    "api:generate": "openapi-typescript src/api/swagger.json -o src/api/generated.d.ts",
    "api:sync": "npm run api:pull && npm run api:generate",
    "api:check": "openapi-typescript src/api/swagger.json -o /dev/null"
  }
}
```

**Ghi chú Windows:** trong repo hiện tại `api:check` đang dùng `-o NUL` (PowerShell/CMD friendly) thay vì `/dev/null`.

### Task 1.4 — Tạo thư mục output

```
src/
  api/
    swagger.json          ← spec gốc (committed)
    generated.d.ts        ← types sinh tự động (committed)
    client.ts             ← openapi-fetch wrapper (Phase 4)
    index.ts              ← re-export convenience
```

### Deliverables Phase 1

- [x] `openapi-typescript` + `openapi-fetch` installed
- [x] `scripts/fetch-swagger.mjs` hoạt động
- [x] `npm run api:sync` sinh `src/api/generated.d.ts` thành công
- [x] File `generated.d.ts` committed, dùng được trong IDE autocomplete

---

## Phase 2 — Diff types thủ công vs generated, tạo adapter layer

### Task 2.1 — Phân tích diff

Tạo bảng mapping giữa types thủ công (`src/types/*`) và types generated:

| FE Type (thủ công) | Swagger Schema | Khớp? | Ghi chú |
|---------------------|---------------|-------|---------|
| `Recording` | `components.schemas['VietTuneArchive.Application.Mapper.DTOs.RecordingDto']` | ❌ Partial | FE đang dùng object nested (`ethnicity: Ethnicity`, `region`, `uploader: User`…), trong khi API DTO hiện là flat/IDs. Cần adapter mapping. |
| `User` | *(không có `UserDto` tổng quát trong spec hiện tại)* | ❌ Missing | Spec hiện có `AdminDto+UserAdminDto` / `AdminDto+UserDetailAdminDto`, nhưng **Auth** (`/api/Auth/login`) lại thiếu response schema (`content?: never`). Vì vậy `authService.ts` hiện đang tự định nghĩa `LoginResponse` inline. |
| `Ethnicity` | `components.schemas['VietTuneArchive.Application.Mapper.DTOs.EthnicGroupDto']` | ⚠️ Khác tên | FE gọi là `Ethnicity`, API gọi là `EthnicGroup`. Cần alias + adapter hoặc đổi dần domain naming. |
| `Instrument` | `components.schemas['VietTuneArchive.Application.Mapper.DTOs.InstrumentDto']` | ⚠️ Cần xác nhận | Có DTO, nhưng cần đối chiếu field-by-field với `src/types/reference.ts` (FE có `nameVietnamese`, `category`, `recordingCount`…). |
| `KBEntry` | *(responses nhiều endpoint KB đang `content?: never`)* | ❌ Missing | Các endpoint `/api/kb-entries*` trong swagger hiện **không mô tả response body**, chỉ mô tả query + request DTO. Hiện tại chỉ generate được request types như `...DTO.KnowledgeBase.CreateKBEntryRequest`, `UpdateKBEntryRequest`, `CreateKBCitationRequest`… |
| `AnnotationDto` | `components.schemas['VietTuneArchive.Application.Mapper.DTOs.AnnotationDto']` | ✅ Khớp cao | Đã align với `src/types/annotation.ts` (tên field + kiểu khá sát). |
| `EmbargoDto` | `components.schemas['VietTuneArchive.Application.Mapper.DTOs.EmbargoDto']` + wrappers `...Responses.PagedResponse\`1[[...EmbargoDto]]` / `...Responses.ServiceResponse\`1[[...EmbargoDto]]` | ✅ Khớp cao | FE đang dùng `EmbargoPagedResult` tự định nghĩa; API trả wrapper `PagedResponse<T>`/`ServiceResponse<T>`. |
| `CopyrightDisputeDto` | `components.schemas['VietTuneArchive.Application.Mapper.DTOs.CopyrightDisputeDto']` *(cộng với request DTOs)* | ✅ Khớp cao | Cần map status enum: API dùng `VietTuneArchive.Domain.Entities.Enum.CopyrightDisputeStatus`. |
| `SubmissionVersionDto` | `components.schemas['VietTuneArchive.Application.Mapper.DTOs.SubmissionVersionDto']` + wrappers `...Responses.PagedResponse\`1[[...SubmissionVersionDto]]` | ✅ Khớp cao | FE có thêm helper `parseChangesJson` (FE-only). |
| `LocalRecording` | — | N/A | FE-only form state |
| `GraphNode`, `GraphLink` | — | N/A | FE-only (react-force-graph) |
| `MutationResult` | — | N/A | FE-only utility |

**Kết luận nhanh (Task 2.1):** Swagger hiện tại generate được nhiều DTO quan trọng (Recording/Annotation/Embargo/Instrument/EthnicGroup/SubmissionVersion…), nhưng cũng có một số nhóm endpoint **thiếu response schema** (đặc biệt Auth và KB). Khi migrate, cần:\n\n- Ưu tiên các service có response schema đầy đủ trước (Annotation/Embargo/Dispute/SubmissionVersion/Recording list wrappers…)\n- Với Auth/KB: hoặc cập nhật Swagger bên backend để có response schemas, hoặc giữ adapter/types thủ công cho các response này đến khi spec được cải thiện.

### Task 2.2 — Tạo adapter types

Tạo `src/api/adapters.ts` chứa utility types để bridge giữa generated schema và FE domain types:

```typescript
import type { components } from './generated';

// API schema types (shorthand aliases)
export type ApiRecordingDto = components['schemas']['RecordingDto'];
export type ApiUserDto = components['schemas']['UserDto'];
export type ApiEthnicGroupDto = components['schemas']['EthnicGroupDto'];
// ... etc

// Mapper: API → FE domain
export function mapApiRecordingToFE(dto: ApiRecordingDto): Recording { ... }
export function mapFERecordingToApi(fe: LocalRecording): ApiRecordingDto { ... }
```

**Nguyên tắc:**
- Types chỉ-dùng-nội-bộ FE (`LocalRecording`, `GraphNode`, `MutationResult`) → giữ nguyên trong `src/types/`.
- Types map 1:1 với API → dùng generated types trực tiếp hoặc qua alias.
- Types cần transform (FE enriched) → dùng adapter functions.

### Task 2.3 — Tạo `src/api/index.ts` re-exports

```typescript
export type { paths, components, operations } from './generated';
export * from './adapters';
```

### Deliverables Phase 2

- [x] Bảng diff hoàn chỉnh (cập nhật vào file này)
- [x] `src/api/adapters.ts` với type aliases + mapper functions
- [x] `src/api/index.ts` re-export `generated` + `adapters`
- [x] Không break code hiện tại (types cũ vẫn tồn tại song song)

---

## Phase 3 — Migrate services sang generated types

### Chiến lược: Migrate từng service, từ ít phụ thuộc → nhiều

**Thứ tự đề xuất:**

| Batch | Service files | Lý do ưu tiên |
|-------|--------------|----------------|
| 3.1 | `annotationApi.ts`, `embargoApi.ts`, `copyrightDisputeApi.ts`, `submissionVersionApi.ts` | Types đã gần khớp 100% với Swagger |
| 3.2 | `knowledgeBaseApi.ts`, `analyticsApi.ts` | Types đã có comment "aligned with Swagger" |
| 3.3 | `authService.ts`, `adminApi.ts` | Auth response cần xử lý đặc biệt |
| 3.4 | `recordingService.ts`, `recordingDto.ts`, `submissionService.ts` | Complex nhất, nhiều normalization |
| 3.5 | `expertModerationApi.ts`, `qaMessageService.ts`, `referenceDataService.ts` | Domain-specific |
| 3.6 | Các service còn lại | `instrumentService`, `ethnicityService`, `performerService`, etc. |

### Task 3.x — Quy trình cho mỗi service file

Cho mỗi service file:

1. **Import generated types:**
   ```typescript
   import type { components } from '@/api/generated';
   type ApiXxxDto = components['schemas']['XxxDto'];
   ```

2. **Thay thế inline type assertions:**
   ```typescript
   // TRƯỚC (unsafe)
   const data = response.data as unknown as Recording[];
   
   // SAU (type-safe)
   const data = response.data as ApiRecordingDto[];
   return data.map(mapApiRecordingToFE);
   ```

3. **Xóa type imports cũ** nếu service không còn cần type thủ công.

4. **Chạy `tsc --noEmit`** kiểm tra không lỗi type.

### Task 3.7 — Deprecate types thủ công

Sau khi tất cả services đã migrate:

1. Thêm `@deprecated` JSDoc vào types thủ công trùng với generated:
   ```typescript
   /** @deprecated Use `components['schemas']['RecordingDto']` from `@/api/generated` */
   export interface Recording { ... }
   ```

2. Giữ `src/types/` cho FE-only types: `LocalRecording`, `GraphNode`, `MutationResult`, `SearchFilters` (nếu BE không có).

### Deliverables Phase 3

- [x] Tất cả service files import generated types
- [x] `tsc --noEmit` pass
- [x] Types thủ công trùng API được đánh dấu `@deprecated`
- [x] FE-only types được giữ lại rõ ràng

---

## Phase 4 — Type-safe API client (openapi-fetch) — TÙY CHỌN

> Phase này là optional. Có thể dừng ở Phase 3 nếu team muốn giữ axios.

### Task 4.1 — Tạo `src/api/client.ts`

```typescript
import createClient from 'openapi-fetch';
import type { paths } from './generated';
import { getItem } from '@/services/storageService';
import { API_BASE_URL } from '@/config/constants';

export const apiClient = createClient<paths>({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auth middleware
apiClient.use({
  async onRequest({ request }) {
    const token = getItem('access_token');
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
});
```

### Task 4.2 — Sử dụng trong service

```typescript
import { apiClient } from '@/api/client';

// TRƯỚC (axios, unsafe)
const res = await api.get<unknown>('/Recording/get-all', { params });
const data = res as unknown as { data: Recording[] };

// SAU (openapi-fetch, fully type-safe)
const { data, error } = await apiClient.GET('/api/Recording/get-all', {
  params: { query: { Page: 1, PageSize: 20 } },
});
// data is auto-typed as RecordingDtoPagedList | undefined
// error is auto-typed as the error schema
```

### Task 4.3 — Migrate dần từng service

Cùng chiến lược batch như Phase 3. Mỗi service:
1. Thay `api.get/post/put/delete` bằng `apiClient.GET/POST/PUT/DELETE`.
2. Xóa manual type casting.
3. Verify TypeScript happy.

### Deliverables Phase 4

- [x] `src/api/client.ts` openapi-fetch wrapper
- [x] Ít nhất 3 services đã chuyển sang openapi-fetch
- [x] Pattern documented cho team

---

## Phase 5 — CI guard & cleanup

### Task 5.1 — CI step: validate types up-to-date

Thêm vào CI pipeline (GitHub Actions hoặc tương đương):

```yaml
- name: Validate API types
  run: |
    npm run api:generate
    git diff --exit-code src/api/generated.d.ts || (echo "❌ generated.d.ts outdated! Run: npm run api:sync" && exit 1)
```

### Task 5.2 — Pre-commit hook (optional)

Dùng `husky` + `lint-staged`:

```bash
npx husky add .husky/pre-commit "npm run api:check"
```

### Task 5.3 — Cleanup types cũ

Khi đã chắc chắn mọi consumer đã migrate:

1. Xóa types thủ công trùng API khỏi `src/types/`:
   - `recording.ts` → chỉ giữ `LocalRecording`, `UploadRecordingForm` (FE-only)
   - `user.ts` → chỉ giữ `LoginForm`, `RegisterForm` (FE-only form types)
   - `api.ts` → xóa `ApiResponse<T>`, `PaginatedResponse<T>` (dùng generated)
   - `reference.ts` → xóa hoàn toàn (dùng generated)
   - `moderation.ts` → xóa (dùng generated enum)
   - `annotation.ts` → xóa (dùng generated)
   - `embargo.ts` → xóa (dùng generated)
   - `copyrightDispute.ts` → xóa (dùng generated)
   - `submissionVersion.ts` → giữ `parseChangesJson` helper, xóa types
   - `analytics.ts` → xóa (dùng generated)
   - `notification.ts` → xóa types API, giữ FE-only types nếu có

2. Giữ nguyên trong `src/types/`:
   - `graph.ts` — FE-only (react-force-graph)
   - `mutationResult.ts` — FE-only utility
   - `chat.ts` — FE-only (nếu API shape khác)
   - `index.ts` — barrel re-export (cập nhật)

3. Xóa `src/services/recordingDto.ts` (thay bằng generated type + adapter).

### Task 5.4 — Cập nhật README

Thêm section vào README:

```markdown
## API Types

Types được sinh tự động từ Swagger spec của backend.

### Cập nhật types khi backend thay đổi API:
    npm run api:sync

### Chỉ generate (không fetch):
    npm run api:generate

### File structure:
- `src/api/swagger.json` — OpenAPI spec (committed)
- `src/api/generated.d.ts` — Auto-generated types (committed, DO NOT EDIT)
- `src/api/adapters.ts` — Mapper functions API ↔ FE domain
- `src/api/client.ts` — Type-safe fetch client
```

### Deliverables Phase 5

- [x] CI step chặn merge nếu types outdated
- [x] Types thủ công trùng API đã xóa
- [x] README cập nhật hướng dẫn workflow
- [x] `recordingDto.ts` manual mapping đã thay bằng generated

---

## Phase X — Verification Checklist

| # | Kiểm tra | Cách verify | Status |
|---|----------|-------------|--------|
| 1 | `npm run api:pull` tải swagger.json thành công | Chạy script, check file size > 0 | ✅ |
| 2 | `npm run api:generate` sinh `generated.d.ts` không lỗi | Script exit code 0 | ✅ |
| 3 | `generated.d.ts` có paths + components matching Swagger UI | Grep vài endpoint key | ✅ |
| 4 | IDE autocomplete hoạt động khi import từ `@/api/generated` | Manual test trong VS Code/Cursor | ⚠️ (manual) |
| 5 | `tsc --noEmit` pass sau Phase 2 (adapter layer) | CI check | ✅ |
| 6 | `tsc --noEmit` pass sau Phase 3 (services migrated) | CI check | ✅ |
| 7 | Batch 3.1 services (annotation, embargo, dispute, version) dùng generated types | Code review | ⚠️ (review) |
| 8 | Batch 3.4 services (recording, submission) dùng generated types | Code review | ⚠️ (review) |
| 9 | Không còn `as unknown as` trong service files | `rg "as unknown as" src/services/` = 0 | ⚠️ (còn một số escape-hatch do Swagger thiếu schema) |
| 10 | CI step chặn outdated types | Push thử với stale generated.d.ts | ✅ (đã có step `npm run api:generate` + `git diff --exit-code src/api/generated.d.ts` trong `.github/workflows/e2e.yml`) |
| 11 | Dev workflow: backend deploy → dev chạy `api:sync` → types cập nhật | Manual walkthrough | ⚠️ (manual) |
| 12 | Vite build thành công (`npm run build`) | CI | ✅ |
| 13 | E2E tests vẫn pass | Xem `docs/test-report.md` | ✅ (đã ghi Phase 6–7: researcher/admin exit 0; CI smoke vẫn chạy `test:e2e:ci`) |

---

## Appendix A — Ví dụ generated types output

Sau khi chạy `openapi-typescript`, file `generated.d.ts` sẽ có dạng:

```typescript
export interface paths {
  '/api/Recording/get-all': {
    get: {
      parameters: {
        query?: {
          Page?: number;
          PageSize?: number;
          SortBy?: string;
        };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['RecordingDtoPagedList'];
          };
        };
      };
    };
  };
  // ... 50+ endpoints
}

export interface components {
  schemas: {
    RecordingDto: {
      id?: string;
      title?: string | null;
      description?: string | null;
      audioFileUrl?: string | null;
      videoFileUrl?: string | null;
      ethnicGroupId?: string | null;
      // ... all fields from Swagger
    };
    // ... all schemas
  };
}
```

## Appendix B — Tại sao không chọn orval?

Orval sinh cả types lẫn react-query hooks + axios client. Dự án VietTune:
- Đã có 43 service files với logic nghiệp vụ phức tạp (normalization, fallback, etc.)
- Không dùng react-query (state management tự viết)
- Muốn migrate dần, không big-bang rewrite

→ openapi-typescript cho phép dùng generated types mà **không thay đổi architecture** hiện tại.

## Appendix C — FAQ

**Q: Khi backend thêm field mới, FE cần làm gì?**
A: Chạy `npm run api:sync`. File `generated.d.ts` tự cập nhật. TypeScript sẽ báo lỗi nếu code FE dùng field bị xóa/đổi tên.

**Q: Có cần backend running để generate types?**
A: Không nếu dùng Cách A (commit swagger.json). Chỉ cần backend running khi chạy `npm run api:pull`.

**Q: openapi-fetch có thay thế axios hoàn toàn?**
A: Phase 4 là optional. Có thể giữ axios + chỉ dùng generated types (Phase 1-3). openapi-fetch chỉ thêm type safety ở tầng HTTP call.

**Q: File generated.d.ts lớn không?**
A: Tùy số endpoint và schema wrapper. Thực tế repo hiện tại `generated.d.ts` có thể lên ~8k–10k dòng. Vì là `.d.ts` nên **không ảnh hưởng bundle size** (type-only).

---

## Quick check — “BE đã cập nhật swagger xong chưa?”

Trong FE, cách đáng tin cậy nhất để biết BE có thay đổi API shape hay không:

```bash
# 1) Pull spec mới từ BE (cập nhật src/api/swagger.json)
npm run api:pull

# 2) Generate types và xem có diff không
npm run api:generate
git diff -- src/api/swagger.json src/api/generated.d.ts
```

- **Nếu có diff**: BE swagger đã thay đổi → FE cần commit lại `swagger.json` + `generated.d.ts`.
- **Nếu không có diff**: swagger endpoint đang trỏ tới không đổi (hoặc FE đã up-to-date).

---

## Agent Assignments

| Phase | Agent | Ghi chú |
|-------|-------|---------|
| 1 | Cline / Cursor Agent | Setup script + npm config |
| 2 | Cline / Cursor Agent | Cần fetch swagger.json để diff chính xác |
| 3.1–3.2 | Cline / Cursor Agent | Batch ít phụ thuộc |
| 3.3–3.6 | Cline / Cursor Agent | Batch phức tạp, cần review cẩn thận |
| 4 | Cline / Cursor Agent | Optional, chỉ làm nếu team muốn |
| 5 | Cline / Cursor Agent | CI config + cleanup |
