# PLAN: Expert Review Redesign — Assign / Unassign Flow

**File:** `docs/PLAN-expert-review-redesign.md`  
**Task slug:** `expert-review-redesign`  
**Created:** 2026-04-11  
**Branch:** `FE-API`

---

## 1. Bối cảnh & Vấn đề

### Luồng hiện tại (AS-IS)

```
Queue sidebar → Expert click "Bắt đầu kiểm duyệt"
  → claim() → claimSubmission() → assignReviewerSubmission() [PUT /Submission/assign-reviewer-submission]
  → Đồng thời mở thẳng Verification Wizard Dialog
```

- **Vấn đề 1:** "Nhận bài" và "mở wizard kiểm duyệt" xảy ra **cùng lúc** — expert không có cơ hội xem thông tin trước khi bị đẩy vào wizard.
- **Vấn đề 2:** Nút "Hủy nhận bài" **chỉ nằm bên trong wizard**, không có ở detail panel (khi expert đã nhận nhưng chưa hoặc đã đóng wizard).
- **Vấn đề 3:** Khi expert quay lại sau khi đã nhận bài (`IN_REVIEW`), nút hiện thị là "Tiếp tục kiểm duyệt" và lại mở wizard — vẫn không có "Hủy nhận".
- **Vấn đề 4:** Không có toast/feedback rõ ràng khi assign thành công tách biệt với việc mở wizard.

### Luồng mong muốn (TO-BE)

```
Queue sidebar → Expert click submission → Xem detail panel
  → [Nút "Nhận bài"] → PUT /Submission/assign-reviewer-submission → Status: IN_REVIEW
      → Detail panel cập nhật: hiện [Hủy nhận bài] + [Bắt đầu kiểm duyệt]
  → [Nút "Hủy nhận bài"] → PUT /Submission/unassign-reviewer-submission → Status: PENDING_REVIEW
  → [Nút "Bắt đầu kiểm duyệt"] → Mở Verification Wizard (bước 1→3)
      → Bên trong wizard: vẫn có "Hủy nhận kiểm duyệt" (cũng gọi unassign)
      → Bước 3 hoàn thành → Approve confirm modal → PUT /Submission/approve-submission
```

---

## 2. API Endpoints (đã xác nhận từ Swagger)

| Action | Method | Endpoint | Params |
|--------|--------|----------|--------|
| Nhận bài (assign) | PUT | `/api/Submission/assign-reviewer-submission` | `submissionId` (uuid), `reviewerId` (uuid) |
| Hủy nhận bài (unassign) | PUT | `/api/Submission/unassign-reviewer-submission` | `submissionId` (uuid) |
| Phê duyệt | PUT | `/api/Submission/approve-submission` | `submissionId` |
| Từ chối | PUT | `/api/Submission/reject-submission` | `submissionId` |

> ⚡ **Đã có sẵn trong codebase:** `assignReviewerSubmission()` và `unassignReviewerSubmission()` trong `src/services/expertModerationApi.ts` (lines 225–252). `claimSubmission()` / `unclaimSubmission()` trong `expertWorkflowService` đã gọi đúng API khi `EXPERT_API_PHASE2=true`.

---

## 3. Phân tích File Cần Thay Đổi

| File | Vai trò | Thay đổi |
|------|---------|----------|
| `src/components/features/moderation/ModerationClaimActions.tsx` | Nút hành động trong detail panel | **Refactor lớn** — tách "Nhận bài", "Hủy nhận bài", "Bắt đầu kiểm duyệt" thành 3 nút riêng |
| `src/pages/ModerationPage.tsx` | Orchestrator chính | Tách `claim()` thành 2 bước: `assignOnly()` + `openWizard()`; thêm `unassignFromPanel()` |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | Wizard kiểm duyệt | Giữ nguyên nút "Hủy nhận kiểm duyệt" bên trong — đảm bảo vẫn gọi unassign |
| `src/services/expertWorkflowService.ts` | Business logic | Thêm method `assignOnly()` không mở wizard; kiểm tra `claimSubmission` không cần thay đổi |

---

## 4. Chi Tiết Implementation

### Phase 1 — Tách "Nhận bài" khỏi "Mở Wizard"

**File:** `src/pages/ModerationPage.tsx`

```typescript
// Bước 1: Chỉ assign, KHÔNG mở wizard
const assignOnly = async (id?: string) => {
  if (!id || !user?.id) return;
  const it = allItems.find((x) => x.id === id);
  if (!it) return;
  
  // Guard: đã bị expert khác nhận
  if (
    it.moderation?.status === ModerationStatus.IN_REVIEW &&
    it.moderation?.claimedBy &&
    it.moderation.claimedBy !== user.id
  ) {
    uiToast.warning('Bản thu này đã được chuyên gia khác nhận kiểm duyệt.');
    return;
  }

  const claimResult = await claimSubmission(id, user.id, user.username ?? '');
  if (!claimResult.success) {
    const claimedByOthers = claimResult.httpStatus === 400 || claimResult.httpStatus === 409;
    if (claimedByOthers) {
      uiToast.warning('Bản thu này đã được chuyên gia khác nhận. Vui lòng tải lại hàng đợi.');
    } else {
      uiToast.error('Không thể nhận bản thu lúc này. Vui lòng thử lại.');
    }
    await load();
    return;
  }
  
  uiToast.success('Đã nhận bài thành công. Bạn có thể bắt đầu kiểm duyệt.');
  await load();
  // KHÔNG gọi setShowVerificationDialog — expert tự chọn khi nào mở wizard
};

// Bước 2: Mở wizard (chỉ khi đã IN_REVIEW + claimedBy === user.id)
const openWizard = (id?: string) => {
  if (!id) return;
  const it = allItems.find((x) => x.id === id);
  if (!it) return;
  primeClaimState(id, it.moderation?.verificationData as ModerationVerificationData | undefined);
  setShowVerificationDialog(id);
};
```

**Xóa** hàm `claim()` cũ (hoặc giữ để tương thích nhưng không gọi từ UI).

---

### Phase 2 — Thêm "Hủy nhận bài" trong Detail Panel

**File:** `src/components/features/moderation/ModerationClaimActions.tsx`

Thêm props `onUnclaim` và logic hiển thị có điều kiện:

```typescript
export function ModerationClaimActions({
  item,
  currentUserId,
  onAssign,      // ← Đổi tên từ onClaim
  onUnclaim,     // ← Thêm mới
  onOpenWizard,  // ← Thêm mới (tách riêng)
  onRequestDelete,
}: {
  item: LocalRecordingMini;
  currentUserId?: string;
  onAssign: (id: string) => void;
  onUnclaim: (id: string) => void;
  onOpenWizard: (id: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  const myId = currentUserId;
  const isClaimedByMe =
    item.moderation?.status === ModerationStatus.IN_REVIEW &&
    (item.moderation?.claimedBy === myId || item.moderation?.reviewerId === myId);
  const isPending = item.moderation?.status === ModerationStatus.PENDING_REVIEW;

  return (
    <div className="flex flex-col gap-2">
      {/* Trạng thái: PENDING → Hiện nút "Nhận bài" */}
      {isPending && (
        <button onClick={() => item.id && onAssign(item.id)} ...>
          <UserCheck className="h-4 w-4" />
          Nhận bài để kiểm duyệt
        </button>
      )}

      {/* Trạng thái: IN_REVIEW + claimedByMe → Hiện "Bắt đầu/Tiếp tục KD" + "Hủy nhận bài" */}
      {isClaimedByMe && (
        <>
          <button onClick={() => item.id && onOpenWizard(item.id)} ...>
            <CheckCircle className="h-4 w-4" />
            Bắt đầu kiểm duyệt
          </button>
          <button onClick={() => item.id && onUnclaim(item.id)} ...>
            <XCircle className="h-4 w-4" />
            Hủy nhận bài
          </button>
        </>
      )}

      {/* ... trạng thái TEMPORARILY_REJECTED, REJECTED giữ nguyên ... */}
      {/* ... nút Xóa giữ nguyên ... */}
    </div>
  );
}
```

---

### Phase 3 — Cập nhật ModerationPage gọi đúng props mới

**File:** `src/pages/ModerationPage.tsx` — chỗ render `<ModerationClaimActions />`

```typescript
<ModerationClaimActions
  item={selectedItem}
  currentUserId={user?.id}
  onAssign={assignOnly}        // ← Nhận bài (assign API)
  onUnclaim={unclaim}          // ← Hủy nhận (unassign API)
  onOpenWizard={openWizard}    // ← Mở wizard riêng
  onRequestDelete={(id) => setPortalModal({ kind: 'delete', submissionId: id })}
/>
```

---

### Phase 4 — Đảm bảo Wizard vẫn có "Hủy nhận kiểm duyệt"

**File:** `src/components/features/moderation/ModerationVerificationWizardDialog.tsx`

- Giữ nguyên nút "Hủy nhận kiểm duyệt" trong footer wizard.
- Nút này gọi `onUnclaim` → vẫn trigger `handleConfirmUnclaim` → `unclaimSubmission()` → `unassignReviewerSubmission()`.
- Không thay đổi logic wizard (3 bước, approve, reject).

---

### Phase 5 — Modal xác nhận "Hủy nhận bài"

`ModerationModals.tsx` đã có modal `unclaim`. Giữ nguyên, cập nhật text nếu cần:
- Title: `"Xác nhận hủy nhận bài"`
- Body: `"Bạn có chắc muốn hủy nhận bài này? Bản thu sẽ trở về hàng đợi PENDING_REVIEW để expert khác có thể nhận."`
- Confirm: `"Hủy nhận bài"` (đỏ) | Cancel: `"Giữ nguyên"`

---

## 5. Luồng State Hoàn Chỉnh Sau Redesign

```
PENDING_REVIEW
  ├─ Expert click "Nhận bài để kiểm duyệt"
  │     → PUT /assign-reviewer-submission(submissionId, reviewerId)
  │     → local overlay: { status: IN_REVIEW, claimedBy: userId }
  │     → toast "Đã nhận bài thành công"
  │     → reload queue
  └→ IN_REVIEW (claimedByMe)
        ├─ [Bắt đầu kiểm duyệt] → Mở Wizard
        │     Bước 1: Thông tin cơ bản
        │     Bước 2: Thẩm định văn hóa
        │     Bước 3: Xác nhận & ghi chú
        │     [Hoàn thành] → Approve Confirm Modal
        │           → PUT /approve-submission
        │           → Status: APPROVED
        │     [Từ chối] → Reject Form → PUT /reject-submission
        │           → Status: REJECTED | TEMPORARILY_REJECTED
        │     [Hủy nhận kiểm duyệt] (trong wizard)
        │           → Modal xác nhận → PUT /unassign-reviewer-submission
        │           → Status: PENDING_REVIEW
        └─ [Hủy nhận bài] (trong detail panel, NGOÀI wizard)
              → Modal xác nhận → PUT /unassign-reviewer-submission
              → Status: PENDING_REVIEW
              → reload queue
```

---

## 6. Checklist Triển Khai

### Phase 1 — Tách assignOnly / openWizard trong ModerationPage
- [x] Thêm hàm `assignOnly(id)` — gọi `claimSubmission` nhưng KHÔNG gọi `setShowVerificationDialog`
- [x] Thêm hàm `openWizard(id)` — chỉ `primeClaimState` + `setShowVerificationDialog`
- [x] Xóa / deprecate hàm `claim()` cũ
- [x] Đảm bảo toast success "Đã nhận bài" hiển thị sau assign

### Phase 2 — Refactor ModerationClaimActions
- [x] Thêm props: `onAssign`, `onUnclaim`, `onOpenWizard`
- [x] Hiển thị "Nhận bài" khi `PENDING_REVIEW`
- [x] Hiển thị "Bắt đầu kiểm duyệt" + "Hủy nhận bài" khi `IN_REVIEW && claimedByMe`
- [x] Import icon `UserCheck`, `XCircle` từ lucide-react
- [x] Xóa prop `onClaim` cũ

### Phase 3 — Cập nhật ModerationPage render
- [x] Cập nhật `<ModerationClaimActions>` với props mới
- [x] Đảm bảo `unclaim()` vẫn mở modal trước khi thực sự unassign

### Phase 4 — Kiểm tra Wizard
- [x] Verify nút "Hủy nhận kiểm duyệt" trong wizard vẫn hoạt động
- [x] Wizard `onUnclaim` → `unclaim()` → modal → `handleConfirmUnclaim` → `unclaimSubmission()` → API

### Phase 5 — Test toàn bộ flow
- [x] PENDING_REVIEW → "Nhận bài" → IN_REVIEW (sidebar badge "Đã nhận" xuất hiện)
- [x] Modal xác nhận hủy nhận: title / body / `Giữ nguyên` + `Hủy nhận bài` (`ModerationModals.tsx`)
- [ ] IN_REVIEW → "Hủy nhận bài" (detail panel) → confirm modal → PENDING_REVIEW *(staging / tài khoản expert)*
- [ ] IN_REVIEW → "Bắt đầu kiểm duyệt" → wizard → step 3 → Approve → APPROVED *(staging)*
- [ ] IN_REVIEW → wizard → "Hủy nhận kiểm duyệt" → PENDING_REVIEW *(staging)*
- [x] Polling 8s — `useEffect` + `setInterval(load, 8000)` trong `ModerationPage.tsx`
- [x] Expert khác nhận bài — toast trong `assignOnly` (đã claim bởi người khác / HTTP 400|409)

---

## 7. Files Không Thay Đổi

- `src/services/expertModerationApi.ts` — API functions đã đúng, không đổi
- `src/services/expertWorkflowService.ts` — `claimSubmission`/`unclaimSubmission` đã đúng
- `src/features/moderation/hooks/useSubmissionOverlay.ts` — thin wrapper, giữ nguyên
- `src/features/moderation/hooks/useExpertQueue.ts` — queue load logic, giữ nguyên
- `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` — chỉ verify, không đổi code

---

## 8. Rủi Ro & Lưu Ý

| Rủi ro | Mức độ | Xử lý |
|--------|--------|-------|
| Expert nhận bài rồi đóng tab, không hủy → bài bị lock | Trung bình | Polling 8s phát hiện; expert khác thấy "Đã được nhận" badge |
| `EXPERT_API_PHASE2=false` (local mode) | Thấp | `claimSubmission` skip API call, chỉ cập nhật local — hành vi đúng |
| Gọi `assignOnly` khi đã `IN_REVIEW + claimedByMe` (reload) | Thấp | Guard check `claimedBy === user.id` → không gọi lại API |

---

## 9. Ước Tính Effort

| Task | Effort |
|------|--------|
| Phase 1: Tách assignOnly/openWizard | ~30 phút |
| Phase 2: Refactor ModerationClaimActions | ~45 phút |
| Phase 3: Cập nhật ModerationPage render | ~15 phút |
| Phase 4: Verify Wizard | ~10 phút |
| Phase 5: Test toàn bộ | ~30 phút |
| **Tổng** | **~2 giờ** |
