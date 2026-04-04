---
description: Refactor ModerationPage (Expert queue + claim + approve/reject) theo phong cách ExplorePage
---

# PLAN: Refactor ModerationPage theo phong cách Explore

**Slug:** `moderation-explore-refactor`  
**Yêu cầu:** Refactor `ModerationPage` để UI/UX đi theo skin/layout của `ExplorePage` (grid 2 cột desktop, aside sticky, thẻ cream/secondary), nhưng **giữ bất biến** toàn bộ logic Claim/Unclaim (Locking), role guard, payload wizard/validation khi Approve/Reject.  
**Phạm vi tài liệu:** Chỉ kế hoạch — không bao gồm triển khai code trong tài liệu này.

---

## Phase -1 — Context check

### Tham chiếu Explore
- `src/pages/ExplorePage.tsx`: gradient nền, `max-w-7xl`, grid 2 cột desktop (`lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]`), `aside` sticky, thẻ `border-secondary-200/50`, style button và vùng loading/empty theo Explore.
- Tham chiếu “tab/skin” từ `src/components/features/ExploreSearchHeader.tsx`.

### Trang hiện tại
- `src/pages/ModerationPage.tsx`: monolithic workflow cho Expert (queue list + claim/unclaim + verification wizard + approve/reject + reject reason + AI/validation state + nhiều overlay/modal).
- `src/services/expertWorkflowService.ts`: overlay state + logic claim/unclaim/approve/reject (Phase 1/Phase 2).

### Bất biến (không đổi)
1. **Claim/Unclaim locking**: tuyệt đối giữ nguyên cách lock/overlay được áp dụng/clear khi Expert nhận việc hoặc bỏ nhận.
2. **Role guard**: flow chặn Guest/Contributor hoạt động như cũ (redirect hoặc show 403 Forbidden).
3. **Wizard interaction + validation**:
   - Cách Expert tương tác với metadata/AI verification status.
   - Validation bắt buộc khi nhập “Lý do Reject”.
   - Payload/trigger call API giữ nguyên contract hiện tại.

---

## Phase 0 — Quyết định đã chốt (stakeholder)

### 1. Phạm vi
- Tập trung toàn lực vào luồng **“Kiểm duyệt bản thu” của Expert**:
  - Danh sách Queue chờ duyệt
  - Claim/Unclaim
  - Approve/Reject (bao gồm phần nhập lý do reject, bước validation liên quan)
- Cắt ra khỏi scope (không refactor):
  - Lịch sử kiểm duyệt chung hệ thống
  - Quản lý roles/permissions ngoài luồng workflow hiện tại
  - Notes nội bộ không trực tiếp phục vụ workflow của Expert đang duyệt

### 2. Mục tiêu chính
- Chọn **C (Cả A và B)**:
  - A) Tách component/hook/state để giảm monolithic và giảm tech debt (nhưng không thay đổi business logic).
  - B) Refactor UI/layout theo skin/layout Explore.

### 3. E2E Testing
- **Bắt buộc** đưa vào kế hoạch.
- Tối thiểu cần E2E:
  - Role check: không đủ quyền → chặn
  - Happy path: Expert Claim 1 bài → Approve → bài biến mất khỏi queue
  - Alternative: Expert Claim → Unclaim → hoặc Reject (nhập lý do) thành công

---

## Phase 1 — UI Shell & Layout (Explore grid)

### 1.1 Root + gradient + max width
- Áp dụng “Explore skin”: gradient nền, `max-w-7xl`, padding/spacing tương tự Explore để đồng bộ tổng thể.

### 1.2 Grid 2 cột desktop + aside sticky
- Desktop:
  - `lg:grid` với `lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]`
  - **Aside sticky (left)** chứa:
    - Queue controls (search/filter/sort nếu có)
    - Queue list items (khoanh vùng tương tác: click/select)
  - **Main (right)** chứa:
    - Card/wizard workflow cho submission đang được chọn
    - Các action (Claim/Unclaim/Approve/Reject) và reject reason form
- Mobile:
  - Không drawer che màn hình như Explore filter drawer
  - Ưu tiên layout stack hoặc “details/accordion” để giữ queue và wizard có thể truy cập mà không phá layout.

### 1.3 Error/loading/empty theo Explore
- Thống nhất các state:
  - loading: spinner/placeholder theo Explore
  - empty: thông điệp rõ ràng, không dựa vào layout cũ
  - error: hiển thị thông điệp có thể tái thử

---

## Phase 2 — Component hóa (giữ business logic bất biến)

### 2.1 Tách thành các component “workflow bricks”
Mục tiêu: chia nhỏ theo trách nhiệm, nhưng logic claim/unclaim/approve/reject vẫn đi qua `expertWorkflowService`.

Gợi ý module hóa:
1. `ModerationQueuePanel`
   - Chứa filter/search/sort UI (nếu có)
   - Danh sách queue items
   - Emits sự kiện chọn submissionId
2. `ModerationClaimActions`
   - Buttons: Claim / Unclaim (và trạng thái disabled/loading nếu cần)
   - Không thay đổi contract service gọi lên server hoặc overlay
3. `ModerationVerificationWizard`
   - Render theo current step/state
   - Trả về “đã hoàn tất step” và “cần reject reason hay không”
4. `ModerationRejectReasonForm`
   - Form riêng biệt cho “Lý do Reject”
   - Validation bắt buộc + hiển thị lỗi theo UX cũ
   - Đảm bảo payload gửi xuống API không đổi shape/fields
5. `ModerationSubmissionCard` / `ModerationStageSummary`
   - Chỉ trình bày trạng thái stage và summary (nếu có)
6. `ModerationDetailMedia`
   - Audio/video play area (nếu đang nằm chung monolithic)

### 2.2 Extract hooks để giảm state spaghetti
- Tách hooks theo domain:
  - `useExpertQueue(source)`: lấy queue base và dedupe, quản lý refresh khi approve/reject/unclaim.
  - `useSubmissionOverlay(submissionId)`: bind overlay state từ `expertWorkflowService` sang UI.
  - `useModerationWizard(submissionId, overlay)`: quản lý step UI (không đụng claim/unclaim logic).

### 2.3 Giữ invariant claim/unclaim
- Tách UI khỏi logic locking:
  - UI chỉ gọi `expertWorkflowService.claimSubmission`/`unclaimSubmission`/`approveSubmission`/`rejectSubmission`.
  - Không tự “set state lock” ở cấp UI ngoài overlay service.

---

## Phase 3 — Refactor UI theo skin Explore (card/pills/buttons/modal)

### 3.1 Thống nhất “Explore card” cho các vùng chính
- Queue list container:
  - wrapper `rounded-2xl border border-secondary-200/50 bg-gradient-to-br ...`
- Wizard/detail container:
  - cùng token border/shadow/hover

### 3.2 Tab/pills (nếu workflow đang dùng tab)
- Nếu current `ModerationPage` có phân loại theo stage/status:
  - convert về các pattern giống `ExploreSearchHeader` (active ring, hover).
- Không thay đổi mapping stage/status logic.

### 3.3 Modal/overlay & animation
- Nếu có modal/overlay (confirmation, AI response, reject reason):
  - chuyển shell sang cream/secondary tokens giống Explore
  - giữ nguyên hành vi “đóng modal” và focus/keyboard (Escape, click outside nếu đang có).

---

## Phase 4 — A11y, Keyboard, Sticky offsets, QA

### 4.1 Keyboard & focus
- Focus management khi:
  - chọn queue item
  - bấm Claim/Unclaim
  - chuyển step wizard
  - mở/đóng reject reason modal/section
- đảm bảo role/aria cho các vùng chính:
  - queue list có thể dùng `list`/`role`
  - wizard step dùng heading/region hợp lý

### 4.2 Sticky offset khớp layout app
- Aside sticky `top-*` phải khớp `MainLayout` header padding (tham chiếu `UploadPage`/`ContributionsPage`).

### 4.3 Regression checklist (không đổi hành vi)
- Claim:
  - khi đã claim thì queue item bị lock hiển thị đúng
  - unclaim trả về trạng thái ban đầu đúng
- Approve:
  - sau approve, bài biến mất khỏi queue / không còn render ở stage đang duyệt
- Reject:
  - bắt buộc nhập lý do reject đúng điều kiện hiện tại
  - payload gọi API đúng (không đổi keys/fields)

---

## Phase 5 — E2E Testing (bắt buộc)

### 5.1 Test plan tối thiểu (khuyến nghị)
Tạo/hoặc cập nhật spec (tùy pipeline hiện có) theo các kịch bản sau:

1. **Role check**
   - Guest → truy cập `/moderation` bị chặn (redirect tới login hoặc hiển thị 403)
   - Contributor → chặn như cũ
   - Expert → hiển thị được queue heading

2. **Happy path**
   - Expert vào queue
   - Chọn 1 submission “đã được gắn tag test” (tham chiếu cách các spec hiện có dùng `[E2E-AUTO-TEST]` hoặc mechanism tương tự)
   - Claim 1 bài
   - Approve thành công
   - Assert bài không còn xuất hiện trong queue list

3. **Alternative path**
   - Expert Claim → Unclaim
   - Hoặc Expert Reject:
     - nhập “Lý do Reject”
     - submit reject thành công
     - Assert trạng thái/queue cập nhật đúng

### 5.2 Chiến lược selectors ổn định
- E2E ưu tiên:
  - `getByRole(...)` với `name` (tiêu đề button, heading, label form)
  - tránh dựa vào className/layout
- Trong refactor, giữ nguyên text/accessible names cho các button chính:
  - Claim/Unclaim
  - “Chuyển” giữa các bước wizard
  - Approve final / Reject final / Submit reject reason

### 5.3 Tiêu chí pass
- Tất cả kịch bản E2E pass ổn định (ít flaky nhất có thể)
- Không có regression về Locking (claim/unclaim không allow 2 expert cùng duyệt cùng item).

---

## Verification checklist (trước khi merge)
- [x] Desktop: grid 2 cột như Explore, aside sticky hoạt động, không làm vỡ layout wizard
- [x] Mobile: không drawer che màn; queue và wizard vẫn thao tác được
- [x] UI skin: các vùng container dùng border/shadow/gradient token Explore
- [x] Claim/Unclaim invariant: logic locking không đổi (không duplicate lock state ở UI)
- [x] Approve/Reject: validation “Lý do Reject” đúng và payload contract không đổi
- [x] Role guard: Guest/Contributor/Expert behavior như cũ
- [ ] E2E: role check + happy path + alternative path pass

### Trạng thái xác nhận nhanh (2026-03-31)
- Đã hoàn tất Phase 1-5 implementation cho moderation refactor theo plan.
- Type check pass (`npx tsc --noEmit`).
- Đã thêm spec Phase 5: `tests/e2e/09-moderation-explore-ui.spec.ts` + project `moderation-ui`.
- Mục E2E giữ unchecked cho đến khi chạy full runtime `npm run test:e2e:moderation` và xác nhận pass ổn định.

---

## Tài liệu tham chiếu (để implement)
- `src/pages/ExplorePage.tsx`
- `src/pages/ModerationPage.tsx`
- `src/services/expertWorkflowService.ts`
- Các spec hiện có: `tests/e2e/02-expert.spec.ts` (để giữ text/role selector tương thích)

