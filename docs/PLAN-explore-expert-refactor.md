# PLAN — Xem trang Explore & Refactor Expert Page

**Phạm vi:**
- `src/pages/ExplorePage.tsx` (688 dòng) — audit UX + cải thiện
- `src/pages/ModerationPage.tsx` (2 089 dòng) — refactor cấu trúc + cải thiện UX

**Ngày lập:** 2026-04-11

---

## A. EXPLORE PAGE — Audit & Cải thiện

### Hiện trạng

| Thành phần | Mô tả hiện tại |
|---|---|
| Layout | 2 cột: filter sidebar (sticky trên `lg+`, drawer trên mobile) + danh sách kết quả |
| Tìm kiếm | `ExploreSearchHeader`: dual-mode keyword vs semantic |
| Filter | `FilterSidebar` (facet draft → Áp dụng / Reset), 6+ facet types |
| Kết quả | Danh sách dọc, mỗi mục là card hàng ngang: title + badges + 5 metadata chips + Phát/Chi tiết |
| Phân trang | State `currentPage` + `totalResults` có nhưng **KHÔNG CÓ UI pagination** |
| Empty states | Tốt: phân biệt empty (semantic vs filter vs không data) |
| Error handling | Có error banner + fallback data source label |

### Vấn đề UX cần sửa

| # | Vấn đề | Mức độ | Mô tả |
|---|---|---|---|
| E1 | **Thiếu pagination UI** | Critical | `currentPage`/`totalResults` tồn tại nhưng user không thể chuyển trang — chỉ thấy trang 1 |
| E2 | **Data source label lộ technical info** | Medium | Dòng "Nguồn dữ liệu: recordingGuest / Search API" hiện ở mỗi lần load — user không cần biết |
| E3 | **Per-card source label lặp** | Low | Cùng 1 label hiện trên MỌI card — noisy khi tất cả đều cùng source |
| E4 | **Card quá dài trên mobile** | Medium | Mỗi card chiếm nhiều chiều cao (5 metadata chips stacked + 2 buttons) |
| E5 | **Semantic auto-sync URL** | Low | Debounced semantic text tự đẩy lên URL — có thể gây bất ngờ cho user |

---

## B. MODERATION PAGE (Expert) — Audit & Refactor

### Hiện trạng

| Thành phần | Mô tả hiện tại |
|---|---|
| Kích thước | **2 089 dòng** — quá lớn cho 1 file |
| Guard | Check `EXPERT` role, email confirmed, isActive |
| Tab system | 4 tab: `review` / `ai` / `knowledge` / `annotation` |
| Review tab | 2 cột: `ModerationQueueSidebar` + detail panel (header, media, panels, embargo, version timeline) |
| Modals | 6+ dialog/portal: verification wizard, reject form, unclaim, approve confirm, reject confirm, delete confirm |
| AI tab | Load từ localStorage → list flagged responses |
| Knowledge tab | `<KnowledgeBasePanel embedded />` (vừa fix) |
| Annotation tab | Sidebar + `AnnotationPanel` |
| State | 20+ state variables ở top level |

### Vấn đề cần refactor

| # | Vấn đề | Mức độ | Mô tả |
|---|---|---|---|
| M1 | **File quá lớn (2 089 LOC)** | Critical | Khó bảo trì, dễ gây regression; nên tách thành sub-components |
| M2 | **20+ state ở top level** | High | Nhiều state chỉ liên quan 1 tab — nên co-locate |
| M3 | **Vietnamese không dấu trong annotation tab** | Medium | "Khong co tieu de", "Chon mot ban thu" — thiếu nhất quán |
| M4 | **Thiếu loading state cho detail panel** | Medium | Khi `getLocalRecordingFull` đang chạy, user thấy partial data |
| M5 | **Visual density quá cao** | Medium | Review tab stack: header + media + detail panels + embargo + version timeline — rất dài trên mobile |
| M6 | **AI tab chỉ localStorage** | Low | Placeholder cho future server sync — ghi chú rõ ràng hơn |
| M7 | **Modal stacking phức tạp** | Medium | 6 portal/overlay cùng quản lý body scroll lock — dễ conflict |

---

## Implementation Phases

### Phase 1 — Explore: Pagination UI + cleanup

**Mục tiêu:** Thêm UI phân trang cho Explore và dọn dẹp label kỹ thuật.

#### 1A — Pagination controls

Thêm component phân trang ở cuối danh sách kết quả:

```
Trước   Trang 1 / N   Sau
```

- Tính `totalPages = Math.ceil(totalResults / PAGE_SIZE)`
- Buttons Trước/Sau disable khi ở đầu/cuối
- Click → `setCurrentPage` → trigger reload
- Scroll to top khi chuyển trang

#### 1B — Cleanup data source labels

- **Remove** dòng `dataSourceLine` hiện toàn cục (technical info)
- **Remove** per-card `cardSourceLabel` (hoặc chỉ hiện ở dev mode)
- Giữ lại `dataSource` state để debug qua console nếu cần

#### 1C — Card compact trên mobile

- Trên `sm-`, metadata chips hiện tối đa 3 (ẩn 2 chip cuối với "+2 thêm" badge)
- Buttons Phát/Chi tiết xếp ngang thay vì dọc trên mobile

**File thay đổi:** `src/pages/ExplorePage.tsx`

---

### Phase 2 — ModerationPage: Tách review tab thành component riêng

**Mục tiêu:** Giảm kích thước `ModerationPage.tsx` bằng cách extract review tab ra component riêng.

#### 2A — Extract `ModerationReviewTab`

Tạo `src/components/features/moderation/ModerationReviewTab.tsx`:
- Nhận props: `selectedId`, `selectedItemFull`, `onSelectItem`, queue hooks, dialog handlers
- Chứa: queue sidebar + detail panel + claim actions + media + detail panels + embargo + version timeline
- Di chuyển merge logic (`mergeDisplayItem`, `convertedForPlayer`, media resolution) vào component mới

#### 2B — Extract `ModerationAITab`

Tạo `src/components/features/moderation/ModerationAITab.tsx`:
- Nhận props: `aiResponses`, `aiResponsesLoaded`, flag handlers
- Chứa: AI response list, flag/unflag UI, citation links

#### 2C — Extract `ModerationAnnotationTab`

Tạo `src/components/features/moderation/ModerationAnnotationTab.tsx`:
- Nhận props: `selectedId`, `selectedItemFull`, sidebar, `AnnotationPanel`
- Chứa: sidebar + annotation panel layout

**Kết quả:** `ModerationPage.tsx` giảm còn ~500–700 LOC (shell + tabs + dialog portals + shared state)

**File thay đổi:**
- `src/pages/ModerationPage.tsx` (modify — extract)
- `src/components/features/moderation/ModerationReviewTab.tsx` (new)
- `src/components/features/moderation/ModerationAITab.tsx` (new)
- `src/components/features/moderation/ModerationAnnotationTab.tsx` (new)

---

### Phase 3 — ModerationPage: Fix Vietnamese + loading states

**Mục tiêu:** Sửa lỗi UX nhỏ nhưng đáng chú ý.

#### 3A — Fix Vietnamese không dấu

Tìm và sửa tất cả chuỗi tiếng Việt thiếu dấu trong annotation tab:
- `"Khong co tieu de"` → `"Không có tiêu đề"`
- `"Chon mot ban thu"` → `"Chọn một bản thu"`
- Các chuỗi khác nếu có

#### 3B — Detail panel loading state

Khi `selectedId` đã set nhưng `selectedItemFull` chưa load xong:
- Hiện `LoadingSpinner` hoặc skeleton trong right panel
- Ẩn partial data cho đến khi load xong

#### 3C — Mobile density improvement

- Review tab right panel: collapsible sections cho Embargo + Version Timeline (mặc định đóng trên mobile)
- Hoặc: accordion pattern cho các section metadata

**File thay đổi:**
- `src/components/features/moderation/ModerationReviewTab.tsx`
- `src/components/features/moderation/ModerationAnnotationTab.tsx`
- `src/pages/ModerationPage.tsx`

---

### Phase 4 — ModerationPage: Modal consolidation

**Mục tiêu:** Gom portal/modal management thành pattern nhất quán.

#### 4A — Unified modal state

Thay 6 boolean state riêng lẻ bằng 1 discriminated union:

```ts
type ActiveModal =
  | { kind: 'none' }
  | { kind: 'unclaim' }
  | { kind: 'approve'; notes: string }
  | { kind: 'reject'; notes: string }
  | { kind: 'rejectNote' }
  | { kind: 'delete'; targetId: string };

const [activeModal, setActiveModal] = useState<ActiveModal>({ kind: 'none' });
```

- Body scroll lock dựa trên `activeModal.kind !== 'none'`
- Escape handler duy nhất dispatch `{ kind: 'none' }`
- Mỗi modal render dựa trên `activeModal.kind`

#### 4B — Extract `ModerationModals` component

Gom tất cả portal/modal vào 1 component:
- Props: `activeModal`, `onClose`, `onConfirm*` handlers
- Giảm clutter trong `ModerationPage` shell

**File thay đổi:**
- `src/pages/ModerationPage.tsx`
- `src/components/features/moderation/ModerationModals.tsx` (new)

---

### Phase X — Kiểm tra & Xác minh

#### Checklist tự động

```bash
npm run lint          # 0 errors/warnings
npm run build         # 0 TypeScript errors
npm run test:unit     # no regression
```

#### Checklist thủ công — Explore

- [ ] Explore: pagination buttons hiện khi có > PAGE_SIZE kết quả
- [ ] Explore: click Trước/Sau chuyển trang đúng
- [ ] Explore: page auto-scroll top khi chuyển trang
- [ ] Explore: data source label không còn hiện cho user
- [ ] Explore: mobile card compact hơn (max 3 chips)
- [ ] Explore: filter sidebar vẫn hoạt động đúng (keyword + semantic)
- [ ] Explore: empty state vẫn hiện đúng

#### Checklist thủ công — ModerationPage

- [ ] Review tab: sidebar + detail vẫn hoạt động bình thường
- [ ] Review tab: claim → wizard → approve/reject flow không bị break
- [ ] Review tab: loading spinner hiện khi đang tải detail
- [ ] AI tab: flag/unflag vẫn hoạt động
- [ ] Knowledge tab: KB panel vẫn hoạt động
- [ ] Annotation tab: Vietnamese có dấu đầy đủ
- [ ] Annotation tab: panel vẫn hoạt động
- [ ] Modal: tất cả dialog (unclaim, approve, reject, delete) vẫn mở/đóng đúng
- [ ] Modal: Escape đóng modal đang active
- [ ] Mobile: review tab không quá dài (sections collapsible)

---

## Tóm tắt file thay đổi

| File | Loại | Phase |
|---|---|---|
| `src/pages/ExplorePage.tsx` | Modify | Phase 1 |
| `src/pages/ModerationPage.tsx` | Modify | Phase 2, 3, 4 |
| `src/components/features/moderation/ModerationReviewTab.tsx` | **New** | Phase 2 |
| `src/components/features/moderation/ModerationAITab.tsx` | **New** | Phase 2 |
| `src/components/features/moderation/ModerationAnnotationTab.tsx` | **New** | Phase 2 |
| `src/components/features/moderation/ModerationModals.tsx` | **New** | Phase 4 |

## Phụ thuộc mới

Không cần cài thêm package.

## Effort ước tính

| Phase | Ước tính |
|---|---|
| Phase 1 (Explore: pagination + cleanup) | 40 phút |
| Phase 2 (Moderation: tách 3 tab components) | 90 phút |
| Phase 3 (Vietnamese fix + loading + mobile) | 30 phút |
| Phase 4 (Modal consolidation) | 45 phút |
| Phase X (Verify) | 15 phút |
| **Tổng** | **~3 giờ 40 phút** |
