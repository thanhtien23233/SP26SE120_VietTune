# PLAN: Kiểm tra và thống nhất toàn bộ UI

> **Trạng thái:** Đang triển khai (diacritics đã fix)  
> **Ngày tạo:** 2026-04-20  
> **Điểm nhất quán hiện tại:** ~6.5 / 10

---

## Tóm tắt kết quả kiểm tra

| Hạng mục | Mức độ | Trạng thái |
|---|---|---|
| Thiếu dấu tiếng Việt (diacritics) | 🔴 High | **ĐÃ FIX** |
| Panel / card layout tokens | 🟡 Medium | Cần fix |
| Button / CTA patterns | 🟡 Medium | **ĐÃ FIX (Phase 2)** |
| Modal / Dialog patterns | 🟡 Medium | **ĐÃ FIX (Phase 3)** |
| Typography scale | 🟢 Low | Cần tài liệu |
| Loading states | 🟢 Low | Cần thống nhất |

---

## ✅ ĐÃ HOÀN THÀNH

### Fix diacritics (HIGH)
| File | Strings đã sửa |
|---|---|
| `DisputeReportForm.tsx` | 12 chuỗi (Báo cáo vi phạm, Loại tranh chấp, Mô tả chi tiết, Gửi báo cáo, Hủy, v.v.) |
| `FlaggedResponseList.tsx` | 13 chuỗi (Bản sửa chuyên gia, Bỏ gắn cờ, Lưu bản sửa, Không tải được, v.v.) |
| `DisputeListPanel.tsx` | 3 chuỗi (Không tải được, Thông báo cho người đóng góp, Xác nhận kết quả) |

---

## 🔧 CẦN LÀM TIẾP

---

### Phase 1: Thống nhất Panel/Card token (Medium)

**Vấn đề:** `SURFACE_CARD` constant chỉ được định nghĩa trong `RecordingDetailPage.tsx`. Tất cả các trang khác dùng chuỗi className dài khác nhau:
- `RecordingDetailPage` → `rounded-xl border border-neutral-200/80 bg-surface-panel p-4 sm:p-5 shadow-sm`
- `ContributionsPage` → `rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg`
- `ProfilePage` → `rounded-2xl border ... bg-surface-panel`

**Giải pháp:** Tạo file `src/utils/surfaceTokens.ts` export các constant:
```ts
export const SURFACE_CARD = 'rounded-xl border border-neutral-200/80 bg-surface-panel p-4 sm:p-5 shadow-sm';
export const SURFACE_PANEL_GRADIENT = 'rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg';
```

**File cần update:**
- [ ] `src/pages/ContributionsPage.tsx` — import từ `surfaceTokens.ts`
- [ ] `src/pages/ProfilePage.tsx` — import từ `surfaceTokens.ts`
- [ ] `src/pages/ExplorePage.tsx` — import từ `surfaceTokens.ts`
- [ ] `src/pages/RecordingDetailPage.tsx` — move constant sang `surfaceTokens.ts`
- [ ] `src/pages/HomePage.tsx` — check & import
- [ ] `src/pages/SearchPage.tsx` — check & import

---

### Phase 2: Thống nhất Button / CTA (Medium)

**Vấn đề:** 3 dạng CTA cùng tồn tại:
1. Component `<Button variant="primary">` — gradient, rounded-xl
2. Raw `<button className="bg-primary-600 rounded-xl ...">` — flat, không dùng component
3. `<button className="bg-red-600 ...">` — destructive actions không dùng `danger` variant

**File có raw button cần thay bằng `<Button>`:**
- [x] `ExploreResultRow.tsx` line 132 (Phát + Chi tiết)
- [x] `NotificationPage.tsx` line 120
- [x] `DisputeReportForm.tsx` line 134 (Gửi báo cáo)
- [x] `FlaggedResponseList.tsx` các nút inline
- [x] `DisputeListPanel.tsx` (Xác nhận kết quả)
- [x] `ModerationClaimActions.tsx` line 108

**Destructive buttons cần dùng `Button variant="danger"`:**
- [x] `ModerationModals.tsx` lines 354, 431
- [x] `ContributionsPage.tsx` line 413 (`ConfirmationDialog`)
- [x] `AdminDashboard.tsx` lines 328, 344, 542

---

### Phase 3: Thống nhất Modal / Dialog (Medium)

**Vấn đề:** 3 dạng modal pattern khác nhau:

| Modal | z-index | Panel fill | Close button |
|---|---|---|---|
| ContributionsDetailModal | z-50 | gradient via cream | rounded-lg neutral |
| ModerationVerificationWizardDialog | z-[100] | `#FFF2D6` (hardcoded hex) | rounded-full white |
| ProfilePage modal | z-50 | `#FFF2D6` (hardcoded hex) | rounded-xl neutral |

**Giải pháp đề xuất:** Tạo `src/components/common/ModalShell.tsx` với props:
- `title`, `onClose`, `maxWidth`, `children`
- Dùng `bg-surface-panel` thay hex hardcoded
- z-index chuẩn hóa: `z-[100]` cho modal chính, `z-[120]` cho nested

**File cần update:**
- [x] `ModerationVerificationWizardDialog.tsx` — thay `#FFF2D6` bằng `bg-surface-panel`
- [x] `ProfilePage.tsx` — thay `#FFF2D6` bằng `bg-surface-panel`
- [ ] (Optional) wrap trong `ModalShell` nếu cấu trúc tương đồng

---

### Phase 4: Loading states (Low)

**Vấn đề:** 3 cách hiển thị loading:
1. `<LoadingSpinner>` — full page/section block
2. `<Loader2 className="animate-spin">` — inline trong button/form
3. `<Button isLoading>` — SVG spinner riêng

**Giải pháp:** Thống nhất quy tắc:
- Full page → `<LoadingSpinner size="lg">`
- Inline trong form/button → `<Loader2 className="h-4 w-4 animate-spin">`
- Skeleton cho danh sách → tạo `<ListSkeleton rows={n}>` component tái dụng

**File:**
- [ ] `NotificationPage.tsx` — có pulse skeleton one-off, cân nhắc tách ra component
- [ ] Chuẩn hoá tài liệu pattern

---

### Phase 5: Typography scale (Low)

**Quy tắc đề xuất:**
| Level | Class | Dùng cho |
|---|---|---|
| Page title | `text-2xl sm:text-3xl font-bold text-neutral-900` | `<h1>` mỗi page |
| Section heading | `text-xl font-semibold text-neutral-900` | `<h2>` section chính |
| Panel heading | `text-base font-semibold text-neutral-900` | `<h3>` trong card/panel |
| Eyebrow | `text-xs font-semibold uppercase tracking-wide text-primary-800` | Label trên h1 |

**File cần kiểm tra:**
- [ ] `NotificationPage.tsx` — h1 dùng `text-neutral-800` → sửa thành `text-neutral-900`
- [ ] Các page khác spot-check

---

## Verification Checklist

- [ ] `tsc --noEmit` pass sau mỗi phase
- [ ] Không có lint errors
- [ ] Build production pass
- [ ] Spot-check visual trên browser: RecordingDetail, Explore, Contributions, Profile
- [ ] Spot-check Admin: FlaggedResponseList, DisputeListPanel, DisputeReportForm
- [ ] Diacritics test: mở tất cả modal/form, kiểm tra text hiển thị đúng dấu

---

## Ưu tiên triển khai

```
✅ Phase 0: Fix diacritics (DONE)
→ Phase 1: Surface tokens   (impact cao, dễ)
→ Phase 3: Modal hardcoded hex  (impact medium, nhanh)
→ Phase 2: Button standardize  (impact medium, cẩn thận)
→ Phase 4: Loading   (impact thấp)
→ Phase 5: Typography  (documentation)
```
