# PLAN: Functional Requirements vs Hiện Trạng (SP26SSE120)

**Slug:** `functional-contributor-expert`

## Phase -1 — Context Check
### Nguồn Functional Requirement & NFR
Từ file `docs/SP26SE120_VIETTUNE_ARCHIVE_INTELLIGENT_VIETNAMESE_TRADITIONA_HUNGLD5.docx` (CAPSTONE PROJECT REGISTER), các nhóm yêu cầu chính:
1. **Contributor Portal (Web & Mobile)**: wizard nhiều bước, metadata có cấu trúc, GPS tagging/oral history, AI-assisted suggestions, track status qua review pipeline + version history.
2. **Expert Verification Portal (Web)**: review UI, annotation tools, workflow 3-stage, AI response supervision, collaborative knowledge base editing.
3. **Research & Discovery Interface (Web & Mobile)**: advanced search/faceted filters, semantic search, AI Q&A, knowledge graph, comparative tools, export datasets.
4. **Administrative Dashboard (Web)**: user management (assign expert roles), analytics, AI monitoring, content moderation (copyright/embargo).
5. **AI-powered capabilities**: semantic search engine (embeddings), intelligent Q&A (RAG), audio analysis (Whisper/Librosa), metadata suggestions cần expert verify, knowledge graph visualization.
6. **Backend đề xuất**: REST API + (tùy chọn) GraphQL.
7. **Non-functional requirements**: performance, storage, compatibility, security (RBAC, audit logging, encrypted storage).

### Mục tiêu của plan
So sánh **yêu cầu chức năng (functional)** và **phi chức năng (NFR)** ở trên với:
- các feature hiện có trong project (UI modules + service layer + E2E specs/route surfaces đã có),
- sau đó lập bảng “Feature / Đang có / Thiếu / Ưu tiên / Việc cần làm” để làm checklist triển khai/validation.

## Phase 0 — Socratic Gate (Cần xác nhận trước khi chốt gap)
1. **“Hiện trạng” được so với mức nào?**
   - (a) Chỉ UI/flow trong FE (route/component/service tồn tại và chạy),
   - (b) UI/flow + contract backend (endpoint/payload/validation khớp),
   - (c) UI/flow + backend có dữ liệu thực (đảm bảo không chỉ mock/local).
2. **AI-powered capabilities trong scope hiện nay là:**
   - (a) mock/simulated (không gọi AI thật),
   - (b) gọi service AI thật,
   - (c) hybrid (gọi một phần).
3. **Mobile app**:
   - Nếu project hiện chỉ có Web, có coi “Mobile requirements” là “đích tương lai” (P2/P3) hay bắt buộc có ngay?

> Trong plan này, mặc định lựa chọn để làm việc ngay:
- “Hiện trạng” = (a) UI/flow chạy + service abstraction tồn tại; ưu tiên kiểm chứng bằng E2E/smoke hiện có.
- AI-powered = hybrid, chấp nhận mock ở một số phần nếu docs/E2E đã mô tả.
- Mobile = mô tả là future scope (P2), trừ khi project thực sự có app client.

## Phase 1 — Mapping Requirements -> Feature (tách theo domain)
### 1. Contributor Portal
Feature nhóm A:
- Multi-step submission wizard
- Structured metadata forms
- GPS tagging + interview/oral history tools
- AI-assisted metadata suggestions
- Track submission status via review pipeline + version history

### 2. Expert Verification Portal
Feature nhóm B:
- Review interface (listen + metadata + reference compare)
- Annotation tools (notes, transcription correction, links, rare variants)
- Three-stage workflow (screening → detailed verification → final approval)
- AI response supervision (review chatbot answers + flag + corrections)
- Collaborative knowledge base editing

### 3. Research & Discovery
Feature nhóm C:
- Advanced search + faceted filters (ethnic/instrument/ceremony/geo→commune)
- Semantic search (natural language + comparison across groups)
- AI Q&A with citations
- Knowledge graph interactive exploration
- Comparative tools (side-by-side playback + transcription diff + expert commentary)
- Export academic datasets

### 4. Administrative Dashboard
Feature nhóm D:
- User management & expert assignment
- Analytics (coverage gaps + trends + quality)
- AI monitoring
- Content moderation (copyright disputes/embargo/embarrassing content removal)

### 5. AI-powered Capabilities
Feature nhóm E:
- Semantic Search Engine (vector embeddings)
- Intelligent Q&A (RAG)
- Audio analysis (Whisper transcription + feature extraction)
- Metadata suggestions (requires expert verification)
- Knowledge graph visualization

### 6. Backend Contract
Feature nhóm F:
- REST API (và optional GraphQL)
- Contract consistent payload & error handling

### 7. Non-functional requirements
Feature nhóm G:
- Performance targets
- Storage targets (50k+ audio FLAC)
- Compatibility targets
- Security targets (RBAC + audit + encrypted storage)

## Phase 2 — Compare với hiện trạng project (cách làm & bằng chứng)
### Cách compare
1. Với mỗi Feature row ở Phần bảng, xác định:
   - **Đang có**: route/component exists + service layer exists + có E2E/smoke hoặc có ui texts/logic evidence.
   - **Thiếu**: requirement không có trace trong code paths/route surface; hoặc có nhưng chỉ là stub/mocked mà không có verification path.
2. Đối với AI/NFR, dùng “evidence loại 1/2”:
   - Loại 1: có gọi API/feature tương ứng (network calls hoặc service wrapper rõ ràng).
   - Loại 2: chỉ có mock/simulated (docs/E2E mô tả hoặc code chỉ fake).

### Evidence candidates (để dùng khi chốt gap)
- Contributor surfaces: `src/pages/UploadPage.tsx`, `src/components/features/UploadMusic.tsx`, `src/pages/ContributionsPage.tsx`, và spec `tests/e2e/11-contributor-flow-assertions.spec.ts`.
- Expert surfaces: `src/pages/ModerationPage.tsx`, `src/services/expertWorkflowService.ts`, `src/services/expertModerationApi.ts`, `src/config/expertWorkflowPhase.ts`, và spec `tests/e2e/*expert*`.
- Search/Explore surfaces: `src/pages/ExplorePage.tsx` + `FilterSidebar` + `ExploreSearchHeader`.
- Notifications/Toast: `src/pages/NotificationPage.tsx`, `src/components/layout/Header.tsx`, `src/services/recordingRequestService.ts`, và wrapper `src/uiToast/*`.
- Docs plan/inventory: `docs/PLAN-*` hiện có (upload/explore/contributor/e2e/expert/notification/toast).

## Phase 3 — Feature Gap Table (docs requirements vs hiện trạng)
Quy ước:
- **Ưu tiên**: P0/P1/P2/P3 theo ảnh hưởng “core journey” và release gate.
- **Thiếu** mô tả theo hướng “cần xác nhận” nếu evidence chưa đủ trong giai đoạn lập plan.

| Feature (nhóm) | Đang có (tóm tắt hiện trạng) | Thiếu / Gap (cần xác nhận/chốt) | Ưu tiên | Việc cần làm (next actions) |
|---|---|---|---|---|
| Contributor Wizard & metadata struct | Có wizard 3 bước + metadata forms; có field GPS qua `recordingLocation` (E2E contributor plan) | Gap: “oral history/interview recording tools” (nghe/phỏng vấn/tải file phỏng vấn) chưa thấy bằng chứng rõ trong code; cần xác nhận có UI + payload submit | P0 | Chạy E2E contributor; xác minh section “oral history/interview” tồn tại; nếu không có thì cập nhật scope (GPS-only ở P0) |
| Contributor AI-assisted suggestions | `suggestMetadata` gọi backend `MetadataSuggest` (AI gợi ý ethnicity/region/instruments) + merge vào Step 2/3 | Gap: gating “expert verification before acceptance” cho metadata đề xuất (hiện tại là flow góp ý hay auto-accept) | P1 | Kiểm tra luồng UX: AI suggestion -> user confirm -> submit payload; assert metadata vẫn phải qua moderation |
| Submission status pipeline + version history | Có track submission status + `/contributions` status tabs + detail modal (E2E) | Gap: “version history” theo nghĩa lịch sử phiên bản submission/recording chưa thấy UI/history rõ; cần xác nhận/định nghĩa lại | P1 | Tìm UI element “version/history” hoặc compare theo submissionId; nếu không có, ghi rõ scope hiện tại chỉ status |
| Expert review workflow (3-stage) | Có moderation queue/workflow + approve/reject/notes (local Phase 1 + service Phase 2) | Gap: map chính xác 3-stage (screening→detailed→final) tới UI stages/int statuses trong `ModerationPage` và backend statuses | P0 | Audit `ModerationPage` stage mapping; chạy E2E expert: claim→approve + claim→reject |
| Expert annotation tools + correction | Có tab “Kho tri thức” trên `ModerationPage` + hiển thị citations (kèm hint Nguồn trích dẫn do Researcher gửi kèm) | Gap: “collaborative knowledge base editing”/rich-text/citations persistence (thêm/sửa/xóa entry) chưa thấy đủ evidence; admin knowledge update có text “sẽ kết nối khi backend sẵn sàng” | P2 | Xác minh thao tác editor tri thức có CRUD thực không; nếu chỉ hiển thị thì đưa phần “editor” về P3/P2 backlog |
| Expert AI supervision (chatbot answers review) | `ModerationPage` có tab liên quan “Giám sát phản hồi AI” + `AI_RESPONSES_REVIEW_KEY`; `AdminDashboard` có AI monitoring UI + xử lý cờ | Gap: flow “flag/correct” -> persistence (AuditLog/record) -> hiển thị trở lại cho expert/reviewer | P2 | Smoke tab “Giám sát phản hồi AI”: report/flag -> UI cập nhật; đối chiếu service persistence nếu backend sẵn sàng |
| Research advanced search + faceted filters | Có Search/Explore/facets theo thiết kế `ExplorePage` + sidebar filter (docs plan) | Gap: “đủ range” (54 ethnic / 200+ instruments / geo→commune) và behavior apply/reset; cần đo thực options trong chạy thật hoặc mock đủ | P1 | Manual/E2E: mở facet, chọn vài option đại diện, bấm Áp dụng/Xóa; kiểm tra số lượng & kết quả |
| Semantic search | Có `SemanticSearchPage` + route `semantic-search` | Gap: hiện tại semantic search là local scoring (token overlap) sau khi fetch recordings; chưa thấy vector embeddings / backend semantic ranking tích hợp | P1 | Gắn checklist evidence: semantic ranking backend call (nếu có) hay chỉ local; nếu backend chưa có thì cập nhật doc: semanticLocal |
| AI Q&A w/ citations | Có chatbot/Q&A UI: `ChatbotPage` (lưu conversation & tin nhắn) và Researcher portal tab “Hỏi đáp thông minh” | Gap: hiển thị citations/nguồn của câu trả lời + cơ chế “expert correction retrains” | P0/P1 | Smoke Q&A: verify có vùng citations/nguồn; nếu không có, chuyển sang P2 và định nghĩa “citation-level QA” |
| Knowledge graph interactive | Có knowledge graph trong `ResearcherPortalPage` (tab “Biểu đồ tri thức”, edges/nodes từ recordings đã kiểm duyệt) | Gap: mức interactivity (click node/edge -> filter/navigate recordings) cần xác nhận đúng intent | P2 | Manual: click vài node/edge, kiểm tra danh sách liên quan và route/modal behavior |
| Comparative tools | Có tab “So sánh phân tích” + highlight diff transcription trong `ResearcherPortalPage` | Gap: confirm “side-by-side playback” + diff highlight chính xác theo định nghĩa docs (và UX flow mở modal) | P2 | Manual: chọn 2 recordings, phát song song (nếu có) + xem diff highlight |
| Export academic datasets | Docs có yêu cầu export; code chưa thấy evidence rõ qua keyword search (export/dataset/download) | Gap: có UI export + endpoint + format file + include metadata | P2 | Rà UI/route: tìm trang button “Export/Download”; nếu chưa có thì đưa về backlog |
| Admin dashboard (user/experts/analytics/moderation) | Có `AdminDashboard` modules: users, analytics, aiMonitoring, moderation + legacy moderation actions; có phần cho AI monitoring UI | Gap: “coverage gaps analytics” và metric pipeline độ đầy đủ (đang có text “—/sẽ hiển thị khi backend sẵn sàng”) | P1 | Audit từng panel: data source + hiển thị; nếu placeholder thì đánh dấu limitation trong milestone |
| AI monitoring (chatbot accuracy metrics) | Có UI “Giám sát hệ thống AI” trong `AdminDashboard` (độ chính xác, flagged responses, knowledge) | Gap: metric accuracy pipeline thực sự lấy từ backend và hiển thị đúng; hiện có phần dựa on localStorage/placeholder | P2 | Smoke: kiểm tra flagged responses cập nhật theo hành vi flag thật |
| Content moderation (copyright/embargo) | `AdminDashboard` có mô tả xử lý tranh chấp bản quyền + embargo “triển khai đầy đủ khi backend sẵn sàng”; có legacy actions cho xóa/chỉnh sửa request | Gap: embargo/copyright dispute flow end-to-end | P1 | Verify UI có action end-to-end và backend mutations nếu có; nếu chỉ mô tả thì ghi limitation |
| Audio analysis & feature extraction (Whisper/Librosa) | Có mapping các field `tempo`/`keySignature` trong payload/recording DTO và hiển thị ở một số màn (ví dụ detail Tempo/Khóa nhạc) | Gap: pipeline Whisper/Librosa hoặc “extract tempo/key + transcription features” thực sự đang chạy (FE/backend) chưa thấy evidence; cần xác nhận ai/bước nào tạo tempo/keySignature | P2 | Smoke upload→submit: kiểm tra tempo/keySignature có được set/được fill từ analysis; xác nhận không chỉ là giá trị mặc định |
| Backend contract: REST + optional GraphQL | Có services layer | Cần đối chiếu error shapes, payload keys, and mapping in UI | P1 | Chạy integration checks ở local/staging (hoặc local mocks) |
| NFR performance (search/Q&A concurrency) | Có target trong docs | FE chỉ có thể kiểm chứng partial; cần đo real endpoints/metrics | P1 | Profiling plan: measure actual response times in smoke |
| Storage (50k+ FLAC) | Có upload/audio pipeline | Cần xác nhận format conversion + storage strategy | P2 | Verify upload supports FLAC archival quality; kiểm tra backend acceptance |
| Compatibility (iOS/Android) | Có web client | Mobile compatibility là future nếu app chưa có | P2 | Nếu chỉ web: ghi “Web compatibility” pass checklist; mobile để sau |
| Security (RBAC + audit + encrypted storage) | Có RBAC gate + concept audit (expert moderation audit) | Gap: encrypted storage (FE/backend) chưa thấy evidence; audit logging cần xác nhận server-side | P0 | Verify audit endpoint/mutations được gọi đúng (không chỉ local); ghi rõ encrypted storage là backlog nếu chưa có |

## Phase 4 — Execution Breakdown (kế hoạch đóng gap theo ưu tiên)
### Phase 4.1 (P0 Core journeys)
1. Contributor: submit wizard path pass ổn định (E2E contributor).
2. Expert: claim→review→approve/reject stable (E2E expert).
3. RBAC: đảm bảo role guard chặn truy cập sai.

### Phase 4.2 (P1 Experience & data consistency)
1. Explore faceted filters apply/reset consistent.
2. Notifications/inbox basics (badge+read/unread reflect).
3. AI features: nếu đang mock, ghi rõ “mock mode” và xác định “verification gate” tương ứng.

### Phase 4.3 (P2 AI/graph/collab tools & exports)
1. Knowledge graph interactive
2. Expert knowledge base editing with citations
3. Export datasets
4. Audio analysis helpers (tempo/key extraction if present)

## Phase X — Verification Checklist (Phase X trong plan)
### Core
- [ ] `Contributor`: upload→metadata→confirm submit→`/contributions` thấy item theo status
- [ ] `Expert`: login as expert→`/moderation`→claim→approve và assert item thay đổi state
- [ ] `Role guard`: guest/contributor blocked đúng theo route và in-page gates

### Functional completeness (theo từng feature row)
- [ ] Contributor: GPS tagging & oral history tools có UI + payload submit đúng
- [ ] Expert: annotation tools đúng scope + reject reason validation
- [ ] Explore: facets đủ data range theo docs (hoặc ghi rõ “subset in demo mode”)
- [ ] Search semantic: verify trả results phù hợp hoặc xác nhận mock mode
- [ ] AI Q&A: Q&A có citations/format; không crash với empty dataset
- [ ] Knowledge graph/comparative tools/export: tồn tại UI + hành vi đúng contract

### NFR (smoke/instrumentation)
- [ ] đo sơ bộ search response < 2s và Q&A < 4s trên local/staging (nếu có endpoint)
- [ ] security: audit logging (ít nhất verify FE gửi request audit đúng endpoint/shape)
- [ ] encrypted storage: ghi rõ policy nếu hiện trạng chưa implement server-side

## Agent Assignments
- Planner/Domain lead: chuẩn hóa requirement taxonomy & chốt “Feature rows” + ưu tiên
- Frontend specialist: mapping requirement→routes/components/services hiện hữu + bằng chứng
- QA/test engineer: chạy E2E/smoke theo checklist Phase X
- Backend/API specialist (khi cần): xác nhận contract & audit/performance security gaps

