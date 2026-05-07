# VietTune Master Priority Map — Roadmap thực chiến trước Demo / Defense / Production

> Mục tiêu tài liệu: gom các PLAN rời rạc của VietTune thành một roadmap tổng hợp, có thứ tự ưu tiên rõ ràng để team biết **làm gì trước, làm gì sau, cái gì nên bỏ qua nếu thiếu thời gian**.  
> Góc nhìn sử dụng: project lead / technical reviewer / defense preparation.

---

## 1. Executive Summary

VietTune hiện đã vượt mức một web app CRUD thông thường. Dự án đã có nhiều mảng mang tính “research digital archive platform” như:

- Contributor upload workflow
- Expert moderation workflow
- Researcher intelligence suite
- Knowledge graph
- Semantic / AI Q&A direction
- Academic export
- Notification inbox
- Toast architecture
- E2E planning theo role
- Production-readiness audit
- UI consistency audit

Tuy nhiên, số lượng PLAN hiện tại khá nhiều nên rủi ro lớn nhất không còn là “thiếu ý tưởng”, mà là:

1. **Làm quá nhiều thứ cùng lúc**
2. **Refactor sai thời điểm**
3. **Feature đã có nhưng chưa được verify đủ**
4. **Flow quan trọng bị phân mảnh giữa UI / localStorage / API**
5. **Demo nhìn đẹp nhưng regression không được kiểm soát**

Vì vậy roadmap này chia toàn bộ công việc thành 4 mức ưu tiên:

| Priority | Ý nghĩa |
|---|---|
| **P0** | Bắt buộc trước demo / defense / merge lớn |
| **P1** | Rất nên làm trước khi freeze code |
| **P2** | Làm sau khi core ổn định |
| **P3** | Có thể để sau defense / post-release |

---

# 2. P0 — BẮT BUỘC trước demo / defense

Đây là nhóm ảnh hưởng trực tiếp đến việc hệ thống có chạy được, demo được, và bảo vệ được trước hội đồng hay không.

---

## P0.1 — Combined E2E Release Gate toàn role

### Mục tiêu

Tạo một release gate E2E tổng hợp để đảm bảo khi sửa một role không làm vỡ role khác.

### Vì sao là P0?

VietTune có nhiều role:

- Guest
- Contributor
- Expert
- Researcher
- Admin

Các role này liên kết chặt nhau qua các workflow:

```text
Contributor upload
      ↓
Expert moderation
      ↓
Recording public / Researcher discovery
      ↓
Admin monitoring / notification / analytics
```

Nếu chỉ test từng module riêng lẻ thì vẫn có thể bị lỗi cross-role.

### Plan liên quan

- `PLAN-test-e2e-contributor.md`
- `PLAN-test-e2e-expert.md`
- `PLAN-test-e2e-researcher.md`
- `PLAN-test-e2e-production.md`

### Việc cần làm

Tạo script tổng hợp:

```bash
npm run test:e2e:release
```

Gợi ý nội dung script:

```bash
npm run build &&
npx playwright test \
  tests/e2e/contributor*.spec.ts \
  tests/e2e/expert*.spec.ts \
  tests/e2e/researcher-phase1.spec.ts \
  tests/e2e/researcher-phase2.spec.ts \
  tests/e2e/researcher-phase3.spec.ts \
  tests/e2e/researcher-phase4.spec.ts
```

Nếu repo đã có tên spec cụ thể khác, cập nhật theo file thật.

### Acceptance Criteria

- Contributor specs pass
- Expert specs pass
- Researcher phase 1–4 specs pass
- Build pass trước khi chạy E2E
- Có test artifacts trong `test-results/`
- Chạy ít nhất 1 lần full release gate trước demo

### Nếu thiếu thời gian

Chạy tối thiểu:

```text
1. login contributor
2. upload contribution
3. login expert
4. moderation approve/reject
5. login researcher
6. search/filter/detail
```

---

## P0.2 — Upload Flow ổn định hoàn toàn

### Mục tiêu

Đảm bảo contributor có thể upload, save draft, submit, edit/resubmit mà không lỗi.

### Vì sao là P0?

Upload là luồng nhập dữ liệu chính của VietTune. Nếu upload fail thì archive không có dữ liệu mới, moderation không có việc để xử lý, researcher không có corpus để khám phá.

### Plan liên quan

- `PLAN-upload-explore-ui.md`
- `PLAN-gps-tagging.md`
- `PLAN-input-validation.md`
- `PLAN-test-e2e-contributor.md`

### Checklist bắt buộc

#### Functional

- [ ] Contributor vào được `/upload`
- [ ] Guest bị chặn hoặc được yêu cầu login
- [ ] Upload audio hoạt động
- [ ] Upload video hoạt động
- [ ] Đi đủ 3 bước wizard
- [ ] Submit final thành công
- [ ] Save draft không crash
- [ ] Edit mode `?edit=true` load đúng data
- [ ] Resubmit sau edit hoạt động
- [ ] Validation hiển thị đúng khi thiếu field bắt buộc

#### GPS

- [ ] Bấm “Lấy vị trí hiện tại” lưu tọa độ thật
- [ ] Payload gửi `gpsLatitude` / `gpsLongitude` khác `0,0`
- [ ] Từ chối quyền GPS không crash
- [ ] Không có GPS vẫn submit được nếu location text hợp lệ

#### UI

- [ ] Layout theo Explore skin không phá logic
- [ ] Stepper 3 bước giữ đúng thứ tự
- [ ] Mobile stack ổn
- [ ] Modal hướng dẫn mở/đóng đúng

### Rủi ro lớn

`UploadMusic.tsx` là file rất lớn, nhiều logic nằm chung. Nếu sửa mạnh trước demo dễ phát sinh regression.

### Cách làm an toàn

1. Không refactor sâu trước khi flow pass
2. Chỉ sửa UI class / validation nhỏ
3. Sau khi flow ổn mới tách component ở P2

---

## P0.3 — Expert Moderation không flaky

### Mục tiêu

Đảm bảo expert có thể claim, review, approve/reject submission ổn định.

### Vì sao là P0?

Moderation là lõi chất lượng của VietTune. Đây là nơi thể hiện hệ thống không chỉ “upload rồi hiện ra”, mà có quy trình kiểm duyệt học thuật.

### Plan liên quan

- `PLAN-test-e2e-expert.md`
- `PLAN-moderation-explore-refactor.md`
- `PLAN-moderation-du-field.md`
- `PLAN-feature-gaps.md`
- `PLAN-review-role-functions.md`

### Checklist bắt buộc

#### Happy path

- [ ] Expert login
- [ ] Vào `/moderation`
- [ ] Thấy queue
- [ ] Chọn submission
- [ ] Claim submission
- [ ] Mở detail
- [ ] Approve thành công
- [ ] Submission biến mất khỏi queue hoặc đổi trạng thái đúng

#### Reject path

- [ ] Claim submission
- [ ] Reject khi thiếu lý do bị chặn
- [ ] Nhập lý do reject
- [ ] Submit reject thành công
- [ ] Contributor thấy trạng thái bị từ chối / cần cập nhật

#### Unclaim path

- [ ] Claim
- [ ] Unclaim
- [ ] Queue refresh đúng
- [ ] Item không còn locked bởi expert hiện tại

### Test nên bổ sung

Ba case này rất đáng thêm trước demo:

```text
1. Claim collision
2. Double approve protection
3. Stale queue refresh
```

### Cảnh báo

Khi refactor UI moderation theo Explore, phải giữ bất biến:

- Claim / Unclaim locking
- Role guard
- Approve / Reject payload
- Reject reason validation
- Expert workflow service contract

---

## P0.4 — QA Flag / AI Supervision phải dùng một nguồn sự thật

### Mục tiêu

Loại bỏ tình trạng AI flag flow bị tách giữa API và localStorage.

### Vì sao là P0/P1?

Nếu demo AI supervision mà Admin thấy một danh sách, Expert thấy danh sách khác, hệ thống sẽ bị đánh giá là thiếu nhất quán.

### Plan liên quan

- `PLAN-qa-ai-chatbot.md`
- `PLAN-qa-flag-retrain.md`
- `PLAN-feature-gaps.md`

### Hiện trạng cần xử lý

Có 3 luồng khác nhau:

| Nơi | Cơ chế | Vấn đề |
|---|---|---|
| ChatbotPage | API QAMessage flag/unflag | Đúng |
| AdminDashboard | API FlaggedResponseList | Đúng |
| ModerationPage AI tab | localStorage | Sai nguồn sự thật |
| ResearcherPortalPage | push localStorage thêm | Duplicate |

### Việc cần làm

#### Phase 1

- Xóa `pushAiResponseForExpertReview` khỏi ResearcherPortalPage
- Không ghi thêm `AI_RESPONSES_REVIEW_KEY`

#### Phase 2

- Moderation AI tab dùng API:
  - `fetchAllMessages`
  - filter `role === 1`
  - flag/unflag qua `qaMessageService`

#### Phase 3

- Reuse `FlaggedResponseList`
- Thêm `currentUserId` để lưu `correctedByExpertId`

#### Phase 4

Grep phải sạch:

```bash
rg "AI_RESPONSES_REVIEW_KEY" src/
rg "pushAiResponseForExpertReview" src/
rg "AiResponseForReview" src/
```

Tất cả nên trả về 0 kết quả.

### Acceptance Criteria

- [ ] Chatbot flag → Admin thấy
- [ ] Chatbot flag → Moderation AI tab thấy
- [ ] Expert correction lưu qua API
- [ ] Không còn localStorage AI review flow
- [ ] Admin flagged count khớp API

---

# 3. P1 — RẤT NÊN làm trước khi freeze code

Đây là nhóm không nhất thiết làm app “chạy được”, nhưng làm hệ thống trông chuyên nghiệp, dễ demo và ít lỗi hơn.

---

## P1.1 — UI Consistency Global

### Mục tiêu

Làm toàn bộ UI có cùng ngôn ngữ thiết kế: card, modal, button, typography, loading.

### Plan liên quan

- `PLAN-ui-consistency-audit.md`
- `PLAN-homepage-explore.md`
- `PLAN-upload-explore-ui.md`
- `PLAN-moderation-explore-refactor.md`

### Thứ tự nên làm

#### 1. Surface tokens

Tạo file:

```ts
src/utils/surfaceTokens.ts
```

Gợi ý:

```ts
export const SURFACE_CARD =
  'rounded-xl border border-neutral-200/80 bg-surface-panel p-4 sm:p-5 shadow-sm';

export const SURFACE_PANEL_GRADIENT =
  'rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg';

export const SURFACE_SECTION =
  'rounded-2xl border border-secondary-200/50 bg-surface-panel shadow-sm';
```

Áp dụng trước cho:

- RecordingDetailPage
- ExplorePage
- ContributionsPage
- ProfilePage
- SearchPage
- HomePage

#### 2. ModalShell

Tạo component chung:

```tsx
src/components/common/ModalShell.tsx
```

Props gợi ý:

```ts
type ModalShellProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
};
```

Dùng cho:

- Profile modal
- Moderation wizard dialog
- Contributions detail modal
- Login gateway modal nếu còn dùng
- Dispute report modal nếu phù hợp

#### 3. Button unify

Thay raw button bằng `<Button>` ở các flow chính:

- DisputeReportForm
- FlaggedResponseList
- DisputeListPanel
- ModerationClaimActions
- ModerationModals
- AdminDashboard destructive actions

### Acceptance Criteria

- [ ] Không còn hardcoded `#FFF2D6` trong modal chính
- [ ] Card/panel chính dùng token chung
- [ ] Destructive action dùng danger style
- [ ] Modal không bị lệch tone với Explore
- [ ] Không phá layout mobile

---

## P1.2 — Toast system hoàn thiện nhẹ

### Mục tiêu

Toast đã có wrapper tốt, chỉ cần harden thêm để tránh spam và đảm bảo consistency.

### Plan liên quan

- `PLAN-toast-message.md`
- `PLAN-toast-verify.md`

### Trạng thái tốt hiện tại

Đã có:

- `uiToast` wrapper
- Message catalog
- Không toast trong interceptor
- ESLint chặn import trực tiếp `react-hot-toast`
- Tách biệt toast tạm và notification inbox

### Việc nên bổ sung

#### Anti-duplicate toast

Thêm logic bỏ qua toast trùng trong 2 giây:

```ts
const recentToasts = new Map<string, number>();

function shouldShowToast(key: string, windowMs = 2000) {
  const now = Date.now();
  const last = recentToasts.get(key) ?? 0;

  if (now - last < windowMs) {
    return false;
  }

  recentToasts.set(key, now);
  return true;
}
```

Ứng dụng cho:

- upload submit
- moderation approve/reject
- network error
- validation warning

### Smoke checklist

- [ ] Login sai hiện error toast
- [ ] Upload submit success hiện success toast
- [ ] Moderation approve success hiện success toast
- [ ] Reject thiếu lý do hiện warning/error đúng
- [ ] Toast không bị modal che
- [ ] Offline mode hiện network error hợp lý

---

## P1.3 — Production smoke checklist

### Mục tiêu

Có checklist chạy tay nhanh trước demo hoặc trước khi gửi build.

### Plan liên quan

- `PLAN-test-e2e-production.md`
- `PLAN-test-data-manual.md`

### Smoke tối thiểu 15 phút

#### Guest

- [ ] Vào HomePage
- [ ] Vào ExplorePage
- [ ] Mở recording detail public
- [ ] Login gateway modal hoạt động nếu dùng

#### Contributor

- [ ] Login contributor
- [ ] Vào upload
- [ ] Upload / submit một bản test
- [ ] Vào contributions thấy item

#### Expert

- [ ] Login expert
- [ ] Vào moderation
- [ ] Claim item
- [ ] Approve hoặc reject test item

#### Researcher

- [ ] Login researcher
- [ ] Vào researcher portal
- [ ] Search/filter
- [ ] Mở graph / compare nếu có
- [ ] Export dataset nếu đã bật

#### Admin

- [ ] Login admin
- [ ] Vào dashboard
- [ ] User management load
- [ ] AI monitoring load
- [ ] Analytics load

### Severity matrix

| Severity | Ví dụ | Xử lý |
|---|---|---|
| Critical | Không login được, upload fail, moderation fail | Fix ngay |
| High | Search/researcher fail, export fail | Fix trước demo nếu dùng |
| Medium | UI lệch, toast sai | Fix nếu còn thời gian |
| Low | Copy, spacing nhỏ | Có thể để sau |

---

## P1.4 — Notification flow sync

### Mục tiêu

Notification inbox phải đồng bộ và không tạo duplicate.

### Plan liên quan

- `PLAN-notification-api.md`
- `PLAN-notification-web-flow.md`

### Việc nên chốt

1. Backend tự tạo notification cho event nào?
2. FE còn được gọi `addNotification` ở event nào?
3. Event nào phải giữ FE notification vì backend không auto?
4. Type PascalCase từ BE map sang snake_case FE thế nào?
5. Click notification route đến đâu?

### P1 checklist

- [ ] Header badge unread đúng
- [ ] NotificationPage unread đúng
- [ ] Mark read sync badge
- [ ] Delete notification nếu BE hỗ trợ
- [ ] Không duplicate notification cho event BE auto gửi
- [ ] Click notification điều hướng đúng

---

# 4. P2 — Làm sau khi core ổn định

Đây là nhóm cải thiện maintainability và performance, không nên làm mạnh khi đang sát demo nếu core chưa pass.

---

## P2.1 — Refactor UploadMusic.tsx

### Mục tiêu

Tách file upload lớn thành các component/hook nhỏ hơn.

### Vì sao để P2?

Refactor upload trước khi flow ổn có thể làm hỏng core flow. Nên làm sau khi:

- Upload E2E pass
- Manual smoke pass
- UI Explore skin ổn

### Plan liên quan

- `PLAN-production-ready-refactor.md`
- `PLAN-upload-explore-ui.md`

### Tách đề xuất

```text
features/upload/
  components/
    UploadWizard.tsx
    UploadStepper.tsx
    UploadSidebar.tsx
    steps/
      UploadMediaStep.tsx
      UploadMetadataStep.tsx
      UploadReviewStep.tsx
  hooks/
    useUploadWizard.ts
    useMediaUpload.ts
    useUploadSubmission.ts
    useUploadGps.ts
  utils/
    uploadValidation.ts
    uploadPayloadMapper.ts
```

### Rule khi refactor

- Mỗi PR chỉ tách 1 cụm
- Không đổi behavior
- Chạy E2E upload sau mỗi PR
- Không rename quá nhiều cùng lúc

---

## P2.2 — OpenAPI / Swagger migration cleanup

### Mục tiêu

Giảm type drift giữa FE và BE.

### Plan liên quan

- `PLAN-swagger-codegen.md`
- `PLAN-migrate-legacy-services.md`
- `PLAN-src-sync-audit.md`

### Việc nên làm

#### 1. Ưu tiên helper status/error

Tạo:

```ts
src/utils/apiError.ts
```

Gợi ý:

```ts
export function getHttpStatus(error: unknown): number | undefined {
  const maybe = error as {
    response?: { status?: number };
    status?: number;
  };

  return maybe.response?.status ?? maybe.status;
}
```

Vì audit cho thấy `axios.isAxiosError` không bắt được error từ `apiOk` trong một số trường hợp.

#### 2. Xóa legacy QA exports

- `createQAMessageLegacy`
- `flagMessageLegacy`
- `unflagMessageLegacy`
- các hàm không còn dùng

#### 3. Migrate service đơn giản trước

Ưu tiên:

- annotationApi
- embargoApi
- copyrightDisputeApi
- submissionVersionApi
- instrumentService
- ethnicityService

#### 4. HOLD những endpoint Swagger thiếu

Không cố ép:

- auth `/me`
- auth `/profile`
- performerService nếu Swagger chưa có
- metadataSuggest nếu không có spec
- geocode nếu không có spec

### Acceptance Criteria

- [ ] Không còn dual client cho QAMessage
- [ ] `api:generate` pass
- [ ] `tsc --noEmit` pass
- [ ] Không tăng thêm `as unknown as`
- [ ] Service mới dùng generated type khi có schema rõ

---

## P2.3 — Researcher hardening

### Mục tiêu

Hoàn thiện Researcher Intelligence Suite sau khi core role ổn.

### Plan liên quan

- `PLAN-researcher-intelligence-suite.md`
- `PLAN-search-nang-cao.md`
- `PLAN-semantic-search.md`
- `PLAN-semantic-search-frontend-integration.md`
- `PLAN-knowledge-graph.md`
- `PLAN-test-e2e-researcher.md`

### Việc nên làm

#### Advanced search

- normalize tiếng Việt có dấu / không dấu
- token matching
- debounce 120–180ms
- highlight match
- keyboard navigation dropdown

#### Semantic search

Cần phân biệt rõ:

| Loại | Hiện trạng |
|---|---|
| Semantic-like local scoring | FE có thể đã có |
| Semantic thật vector embeddings | Cần backend/vector API |
| RAG Q&A | Khác với search recording |

Không gọi là “semantic thật” nếu chỉ token overlap.

#### Knowledge graph

Hardening sau demo:

- graph empty state
- graph large dataset cap
- node click route
- depth 1/2 traversal
- performance guardrail

#### Export

- async export cancel/retry
- audit log
- payload benchmark

---

## P2.4 — Submission Version History manual verification

### Mục tiêu

Feature đã có plan tốt, cần verify runtime.

### Plan liên quan

- `PLAN-submission-version-history.md`

### Checklist

- [ ] `listBySubmission` trả đúng shape
- [ ] Timeline hiện trong ContributionsPage detail
- [ ] Timeline hiện trong ModerationPage detail
- [ ] Click version mở modal
- [ ] JSON diff render đúng
- [ ] Raw fallback khi JSON không chuẩn
- [ ] Auto-create version khi edit save
- [ ] Version create fail không block UX

---

# 5. P3 — Có thể để sau defense / post-release

Đây là nhóm tốt nhưng không nên chen vào nếu P0/P1 chưa hoàn tất.

---

## P3.1 — Typography perfection

### Lý do để sau

Typography scale giúp UI đẹp hơn nhưng không quyết định core workflow.

### Làm sau

- Page title scale
- Section heading scale
- Eyebrow style
- Text contrast sweep

---

## P3.2 — Loading skeleton toàn hệ thống

### Lý do để sau

Loading skeleton đẹp nhưng tốn thời gian polish.

### Làm sau

- `ListSkeleton`
- `CardSkeleton`
- `TableSkeleton`
- unify spinner usage

---

## P3.3 — Full toast automation

### Lý do để sau

Toast E2E dễ flaky, ROI thấp khi UI còn thay đổi.

### Làm sau

- test toaster mounted
- login fail toast
- upload success toast
- moderation warning toast

Manual smoke hiện đủ cho giai đoạn này.

---

## P3.4 — Whisper transcription UI nếu backend chưa sẵn

### Lý do để sau

Nếu backend Whisper chưa sẵn, FE làm trước dễ thành half-working feature.

### Làm sau khi có:

- transcription endpoint ổn
- status polling contract
- backend processing job rõ

---

# 6. Sprint Plan đề xuất

## Nếu còn 1 tuần

### Day 1

- Chạy release gate hiện có
- Fix fail E2E
- Check upload smoke

### Day 2

- Moderation hardening
- Thêm claim/stale/double approve checks nếu kịp

### Day 3

- QA flag unify API/localStorage
- Grep cleanup

### Day 4

- Surface tokens
- Modal hardcoded hex cleanup
- Button critical actions

### Day 5

- Production smoke manual
- Document known issues
- Freeze demo branch

### Day 6–7

- Buffer fix
- Prepare demo script
- Prepare screenshots / evidence

---

## Nếu còn 3 ngày

Chỉ làm:

```text
1. Release gate
2. Upload smoke
3. Moderation smoke
4. QA flag cleanup
5. Production smoke
```

Không refactor lớn.

---

## Nếu chỉ còn 1 ngày

Chỉ làm:

```text
1. Login all roles
2. Upload one contribution
3. Expert approve/reject
4. Researcher search/detail
5. Admin dashboard load
```

Ghi lại known limitations.

---

# 7. 5 file / khu vực nguy hiểm nhất

Đây là những nơi phải cẩn thận khi sửa.

## 1. UploadMusic.tsx

### Vì sao nguy hiểm

- File lớn
- Nhiều state
- Nhiều step
- Upload + validation + GPS + edit + submit chung một flow

### Rule

Không sửa nhiều logic cùng lúc.

---

## 2. ModerationPage.tsx

### Vì sao nguy hiểm

- Claim/unclaim
- Approve/reject
- Wizard
- Embargo
- Annotation
- AI tab
- Version history

### Rule

UI refactor phải giữ business invariant.

---

## 3. ResearcherPortalPage.tsx

### Vì sao nguy hiểm

- Search
- QA
- Graph
- Compare
- Export
- API/local state mix

### Rule

Không sửa nhiều tab trong một PR.

---

## 4. recordingRequestService.ts / notification services

### Vì sao nguy hiểm

- Notification
- Review request
- Read/unread
- Delete/edit request
- Có thể còn legacy axios/apiFetch mix

### Rule

Không migrate toàn file một lần nếu chưa có test.

---

## 5. auth / route guard layer

### Vì sao nguy hiểm

- Login redirect
- role guard
- researcher pending
- admin access
- protected pages

### Rule

Mọi thay đổi route guard phải test đủ role.

---

# 8. Defense Demo Script đề xuất

## 1. Guest impression

- HomePage
- ExplorePage
- Recording detail
- Login gateway semantic hook nếu có

Thông điệp:

> VietTune có public discovery layer cho khách.

---

## 2. Contributor flow

- Login contributor
- Upload recording
- Gắn metadata
- Gắn GPS nếu demo được
- Submit
- Vào Contributions xem trạng thái

Thông điệp:

> Hệ thống hỗ trợ đóng góp dữ liệu có cấu trúc.

---

## 3. Expert flow

- Login expert
- Vào moderation
- Claim submission
- Xem metadata/media
- Annotation / embargo nếu có
- Approve hoặc reject

Thông điệp:

> Dữ liệu không public ngay mà qua kiểm duyệt học thuật.

---

## 4. Researcher flow

- Login researcher
- Advanced search
- Graph
- Compare
- Export

Thông điệp:

> VietTune không chỉ lưu trữ mà hỗ trợ nghiên cứu học thuật.

---

## 5. Admin flow

- Login admin
- Dashboard
- Analytics
- AI monitoring
- User management
- Dispute/embargo nếu có

Thông điệp:

> Hệ thống có governance và vận hành.

---

# 9. Known Limitations nên nói trước nếu bị hỏi

Không nên giấu. Nên nói chủ động và chuyên nghiệp.

## Semantic search

Nếu vẫn local overlap:

> Hiện semantic search frontend có baseline ranking. Vector-based semantic retrieval được tách thành phase backend với embedding/vector store để đảm bảo scalability.

## Whisper transcription

Nếu backend chưa sẵn:

> UI transcription được thiết kế theo contract, nhưng pipeline Whisper cần backend job processing và sẽ được triển khai sau khi ổn định ingestion.

## Mobile app

Nếu không có app:

> Mobile hiện được hỗ trợ ở mức responsive web/PWA direction; native mobile nằm ngoài scope release hiện tại.

## Scale

Nếu chưa pgvector:

> Vector hiện có thể lưu ở PostgreSQL JSON / hoặc baseline local ranking. Khi scale lớn, hướng tối ưu là pgvector hoặc vector index chuyên dụng.

---

# 10. Final Go / No-Go Checklist

## Go nếu đạt

- [ ] Build pass
- [ ] Lint pass
- [ ] Contributor smoke pass
- [ ] Expert moderation smoke pass
- [ ] Researcher search/detail pass
- [ ] Admin dashboard load pass
- [ ] No critical console errors
- [ ] No broken route guard
- [ ] Demo script chạy được từ đầu đến cuối

## No-Go nếu có

- [ ] Không login được
- [ ] Upload không submit được
- [ ] Expert không approve/reject được
- [ ] Researcher portal crash
- [ ] Admin dashboard crash
- [ ] Routing guard redirect loop
- [ ] API env missing làm app trắng màn hình

---

# 11. Kết luận

VietTune hiện đã có nền tảng rất mạnh cho một capstone / senior project:

- Có role rõ
- Có workflow đóng góp / kiểm duyệt
- Có researcher intelligence
- Có governance
- Có AI supervision
- Có testing mindset
- Có production refactor roadmap

Điểm cần tập trung lúc này không phải thêm thật nhiều feature mới, mà là:

```text
Stabilize core flows
Unify data source
Harden E2E
Polish UI consistency
Avoid risky refactor before demo
```

Nếu team đi đúng roadmap này, VietTune có thể đạt mức:

```text
Strong senior capstone / near-production research archive prototype
```

---

## Appendix A — Quick Priority Table

| Priority | Work item | Làm ngay? |
|---|---|---|
| P0 | Combined E2E release gate | Có |
| P0 | Upload flow stable | Có |
| P0 | Moderation stable | Có |
| P0 | QA flag API unified | Có |
| P1 | Surface tokens | Nên |
| P1 | ModalShell | Nên |
| P1 | Toast anti-duplicate | Nên |
| P1 | Notification sync | Nên nếu còn thời gian |
| P2 | UploadMusic split | Sau core |
| P2 | OpenAPI cleanup | Sau core |
| P2 | Researcher hardening | Sau core |
| P3 | Typography polish | Sau defense |
| P3 | Loading skeleton | Sau defense |
| P3 | Full toast automation | Sau defense |
| P3 | Whisper UI | Chờ backend |

---

## Appendix B — Command gợi ý

```bash
npm run lint
npm run build
npm run test:unit
npm run test:e2e
```

Nếu tạo release gate riêng:

```bash
npm run test:e2e:release
```

Nếu check code cleanup:

```bash
rg "AI_RESPONSES_REVIEW_KEY" src/
rg "pushAiResponseForExpertReview" src/
rg "as unknown as" src/services/
rg "react-hot-toast" src/
rg "alert\(" src/
```

Nếu sync Swagger:

```bash
npm run api:pull
npm run api:generate
git diff -- src/api/swagger.json src/api/generated.d.ts
```

---

## Appendix C — Definition of Done cho demo branch

Một demo branch được coi là đủ an toàn khi:

- Core role flow chạy được
- Không có critical UI crash
- Không có localStorage/API split ở AI flag
- Có release gate hoặc ít nhất manual smoke log
- Có known limitations rõ ràng
- Có rollback branch hoặc commit checkpoint
