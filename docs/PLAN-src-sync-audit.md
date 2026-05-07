# PLAN: Kiểm tra & đồng bộ toàn bộ `src/`

> **Ngày tạo:** 2026-04-17  
> **Phạm vi:** Quét tĩnh toàn bộ `src/` — API types, services, types, dead code, naming, env  
> **Mức độ:** Audit (chỉ liệt kê — chưa sửa code)

---

## Mục lục

- [§A — API Endpoints: Swagger vs Service Calls](#a--api-endpoints-swagger-vs-service-calls)
- [§B — Dual HTTP Client (openapi-fetch vs axios)](#b--dual-http-client-openapi-fetch-vs-axios)
- [§C — Type Definitions: Duplicate / Conflict / Unused](#c--type-definitions-duplicate--conflict--unused)
- [§D — Unsafe Casts (`as unknown as`)](#d--unsafe-casts-as-unknown-as)
- [§E — Dead Exports & Orphan Files](#e--dead-exports--orphan-files)
- [§F — Broken Imports](#f--broken-imports)
- [§G — Naming & Pattern Inconsistencies](#g--naming--pattern-inconsistencies)
- [§H — Error Handling Inconsistencies](#h--error-handling-inconsistencies)
- [§I — Env & Config Sync](#i--env--config-sync)
- [§J — Stores Không Dùng](#j--stores-không-dùng)
- [§K — Kế hoạch sửa (ưu tiên)](#k--kế-hoạch-sửa-ưu-tiên)

---

## §A — API Endpoints: Swagger vs Service Calls

### A1. Endpoints có trong `generated.d.ts` nhưng KHÔNG được gọi từ `src/services/`

Phần lớn **~100 route** trong `paths` (swagger) chỉ có **~40–50** được service gọi thực tế. Nhóm chưa dùng đáng chú ý:

| Nhóm | Endpoints ví dụ | Ghi chú |
|------|-----------------|---------|
| **AIAnalysis** | `/api/AIAnalysis/*` | Chưa có UI cho AI analysis |
| **audio-analysis** | `/api/audio-analysis/*` | Chưa integrate |
| **Admin audit/health** | `/api/Admin/audit-logs`, `/api/Admin/system-health` | Admin dashboard chưa dùng |
| **Ceremony CRUD** | `/api/Ceremony`, `/api/Ceremony/{id}` | Chỉ reference data fetch, không CRUD |
| **KnowledgeGraph** | `/api/KnowledgeGraph/*` | Graph viewer dùng mock/partial |
| **Media** | `/api/Media/*` | Chưa integrate |
| **MusicalScale** | `/api/MusicalScale/*` | Chỉ reference dropdown |
| **rag-chat** | `/api/rag-chat` | Dùng riêng `/api/Chat` (axios) |
| **RecordingGuest** | `/api/RecordingGuest/*` | Dùng axios `guestApiClient` trực tiếp |
| **RecordingImage** | `/api/RecordingImage/*` | Chưa dùng |
| **Song** (phần lớn) | `popular`, `recent`, `featured` | Trừ `annotations` + carousel |
| **Tag** | `/api/Tag/*` | Chưa integrate |
| **User** (phần lớn) | `/api/User/{id}`, etc. | Trừ `GetAll` |
| **VocalStyle** | `/api/VocalStyle/*` | Chỉ reference |
| **search/semantic-768** | `/api/search/semantic-768` | Dùng `/api/search/semantic` |

### A2. Service gọi endpoint KHÔNG có trong `paths` (OpenAPI)

| Service call | Endpoint | Ghi chú |
|-------------|----------|---------|
| `authService.ts` (axios) | `/auth/verify-otp`, `/auth/me`, `/auth/profile`, `/auth/change-password` | Swagger có `/api/Auth/...` (PascalCase), không có `/api/auth/...` (camelCase) — **case mismatch** |
| `performerService.ts` | `/performers`, `/performers/:id` | **Không** có route Performer trong swagger |
| `metadataSuggestService.ts` | `MetadataSuggest` | Không thấy trong `paths` |
| `geocodeService.ts` | `Geocode/reverse` | Không thấy trong `paths` |

### A3. Sai method / sai cách truyền params

| Vấn đề | Chi tiết |
|--------|----------|
| **QAMessage flagged/unflagged (legacy axios)** | OpenAPI spec: `PUT` + query `?id=...`. Legacy axios: `client.put('/QAMessage/flagged', { id })` gửi **body JSON** thay vì query string. Bản `apiFetch` dùng `params.query` → **đúng spec**. |

---

## §B — Dual HTTP Client (openapi-fetch vs axios)

### B1. Services dùng CẢ HAI client cho cùng resource

| Resource | Nơi dùng `apiFetch` | Nơi dùng axios `api`/`apiClient` |
|----------|---------------------|----------------------------------|
| **QAConversation** | `createQAConversationOpenApi`, `fetchQAConversationsOpenApi` | `createQAConversationService(api)` |
| **QAMessage** | `createQAMessage`, `fetchConversationMessages`, `flagMessage`, `unflagMessage` | `*Legacy` exports (`createQAMessageLegacy`, etc.) |
| **Recording** | Phần lớn `recordingService.ts` | `guestApiClient` (axios) cho guest flow |
| **Submission** | `submissionService.ts` (`apiFetch`) | Cùng file import `axios` cho error check |
| **Expert moderation** | `expertModerationApi.ts` (`apiFetch`) | Cùng file import `axios` |

### B2. Services chỉ dùng axios (chưa migrate sang openapi-fetch)

| Service | URL pattern |
|---------|-------------|
| `performerService.ts` | `/performers` |
| `geocodeService.ts` | `Geocode/reverse` |
| `metadataSuggestService.ts` | `MetadataSuggest` |
| `researcherChatService.ts` | AI chat endpoint |
| `aiApiClient.ts` | AI factory |

---

## §C — Type Definitions: Duplicate / Conflict / Unused

### C1. Duplicate: cùng khái niệm, nhiều nơi định nghĩa

| Khái niệm | Vị trí 1 | Vị trí 2+ | Rủi ro |
|-----------|----------|-----------|--------|
| **Submission** (API shape) | `services/submissionService.ts` — `Submission`, `SubmissionRecording` | Không trong `src/types/` | Không centralized, khó reuse |
| **LocalRecording** variants | `types/recording.ts` — `LocalRecording` | `features/moderation/types/localRecordingQueue.types.ts` — `LocalRecordingMini` | Field chồng lấn |
| | | `features/upload/uploadRecordingTypes.ts` — `LocalRecordingStorage` | Extends nhưng diverge |
| | | `utils/recordingTags.ts` — `LocalRecordingForTags` | Subset |
| **ExpertPerformance** | `types/analytics.ts` — `ExpertPerformanceDto` (optional fields) | `features/admin/adminDashboardTypes.ts` — `ExpertPerformanceRow` (required fields) | Cùng data, khác strictness |
| **KB request DTOs** | `types/knowledgeBase.ts` — manual interfaces | `api/adapters.ts` — `Api*` aliases từ generated | Trùng tên, khác nguồn |
| **CopyrightDisputeDto** | `types/copyrightDispute.ts` — manual interface | `generated.d.ts` schema | Cố ý bù swagger (comment) |

### C2. Unused type exports

| Export | File | Ghi chú |
|--------|------|---------|
| `SearchResult` | `types/api.ts` | Không có consumer |
| `UploadRecordingForm` | `types/recording.ts` | Không có consumer |
| `KBSuggestedCategory` | `types/knowledgeBase.ts` | Không có consumer |
| `UpdateKBEntryStatusRequest` | `types/knowledgeBase.ts` | Service dùng `Api*` từ `@/api` thay vì bản này |

### C3. Files không trong barrel `types/index.ts`

| File | Exports |
|------|---------|
| `types/graph.ts` | `GraphNodeType`, `GraphNode`, `GraphLink`, `KnowledgeGraphData` |
| `types/chat.ts` | `MessageRole`, `Message` |
| `types/mutationResult.ts` | `MutationOk`, `MutationFail`, `MutationResult` |

---

## §D — Unsafe Casts (`as unknown as`)

**Tổng cộng ~118 lần** `as unknown as` trong `src/`. Phân bố nặng:

| File | Số lần (ước lượng) | Lý do chính |
|------|-------------------|-------------|
| `services/recordingRequestService.ts` | ~15 | Ép `apiFetch` thành object có method tùy ý |
| `services/submissionService.ts` | ~10 | Query + Promise response wrapping |
| `services/knowledgeBaseApi.ts` | ~10 | Chain ép kiểu response |
| `services/recordingService.ts` | ~8 | Tương tự |
| `services/expertModerationApi.ts` | ~8 | Body/query `Record<string, unknown>` |
| `services/copyrightDisputeApi.ts` | ~6 | Ép DTO từ unknown |
| `services/authService.ts` | ~5 | POST helpers |
| Khác (analytics, annotation, admin, etc.) | ~56 | Rải rác |

**Nguyên nhân gốc:** `openapi-fetch` `createClient<paths>()` trả type chính xác nhưng nhiều service cast qua `unknown` để tương thích wrapper `apiOk`. Cần refactor wrapper hoặc sửa generic type.

---

## §E — Dead Exports & Orphan Files

### E1. Dead exports (exported nhưng không import ở đâu)

| File | Export | Ghi chú |
|------|--------|---------|
| `services/performerService.ts` | `performerService` | Toàn file không được import |
| `services/qaConversationService.ts` | `createQAConversationOpenApi`, `fetchQAConversationsOpenApi` | Chỉ nội bộ |
| `services/qaMessageService.ts` | `getMessageById` | Không gọi |
| `services/qaMessageService.ts` | `*Legacy` exports (4 hàm) | Không gọi |
| `services/errorReporting.ts` | `setErrorReporter` | Không gọi từ bên ngoài |
| `services/expertWorkflowService.ts` | `EXPERT_MODERATION_STATE_KEY`, `EXPERT_REVIEW_NOTES_KEY` | Chỉ nội bộ |
| `services/researcherChatService.ts` | `ChatResponseBody` | Chỉ trong file |
| `services/api.ts` | `ApiVoidResponse` | Chỉ trong file |
| `utils/validation.ts` | `validateAudioFile`, `validateImageFile`, `validateEmail`, `validatePassword` | Chỉ test import |
| `utils/youtube.ts` | `getYouTubeId` | Chỉ test import; app dùng `isYouTubeUrl` |
| `hooks/useAsyncData.ts` | `useAsyncData` | Chỉ test import |

### E2. Orphan files / pages

| File | Vấn đề |
|------|--------|
| `pages/TermsPage.tsx` | Không có route trong `App.tsx` |
| `components/knowledge-graph/KnowledgeGraphViewer.tsx` | Chỉ re-export từ `features/...`; không ai import qua path này |
| `components/features/kb/index.ts` | Barrel; mọi nơi import trực tiếp component, không qua barrel |

---

## §F — Broken Imports

| File | Import | Vấn đề |
|------|--------|--------|
| ~~`services/recordingStorage.ts`~~ | ~~`import { isUuid } from '@/utils/validation'`~~ | **Đã sửa** trong phiên hiện tại (thêm `isUuid` vào `validation.ts`) |

> Không phát hiện thêm broken import khác qua quét tĩnh. Nên chạy `tsc --noEmit` để xác nhận 100%.

---

## §G — Naming & Pattern Inconsistencies

### G1. File naming

| Vấn đề | File | Kỳ vọng |
|--------|------|---------|
| Không phải hook nhưng nằm trong `hooks/` | `hooks/notificationPollConstants.ts` | Nên chuyển sang `config/` hoặc `features/notification/` |
| Hậu tố service không thống nhất | `*Service.ts` vs `*Api.ts` vs `*Storage.ts` | Rule cho phép cả hai nhưng gây nhầm |

### G2. Export pattern (default vs named)

| Nhóm | Pattern | Ghi chú |
|------|---------|---------|
| **Pages** | `export default` | Nhất quán |
| **Components** | **Hỗn hợp**: ~78 file `export default`, ~20 file `export function` | Không có rule rõ ràng |
| **Services** | Chủ yếu named; `api.ts` + `storageService.ts` có default | Hỗn hợp |

### G3. API URL pattern

| Style | Ví dụ | Dùng ở |
|-------|-------|--------|
| PascalCase segment | `/api/Recording`, `/api/Submission` | Phần lớn openapi-fetch calls |
| kebab-case | `/api/kb-entries` | `knowledgeBaseApi.ts` |
| Lowercase | `/api/search/semantic` | `semanticSearchService.ts` |
| Không prefix `/api` | `/performers` | `performerService.ts` (base URL đã có `/api`) |

> Phản ánh style backend không nhất quán — không phải lỗi FE.

---

## §H — Error Handling Inconsistencies

### H1. Service layer

| Pattern | Services dùng |
|---------|---------------|
| **throw** (để caller xử lý) | `submissionService`, `authService`, `adminApi` |
| **return `[]` / `{}` / sentinel** (nuốt lỗi) | `metadataSuggestService`, `expertModerationApi.buildSubmissionLookupMaps`, `recordingStorage` |
| **return string** (nhét lỗi vào message) | `researcherChatService` |
| **silent catch** (`catch { /* ignore */ }`) | `notificationHub` listeners |

### H2. Page/component layer

| Pattern | Pages dùng |
|---------|------------|
| **`console.error` + không UI** | `ApprovedRecordingsPage`, `HomePage`, `SearchPage`, `EditRecordingPage` |
| **`uiToast`** | `ContributionsPage`, `ProfilePage`, `LoginPage`, `RegisterPage` |
| **Cả hai** | `ModerationPage`, `ResearcherPortalPage`, `ChatbotPage` |

### H3. Status extraction từ error

Nhiều chỗ dùng `axios.isAxiosError(err)` nhưng `apiOk` (openapi-fetch) throw **Error thường** (không phải AxiosError) với `.response.status` gắn thủ công → `axios.isAxiosError` return `false` → **không đọc được HTTP status**.

**Đã sửa một phần** trong phiên này (`ContributionsPage.tsx`, `submissionService.ts`) bằng cách thêm fallback `(err as { response?: { status?: number } })?.response?.status`.

**Còn lại:** mọi file khác dùng `axios.isAxiosError` để đọc status từ lỗi `apiOk` đều có cùng vấn đề.

---

## §I — Env & Config Sync

### I1. Ma trận biến `VITE_*`

| Biến | `.env` | `.env.dev` | `.env.prod` | Code có fallback? |
|------|--------|------------|-------------|-------------------|
| `VITE_API_BASE_URL` | ✅ | ✅ | ✅ | ✅ `'/api'` |
| `VITE_APP_NAME` | ✅ | ✅ | ✅ | ✅ `'VietTune'` |
| `VITE_VIETTUNE_AI_BASE_URL` | ❌ | ✅ | ❌ | ✅ → `API_BASE_URL` |
| `VITE_VIETTUNE_AI_CHAT_PATH` | ❌ | ❌ | ❌ | ✅ fallback path |
| `VITE_SUPABASE_URL` | ✅ | ❌ | ❌ | ❌ **throw nếu thiếu** |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ❌ | ❌ | ❌ **throw nếu thiếu** |
| `VITE_SUPABASE_BUCKET` | ✅ | ❌ | ❌ | ❌ cần env |
| `VITE_EXPERT_API_PHASE2` | ✅ | ✅ | ✅ | ✅ |
| `VITE_EXPERT_QUEUE_SOURCE` | ✅ | ❌ | ❌ | ✅ `'by-status'` |
| `VITE_RESEARCHER_VERIFIED_SUBMISSION_STATUS` | ❌ | ❌ | ❌ | ✅ default |
| `VITE_SENTRY_DSN` | ❌ | ❌ | ❌ | ✅ disabled |

### I2. Rủi ro cao nhất

1. **Supabase vars chỉ trong `.env` (gitignored)** → Clone sạch / CI chỉ có `.env.development` → **`supabaseClient.ts` throw** khi module load.
2. **`vite-env.d.ts`** không khai báo `VITE_SUPABASE_*`, `VITE_SENTRY_DSN`, `VITE_RESEARCHER_VERIFIED_SUBMISSION_STATUS` → TypeScript không cảnh báo typo.
3. **Proxy `vite.config.ts`** hardcode Azure URL → phải đồng bộ thủ công với `VITE_API_BASE_URL`.
4. **CI workflow** (`e2e.yml`) không inject `VITE_*` → phụ thuộc file env đã commit.

---

## §J — Stores Không Dùng

| Store | File | Ghi chú |
|-------|------|---------|
| `usePlayerStore` | `stores/playerStore.ts` | Không có import ngoài file |
| `useSearchStore` | `stores/searchStore.ts` | Không có import ngoài file |

**AuthContext + useAuthStore:** Hai lớp (React Context wrapper + Zustand store) cho cùng auth state — không hẳn duplicate nhưng là pattern kép.

---

## §K — Kế hoạch sửa (ưu tiên)

### 🔴 P0 — Bugs / sẽ crash

| # | Vấn đề | File(s) | Hành động |
|---|--------|---------|-----------|
| 1 | `axios.isAxiosError` không nhận lỗi từ `apiOk` → bỏ qua HTTP status | Nhiều file dùng pattern này | Tạo helper `getHttpStatus(err)` dùng chung |
| 2 | Supabase vars thiếu trên CI/clone sạch → throw | `supabaseClient.ts` | Thêm vào `.env.development` + `.env.production` (hoặc lazy init) |
| 3 | `vite-env.d.ts` thiếu khai báo nhiều `VITE_*` | `vite-env.d.ts` | Bổ sung tất cả biến đang dùng |

### 🟡 P1 — Tech debt rõ ràng

| # | Vấn đề | Hành động |
|---|--------|-----------|
| 4 | Dual client (QAConversation, QAMessage) — openapi-fetch + axios legacy | Xóa `*Legacy` exports; migrate hết sang `apiFetch` |
| 5 | `performerService.ts` không dùng | Xóa hoặc wire vào UI |
| 6 | Dead stores (`playerStore`, `searchStore`) | Xóa nếu không có plan dùng |
| 7 | Dead exports (~15 hàm/type) | Xóa |
| 8 | `TermsPage.tsx` không route | Thêm route `/terms` hoặc xóa |
| 9 | Barrel `kb/index.ts` không ai import | Xóa hoặc wire lại |
| 10 | `~118` unsafe casts | Refactor `apiOk` generic / service wrappers |

### 🟢 P2 — Cải thiện consistency

| # | Vấn đề | Hành động |
|---|--------|-----------|
| 11 | Component export mixed default/named | Chọn convention, enforce bằng ESLint rule |
| 12 | Error handling hỗn hợp (throw vs return vs silent) | Đặt rule: services throw, pages toast |
| 13 | `hooks/notificationPollConstants.ts` sai vị trí | Chuyển sang `config/` hoặc `features/` |
| 14 | Unused types (`SearchResult`, `UploadRecordingForm`, etc.) | Xóa |
| 15 | Types không trong barrel (`graph.ts`, `chat.ts`, `mutationResult.ts`) | Thêm vào `types/index.ts` |
| 16 | Duplicate KB DTO types (`types/` vs `api/adapters`) | Gộp, dùng alias duy nhất |

### ⚪ P3 — Nice-to-have

| # | Vấn đề | Hành động |
|---|--------|-----------|
| 17 | ~50+ swagger endpoints chưa dùng | Liệt kê rõ, đánh dấu "planned" hoặc "not needed" |
| 18 | Proxy URL hardcode | Đọc từ env hoặc sync script |
| 19 | Service hậu tố `*Api` vs `*Service` | Chuẩn hóa naming rule |
| 20 | Auth case mismatch (`/auth/*` vs `/api/Auth/*`) | Verify với backend, align |

---

## Phase X — Verification Checklist

- [ ] `tsc --noEmit` pass (0 error)
- [ ] `npm run build` pass
- [ ] Tất cả lỗi `axios.isAxiosError` trên `apiOk` error đã có fallback
- [ ] Supabase vars có trong `.env.development` hoặc lazy init
- [ ] `vite-env.d.ts` khai báo đủ `VITE_*` vars
- [ ] Dead exports đã xóa
- [ ] Dead stores đã xóa
- [ ] `TermsPage` có route hoặc đã xóa
- [ ] Dual client legacy exports đã migrate
- [ ] ESLint import/no-unresolved pass
