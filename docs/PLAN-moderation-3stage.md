# PLAN: 3-Stage Moderation Workflow — Hiển thị rõ Stage, Checklist, Progress

> **Slug**: `moderation-3stage`
> **Ngày tạo**: 2026-04-28
> **Trạng thái**: Draft — chờ review trước khi triển khai

---

## Mục tiêu

Làm rõ 3-stage moderation workflow **đã tồn tại ngầm** trong `ModerationVerificationWizardDialog` (step 1–3) nhưng chưa được thể hiện tường minh trên UI chính (queue sidebar, detail view, page header). Cụ thể:

1. **Initial Screening** (Bước 1 — Kiểm tra sơ bộ): `infoComplete`, `infoAccurate`, `formatCorrect`
2. **Detail Verification** (Bước 2 — Xác minh chuyên môn): `culturalValue`, `authenticity`, `accuracy`
3. **Final Publication** (Bước 3 — Đối chiếu & phê duyệt): `crossChecked`, `sourcesVerified`, `finalApproval`, `sensitiveContent`

Hiện tại ba bước này chỉ hiện **bên trong** wizard dialog khi expert đã claim. Ngoài dialog, expert không biết submission đang ở stage nào, checklist còn thiếu gì, và tỉ lệ hoàn thành tổng thể.

### Scope tường minh

- **Frontend moderation UI only** — không đổi API contract, không thêm endpoint.
- **Không redesign toàn bộ ModerationPage** — chỉ patch thêm stage indicator, mini-checklist, progress bar vào các component hiện có.
- Dữ liệu stage/checklist đã có sẵn trong `ModerationVerificationData` (localStorage overlay + `expertWorkflowService`). Chỉ cần đọc và hiển thị.

---

## Phase -1 — Context Check

### Dữ liệu stage đã có

| Nguồn | Nơi lưu | Cấu trúc |
|--------|---------|-----------|
| `expertWorkflowService.ts` | `localStorage` key `EXPERT_MODERATION_STATE` | `ExpertSubmissionLocalPatch.moderation.verificationStep` (1\|2\|3) |
| `expertWorkflowService.ts` | cùng key | `ExpertSubmissionLocalPatch.moderation.verificationData` → `{ step1, step2, step3 }` |
| `useModerationWizard.ts` | React state `verificationStep[id]`, `verificationForms[id]` | Đồng bộ với localStorage qua `updateVerificationStep` |

### UI hiện tại chưa hiển thị stage ở đâu ngoài wizard dialog

- `ModerationQueueSidebar`: card chỉ hiện title, status pill (`PENDING_REVIEW` / `IN_REVIEW` / …), submitter, ngày tạo.
- `ModerationDetailView`: hiện media + metadata + claim actions. Không hiện stage progress.
- `ModerationPageHeader`: hiện heading + count. Không hiện stage aggregation.
- `ModerationExpertTabNav`: tab-level navigation, không liên quan stage.

### Kế hoạch đã có liên quan (không trùng scope)

- `PLAN-moderation-explore-refactor` — Layout/grid refactor, đã hoàn tất Phase 1–5. Scope: shell, grid, skin. **Không trùng**: plan này thêm content vào slots đã tách.
- `PLAN-moderation-du-field` — De-dup field hiển thị. **Không trùng**: plan này thêm widget mới, không xóa field.

---

## Phase 0 — Quyết định đã chốt

### 1. Không đổi API contract

Stage data (`verificationStep`, `verificationData`) hiện chỉ tồn tại ở localStorage overlay. Plan này giữ nguyên cơ chế đó. Khi Phase 2 API có trường tương ứng, chỉ cần thay nguồn đọc, UI component không đổi.

### 2. Bốn điểm bổ sung UI

| # | Vị trí | Widget | Dữ liệu |
|---|--------|--------|----------|
| A | Queue sidebar — mỗi card (chỉ khi `IN_REVIEW` + `claimedBy === currentUser`) | **Stage badge** + mini progress dots (3 chấm) | `verificationStep` |
| B | Detail view — phía trên claim actions | **Stage progress bar** + tên stage hiện tại + tỉ lệ checklist | `verificationStep` + `verificationData.step{N}` |
| C | Detail view — dưới progress bar | **Mini-checklist summary** (collapse/expand) hiện checkbox status từng stage | `verificationData` |
| D | Page header | **Aggregate badge**: "Đang bước 2/3" cho selected submission (hoặc ẩn khi chưa chọn) | `verificationStep` của `selectedId` |

### 3. Component mới (2 file, pure presentational)

- `ModerationStageProgressBar.tsx` — dùng cho B + D
- `ModerationStageChecklist.tsx` — dùng cho C; có thể collapse

### 4. Không sửa wizard dialog

`ModerationVerificationWizardDialog` đã có progress bar bên trong. Plan này thêm progress **bên ngoài** dialog để expert thấy trước khi mở wizard.

---

## Phase 1 — Stage Progress Bar component

### Mục tiêu
Tạo `ModerationStageProgressBar` — component thuần hiển thị, không có side-effect.

### File mới

`src/components/features/moderation/ModerationStageProgressBar.tsx`

### Props

```ts
interface ModerationStageProgressBarProps {
  currentStep: number;            // 1 | 2 | 3
  verificationData?: ModerationVerificationData;
  compact?: boolean;              // true = chỉ hiện dots (cho sidebar card)
}
```

### Hành vi

- **Full mode** (`compact=false`): 3 segment bar (giống wizard nhưng nằm ngang flat), label stage name dưới mỗi segment, số checkbox hoàn thành / tổng cho step hiện tại.
- **Compact mode** (`compact=true`): 3 dots (filled / empty), tooltip hiện tên stage.
- Segment colors: step hoàn thành → `bg-green-500`; step hiện tại → `bg-primary-600`; step chưa → `bg-neutral-200`.

### Logic đếm hoàn thành (pure function, export riêng)

```ts
function countStepCompletion(
  step: number,
  data?: ModerationVerificationData,
): { done: number; total: number }
```

| Step | Total | Fields |
|------|-------|--------|
| 1 | 3 | `infoComplete`, `infoAccurate`, `formatCorrect` |
| 2 | 3 | `culturalValue`, `authenticity`, `accuracy` |
| 3 | 3 | `crossChecked`, `sourcesVerified`, `finalApproval` |

(`sensitiveContent` ở step 3 là optional flag, không tính vào required completion.)

### Tasks

- [ ] Tạo `ModerationStageProgressBar.tsx`
- [ ] Export `countStepCompletion` từ cùng file (hoặc util riêng nếu >50 LOC)
- [ ] Unit test `countStepCompletion`: all-false → 0/3, partial → 1/3, all-true → 3/3

---

## Phase 2 — Stage Checklist Summary component

### File mới

`src/components/features/moderation/ModerationStageChecklist.tsx`

### Props

```ts
interface ModerationStageChecklistProps {
  verificationData?: ModerationVerificationData;
  currentStep: number;
  defaultExpanded?: boolean;
}
```

### Hành vi

- Render 3 collapsible sections (Initial Screening / Detail Verification / Final Publication).
- Mỗi section hiện danh sách checkbox items **read-only** (checked / unchecked).
- Section của `currentStep` mặc định expanded; các step khác collapsed.
- Step đã hoàn thành (all checked): icon check xanh bên cạnh heading.
- Không có interaction — expert muốn thay đổi thì mở wizard dialog.

### Tasks

- [ ] Tạo `ModerationStageChecklist.tsx`
- [ ] Labels checklist items phải **khớp chính xác** text trong `ModerationVerificationWizardDialog` (DRY: extract constant array nếu cần)

---

## Phase 3 — Tích hợp vào UI hiện có

### 3A — Queue Sidebar card (compact progress)

**File sửa**: `src/components/features/moderation/ModerationQueueSidebar.tsx`

**Thay đổi**:
- Import `ModerationStageProgressBar`.
- Trong mỗi queue card item, khi `item.moderation?.claimedBy === currentUserId` và `item.moderation?.verificationStep`:
  - Render `<ModerationStageProgressBar compact currentStep={...} />` dưới status pill.
- Khi không phải owner hoặc chưa claim → không render gì (giữ nguyên card hiện tại).

**Cần thêm prop**: `verificationStepMap?: Record<string, number>` (từ `useModerationWizard.verificationStep`) — hoặc đọc từ `item.moderation?.verificationStep` đã merge overlay.

### 3B — Detail View (full progress + checklist)

**File sửa**: `src/components/features/moderation/ModerationDetailView.tsx`

**Thay đổi**:
- Import `ModerationStageProgressBar`, `ModerationStageChecklist`.
- Thêm props:
  ```ts
  currentVerificationStep?: number;
  verificationData?: ModerationVerificationData;
  ```
- Render block mới **phía trên** `ModerationClaimActions` (chỉ khi `item.moderation?.claimedBy === currentUserId`):
  ```
  ┌─────────────────────────────────────┐
  │  Stage Progress Bar (full mode)     │
  │  ─────────────────────────────────  │
  │  Stage Checklist (collapsible)      │
  └─────────────────────────────────────┘
  ```
- Container: `rounded-2xl border border-secondary-200/50 p-4` (matching Explore skin từ refactor trước).

### 3C — Page Header (selected submission stage badge)

**File sửa**: `src/components/features/moderation/ModerationPageHeader.tsx`

**Thay đổi**:
- Thêm optional prop `selectedStageInfo?: { step: number; stepName: string } | null`.
- Khi có giá trị, hiện badge nhỏ: "Đang ở Bước {step}/3: {stepName}" bên phải heading.
- Khi null (chưa chọn hoặc chưa claim) → ẩn.

### 3D — ModerationPage wiring

**File sửa**: `src/pages/ModerationPage.tsx`

**Thay đổi**:
- Truyền `currentVerificationStep` + `verificationData` xuống `ModerationDetailView`.
- Truyền `selectedStageInfo` xuống `ModerationPageHeader`.
- Không thêm state mới — dữ liệu đã có từ `useModerationWizard` (`getCurrentVerificationStep`, `verificationForms`).

### Tasks Phase 3

- [ ] 3A: Patch `ModerationQueueSidebar` — thêm compact progress
- [ ] 3B: Patch `ModerationDetailView` — thêm full progress + checklist
- [ ] 3C: Patch `ModerationPageHeader` — thêm stage badge
- [ ] 3D: Wire props trong `ModerationPage.tsx`

---

## Phase 4 — DRY checklist labels

### Vấn đề

Labels checklist items ("Thông tin đầy đủ: Tiêu đề, nghệ sĩ…") hiện hard-coded trong `ModerationVerificationWizardDialog` (lines 503–668). Nếu `ModerationStageChecklist` copy lại → duplicate.

### Giải pháp

**File mới**: `src/features/moderation/constants/verificationStepDefinitions.ts`

```ts
export const VERIFICATION_STEPS = [
  {
    step: 1,
    name: 'Kiểm tra sơ bộ',
    description: 'Đánh giá tính đầy đủ và phù hợp của thông tin',
    fields: [
      { key: 'infoComplete', label: 'Thông tin đầy đủ: Tiêu đề, nghệ sĩ, ngày thu, địa điểm, dân tộc, thể loại đã được điền đầy đủ' },
      { key: 'infoAccurate', label: 'Thông tin chính xác: Các thông tin cơ bản phù hợp và không có mâu thuẫn' },
      { key: 'formatCorrect', label: 'Định dạng đúng: File media hợp lệ, chất lượng đạt yêu cầu tối thiểu' },
    ],
    notesKey: 'notes',
  },
  {
    step: 2,
    name: 'Xác minh chuyên môn',
    description: 'Đánh giá bởi chuyên gia về tính chính xác và giá trị văn hóa',
    fields: [
      { key: 'culturalValue', label: 'Giá trị văn hóa: Bản thu có giá trị văn hóa, lịch sử hoặc nghệ thuật đáng kể' },
      { key: 'authenticity', label: 'Tính xác thực: Bản thu là bản gốc, không phải bản sao chép hoặc chỉnh sửa không được phép' },
      { key: 'accuracy', label: 'Độ chính xác: Thông tin về dân tộc, thể loại, phong cách phù hợp với nội dung bản thu' },
    ],
    notesKey: 'expertNotes',
  },
  {
    step: 3,
    name: 'Đối chiếu và phê duyệt',
    description: 'Đối chiếu với các nguồn tài liệu và quyết định phê duyệt',
    fields: [
      { key: 'crossChecked', label: 'Đã đối chiếu: Đã kiểm tra và đối chiếu với các nguồn tài liệu, cơ sở dữ liệu liên quan' },
      { key: 'sourcesVerified', label: 'Nguồn đã xác minh: Nguồn gốc, người thu thập, quyền sở hữu đã được xác minh' },
      { key: 'finalApproval', label: 'Xác nhận phê duyệt: Tôi xác nhận đã hoàn thành tất cả các bước kiểm tra và đồng ý phê duyệt bản thu này' },
    ],
    notesKey: 'finalNotes',
  },
] as const;
```

### Tasks

- [ ] Tạo `verificationStepDefinitions.ts`
- [ ] Refactor `ModerationVerificationWizardDialog` để đọc labels từ constant (thay vì hard-code)
- [ ] `ModerationStageChecklist` cũng đọc từ cùng constant
- [ ] `countStepCompletion` dùng `VERIFICATION_STEPS[step-1].fields.length` thay vì magic number

---

## Files cần sửa / tạo — Tổng kết

| File | Hành động | Phase |
|------|-----------|-------|
| `src/features/moderation/constants/verificationStepDefinitions.ts` | **Tạo mới** | 4 |
| `src/components/features/moderation/ModerationStageProgressBar.tsx` | **Tạo mới** | 1 |
| `src/components/features/moderation/ModerationStageChecklist.tsx` | **Tạo mới** | 2 |
| `src/components/features/moderation/ModerationQueueSidebar.tsx` | Sửa | 3A |
| `src/components/features/moderation/ModerationDetailView.tsx` | Sửa | 3B |
| `src/components/features/moderation/ModerationPageHeader.tsx` | Sửa | 3C |
| `src/pages/ModerationPage.tsx` | Sửa | 3D |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | Sửa (DRY) | 4 |

**Tổng**: 3 file mới, 5 file sửa. Không tạo file ngoài `src/`.

---

## Verification Checklist (Phase X)

### Functional
- [ ] Queue sidebar card hiện compact progress dots khi expert đã claim
- [ ] Detail view hiện full progress bar + stage name + completion ratio
- [ ] Detail view hiện collapsible mini-checklist (read-only) khớp wizard data
- [ ] Page header hiện stage badge cho selected submission
- [ ] Mở wizard dialog → checklist trong dialog vẫn hoạt động y nguyên
- [ ] Thay đổi checkbox trong wizard → progress bar + checklist ngoài dialog cập nhật real-time (sau khi đóng dialog hoặc khi wizard persist qua `updateVerificationForm`)

### Regression
- [ ] Claim/Unclaim: progress bar biến mất khi unclaim, xuất hiện khi claim
- [ ] Approve: sau approve, submission rời queue — không crash/stale stage data
- [ ] Reject: stage UI ẩn đi, không hiện stale checklist
- [ ] Submission chưa claim: detail view **không** hiện stage progress (tránh confuse)
- [ ] `ModerationVerificationWizardDialog` labels khớp chính xác constant mới
- [ ] `useModerationWizard.validateStep` vẫn hoạt động đúng (dùng field keys, không bị rename)

### Build/Lint
- [ ] `npm run lint` — 0 errors mới
- [ ] `npx tsc --noEmit` — pass
- [ ] `npm run test:unit` — all pass
- [ ] `npm run build` — pass

### A11y
- [ ] Progress bar có `aria-label` ("Tiến độ kiểm duyệt: bước X trong 3")
- [ ] Checklist summary items có role phù hợp (`list` / `listitem`)
- [ ] Badge ở header có đủ contrast (WCAG AA)

---

## Risk & Mitigation

| Rủi ro | Mức | Giải pháp |
|--------|-----|-----------|
| `verificationStep` trong overlay không đồng bộ với React state (`useModerationWizard.verificationStep`) | Medium | UI đọc ưu tiên React state (đã merge overlay); fallback `item.moderation?.verificationStep`. Cùng logic `getCurrentVerificationStep` đã có. |
| Hard-code labels bị lệch sau refactor DRY (Phase 4) | Low | Chạy Phase 4 trước Phase 3, hoặc chạy unit test so sánh string nếu Phase 4 sau. |
| ModerationQueueSidebar thêm prop → break snapshot test nếu có | Low | Prop optional, default `undefined` → không render gì → backward compat. |
| Checklist trạng thái read-only gây nhầm lẫn (expert tưởng tick được) | Medium | Dùng `pointer-events-none opacity-70` + label rõ "Chỉ xem — mở Wizard để thay đổi". |
| Phase 2 API thêm `verificationStep` server-side → cần đổi nguồn đọc | Low (future) | Component nhận prop, không đọc trực tiếp localStorage. Khi Phase 2 API sẵn, chỉ đổi nơi truyền prop (ModerationPage), không đổi component. |
| Performance — đọc verificationData cho mỗi card trong sidebar | Low | `verificationData` chỉ render cho cards đã claim bởi current user (subset nhỏ, thường 1–3 items). |

---

## Ước lượng

| Phase | Effort |
|-------|--------|
| Phase 1 — StageProgressBar + unit test | ~1.5h |
| Phase 2 — StageChecklist component | ~1h |
| Phase 3 — Tích hợp 4 files | ~2h |
| Phase 4 — DRY constants + refactor wizard | ~1h |
| Phase X — Verification | ~30min |
| **Tổng** | **~6h** |

---

*Tạo theo lệnh `/plan`: 3-stage moderation workflow — **slug:** `moderation-3stage`.*
