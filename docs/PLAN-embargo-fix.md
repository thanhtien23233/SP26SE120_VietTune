# PLAN: Fix Embargo — Tích hợp BE Update

> **Created:** 2026-04-14
> **Nguồn yêu cầu:** `docs/FE-ADAPTATION-embargo.md` (BE cập nhật 2026-04-12)
> **Scope:** Cập nhật FE để xử lý đúng trạng thái Embargo từ backend — enum, mapper, UI badge, 404, copy tiếng Việt.

---

## Phase -1: Hiện trạng (Audit)

### Vấn đề phát hiện

| # | Vấn đề | Mức độ | File(s) |
|---|--------|--------|---------|
| A | **`ModerationStatus` thiếu `EMBARGOED`** — BE trả `SubmissionStatus = 5` (Embargoed), FE enum chỉ có 5 giá trị (PENDING_REVIEW…TEMPORARILY_REJECTED) | Critical | `src/types/moderation.ts` |
| B | **`SUBMISSION_STATUS_INT` map thiếu key `5`** — fallback → `PENDING_REVIEW`, bản ghi bị embargo hiển thị sai thành "Đang chờ duyệt" | Critical | `src/services/submissionApiMapper.ts` |
| C | **`getModerationStatusLabel` thiếu case `EMBARGOED`** — default trả `String(status)` thô | High | `src/utils/helpers.ts` |
| D | **RecordingDetailPage: 404 xử lý chung** — không phân biệt "bị embargo / không tồn tại / lỗi mạng" | High | `src/hooks/useRecordingDetail.ts`, `src/pages/RecordingDetailPage.tsx` |
| E | **AdminRecordingTable: hiển thị `st` thô** — không qua `getModerationStatusLabel`, không có badge embargo | Medium | `src/components/admin/AdminRecordingTable.tsx` |
| F | **ApprovedRecordingsPage: không hiện trạng thái Embargoed** — chỉ dùng `getModerationStatusLabel` (sẽ tự sửa khi C done, nhưng cần badge màu) | Medium | `src/pages/ApprovedRecordingsPage.tsx` |
| G | **Copy tiếng Việt không dấu** — `EmbargoSection`, `EmbargoListPanel`, `RecordingDetailPage` (banner embargo/dispute) có text ASCII | Medium | 3 files |
| H | **`mapApiSubmissionStatusToModeration`: thiếu nhận diện chuỗi `"embargoed"`** — nếu BE trả chuỗi thay vì int | Low | `src/services/submissionApiMapper.ts` |

### Kiến trúc liên quan

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
│                                                                 │
│  ModerationStatus enum ◄── submissionApiMapper (int/string→enum)│
│       ▲                                                         │
│       │                                                         │
│  getModerationStatusLabel() ── helpers.ts                       │
│       ▲                                                         │
│       │                                                         │
│  ApprovedRecordingsPage ─┤                                      │
│  ContributionsPage ──────┤                                      │
│  AdminRecordingTable ────┤ (hiện dùng raw `st`, không qua fn)  │
│  ModerationPage ─────────┤                                      │
│                                                                 │
│  RecordingDetailPage ──► useRecordingDetail ──► API calls       │
│       └─ Banner embargo (text ASCII) ──► EmbargoSection         │
│                                                                 │
│  AdminDashboard ──► EmbargoListPanel (text ASCII)               │
│  ModerationDetailView ──► EmbargoSection (text ASCII)           │
│                                                                 │
│  embargo.ts (EmbargoDto, EMBARGO_STATUS_LABELS)                 │
│  embargoApi.ts (CRUD embargo)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Enum + Mapper + Label (Critical Path)

**Mục tiêu:** FE nhận đúng trạng thái `Embargoed` từ BE và hiển thị nhãn tiếng Việt.

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 1.1 | Thêm `EMBARGOED = 'EMBARGOED'` vào enum `ModerationStatus` | `src/types/moderation.ts` | S |
| 1.2 | Thêm `5: ModerationStatus.EMBARGOED` vào `SUBMISSION_STATUS_INT` | `src/services/submissionApiMapper.ts` | S |
| 1.3 | Thêm nhận diện chuỗi `"embargoed"` trong `mapApiSubmissionStatusToModeration` | `src/services/submissionApiMapper.ts` | S |
| 1.4 | Thêm case `EMBARGOED` → `'Đang hạn chế công bố'` vào `getModerationStatusLabel` | `src/utils/helpers.ts` | S |
| 1.5 | Verify: `tsc --noEmit` pass, lint sạch | — | S |

> **Trạng thái Phase 1:** Done (enum + mapper + label + `tsc`/`eslint` OK).

### Chi tiết thay đổi

**1.1 — `ModerationStatus`:**
```typescript
export enum ModerationStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  TEMPORARILY_REJECTED = 'TEMPORARILY_REJECTED',
  EMBARGOED = 'EMBARGOED',          // BE SubmissionStatus = 5
}
```

**1.2 — `SUBMISSION_STATUS_INT`:**
```typescript
const SUBMISSION_STATUS_INT: Record<number, ModerationStatus> = {
  0: ModerationStatus.PENDING_REVIEW,
  1: ModerationStatus.PENDING_REVIEW,
  2: ModerationStatus.APPROVED,
  3: ModerationStatus.REJECTED,
  4: ModerationStatus.TEMPORARILY_REJECTED,
  5: ModerationStatus.EMBARGOED,
};
```

**1.3 — Nhận diện chuỗi `"embargoed"`:**
```typescript
if (normalized === 'embargoed') {
  return ModerationStatus.EMBARGOED;
}
```

**1.4 — Label:**
```typescript
case ModerationStatus.EMBARGOED:
case 'EMBARGOED':
  return 'Đang hạn chế công bố';
```

---

## Phase 2: UI Badge Embargo trong danh sách bản ghi

**Mục tiêu:** Admin/Expert thấy badge cam/vàng khi bản ghi bị embargo.

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 2.1 | `AdminRecordingTable`: dùng `getModerationStatusLabel(st)` thay vì `st` thô; thêm badge màu theo status (cam cho EMBARGOED) | `src/components/admin/AdminRecordingTable.tsx` | S |
| 2.2 | `ApprovedRecordingsPage`: thêm logic badge color cho EMBARGOED (amber) bên cạnh badge hiện tại | `src/pages/ApprovedRecordingsPage.tsx` | S |
| 2.3 | (Optional) Tạo helper `getStatusBadgeColor(status): string` nếu dùng lại ≥ 3 chỗ | `src/utils/helpers.ts` | S |

> **Trạng thái Phase 2:** Done — `getModerationStatusBadgeClassNames` trong `helpers.ts` (2 chỗ dùng + chuẩn hóa qua mapper); `getModerationStatusLabel` gọi `mapApiSubmissionStatusToModeration` để int/string từ BE map đúng.

### Chi tiết badge

```
PENDING_REVIEW / IN_REVIEW → bg-blue-50 text-blue-700 border-blue-200
APPROVED                   → bg-emerald-50 text-emerald-700 border-emerald-200
REJECTED                   → bg-red-50 text-red-700 border-red-200
TEMPORARILY_REJECTED       → bg-orange-50 text-orange-700 border-orange-200
EMBARGOED                  → bg-amber-50 text-amber-800 border-amber-300
```

---

## Phase 3: RecordingDetailPage — xử lý 404 Embargo

**Mục tiêu:** Khi guest truy cập bản ghi bị embargo → thông báo rõ "Bản ghi không tồn tại hoặc đã bị hạn chế truy cập" (theo `FE-ADAPTATION-embargo.md` mục 2a).

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 3.1 | `useRecordingDetail`: bắt 404 status và set error state riêng (`notFound: true` vs `error: true`) | `src/hooks/useRecordingDetail.ts` | M |
| 3.2 | `RecordingDetailPage`: khi `notFound` → hiện thông báo "Bản ghi không tồn tại hoặc đã bị hạn chế truy cập" thay vì chỉ "Không tìm thấy bản thu" chung | `src/pages/RecordingDetailPage.tsx` | S |

> **Trạng thái Phase 3:** Done — 404 từ `GET /Recording/{id}` → `notFound`, không chạy fallback; `finally` vẫn tắt loading.

### Chi tiết

**3.1 — Phát hiện 404:**
```typescript
// Trong catch block
import { isAxiosError } from 'axios';

catch (err) {
  if (isAxiosError(err) && err.response?.status === 404) {
    setNotFound(true);
    setLoading(false);
    return; // không cần thử thêm fallback
  }
  // ... fallback hiện tại
}
```

**3.2 — Message UX:**
```
Bản ghi không tồn tại hoặc đã bị hạn chế truy cập.
Subtitle: Bản ghi này có thể đã bị xóa, đang trong thời gian hạn chế công bố,
          hoặc bạn không có quyền xem.
```

> **Lưu ý:** Không tiết lộ cho user biết chính xác là embargo hay đã xóa (theo FE-ADAPTATION-embargo.md).

---

## Phase 4: Fix copy tiếng Việt (dấu)

**Mục tiêu:** Thay toàn bộ text không dấu bằng tiếng Việt có dấu đầy đủ.

### Tasks

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 4.1 | Fix copy `EmbargoSection.tsx` — 12+ chuỗi không dấu | `EmbargoSection.tsx` | S |
| 4.2 | Fix copy `EmbargoListPanel.tsx` — 10+ chuỗi không dấu | `EmbargoListPanel.tsx` | S |
| 4.3 | Fix copy `RecordingDetailPage.tsx` — banner embargo + dispute text không dấu | `RecordingDetailPage.tsx` | S |

**Trạng thái:** 4.1–4.3 đã áp dụng (copy có dấu theo bảng dưới).

### Bảng đối chiếu copy

| Chuỗi cũ (không dấu) | Chuỗi mới (có dấu) |
|-----------------------|---------------------|
| `Han che cong bo` | `Hạn chế công bố` |
| `Quan ly thoi gian han che cong bo voi ban ghi nhay cam` | `Quản lý thời gian hạn chế công bố với bản ghi nhạy cảm` |
| `Khong tai duoc thong tin han che cong bo` | `Không tải được thông tin hạn chế công bố` |
| `Vui long nhap it nhat mot truong embargo` | `Vui lòng nhập ít nhất một trường embargo` |
| `Da cap nhat han che cong bo` | `Đã cập nhật hạn chế công bố` |
| `Go bo han che cong bo cho ban ghi nay?` | `Gỡ bỏ hạn chế công bố cho bản ghi này?` |
| `Da go bo han che cong bo` | `Đã gỡ bỏ hạn chế công bố` |
| `Bat dau` / `Ket thuc` | `Bắt đầu` / `Kết thúc` |
| `Bat dau embargo` / `Ket thuc embargo` | `Bắt đầu embargo` / `Kết thúc embargo` |
| `Ly do` | `Lý do` |
| `Mo ta ly do han che cong bo...` | `Mô tả lý do hạn chế công bố...` |
| `Luu embargo` | `Lưu embargo` |
| `Tai lai` | `Tải lại` |
| `Go embargo` | `Gỡ embargo` |
| `Chua co` | `Chưa có` |
| `Dang tai thong tin embargo...` | `Đang tải thông tin embargo...` |
| `Danh sach han che cong bo` | `Danh sách hạn chế công bố` |
| `Theo doi cac ban ghi dang embargo` | `Theo dõi các bản ghi đang embargo` |
| `Chua co ban ghi nao trong danh sach embargo` | `Chưa có bản ghi nào trong danh sách embargo` |
| `Khong tai duoc danh sach embargo` | `Không tải được danh sách embargo` |
| `Dang tai danh sach embargo...` | `Đang tải danh sách embargo...` |
| `Da go embargo` | `Đã gỡ embargo` |
| `Go bo embargo cho ban ghi nay?` | `Gỡ bỏ embargo cho bản ghi này?` |
| `Loc theo trang thai embargo` | `Lọc theo trạng thái embargo` |
| `Tat ca trang thai` | `Tất cả trạng thái` |
| `Lam moi` | `Làm mới` |
| `Truoc` / `Sau` / `Tong` | `Trước` / `Sau` / `Tổng` |
| `Dang go...` | `Đang gỡ...` |
| `Recording` (th header) | `Bản ghi` |
| `Trang thai` (th header) | `Trạng thái` |
| `Hanh dong` (th header) | `Hành động` |
| `Ban ghi dang trong thoi han han che cong bo` | `Bản ghi đang trong thời hạn hạn chế công bố` |
| `Du kien ket thuc` | `Dự kiến kết thúc` |
| `Ban ghi dang bi tranh chap ban quyen` | `Bản ghi đang bị tranh chấp bản quyền` |
| `Trang thai hien tai` | `Trạng thái hiện tại` |
| `So vu tranh chap dang mo` | `Số vụ tranh chấp đang mở` |

---

## Phase X: Verification Checklist

### Functional — Critical

- [x] BE trả `SubmissionStatus = 5` → FE hiển thị `ModerationStatus.EMBARGOED` (không fallback PENDING_REVIEW)
- [x] `getModerationStatusLabel('EMBARGOED')` → `'Đang hạn chế công bố'`
- [x] `mapApiSubmissionStatusToModeration(5)` → `ModerationStatus.EMBARGOED`
- [x] `mapApiSubmissionStatusToModeration('embargoed')` → `ModerationStatus.EMBARGOED`

### Functional — High

- [x] RecordingDetailPage: guest truy cập bản ghi bị embargo → "Bản ghi không tồn tại hoặc đã bị hạn chế truy cập"
- [x] AdminRecordingTable: bản ghi embargo hiện badge cam `Đang hạn chế công bố`
- [x] ApprovedRecordingsPage: bản ghi embargo hiện badge cam

### Non-functional

- [x] Toàn bộ copy embargo components dùng tiếng Việt có dấu
- [x] `tsc --noEmit` pass
- [x] Không có lint error mới
- [ ] `window.confirm` trong EmbargoSection/EmbargoListPanel nên thay bằng ConfirmationDialog (optional)

---

## Thứ tự triển khai đề xuất

```
Phase 1   (Enum + Mapper + Label)  ██████████  Done
Phase 2   (Badge UI)               ██████████  Done
Phase 3   (404 Embargo)            ██████████  Done
Phase 4   (Fix copy tiếng Việt)    ██████████  Done
                                   ──────────
                                   Tổng: ~2h
```

> **Thứ tự khuyến nghị:** 1 → 4 → 2 → 3 (Phase 4 không có dependency, có thể xen giữa).

---

## Agent Assignments

| Phase | Agent/Approach | Files sửa |
|-------|---------------|-----------|
| Phase 1 | Ưu tiên 1 — enum/mapper | `moderation.ts`, `submissionApiMapper.ts`, `helpers.ts` |
| Phase 2 | Badge UI | `AdminRecordingTable.tsx`, `ApprovedRecordingsPage.tsx`, (optional `helpers.ts`) |
| Phase 3 | 404 UX | `useRecordingDetail.ts`, `RecordingDetailPage.tsx` |
| Phase 4 | Copy fix | `EmbargoSection.tsx`, `EmbargoListPanel.tsx`, `RecordingDetailPage.tsx` |

### Tổng files cần sửa

| Loại | Files |
|------|-------|
| **Sửa** (8 files) | `moderation.ts`, `submissionApiMapper.ts`, `helpers.ts`, `AdminRecordingTable.tsx`, `ApprovedRecordingsPage.tsx`, `useRecordingDetail.ts`, `RecordingDetailPage.tsx`, `EmbargoSection.tsx`, `EmbargoListPanel.tsx` |
| **Tạo mới** | Không |
| **Xóa** | Không |
