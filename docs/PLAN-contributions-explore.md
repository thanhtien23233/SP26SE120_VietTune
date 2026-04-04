# PLAN: Trang “Đóng góp của bạn” theo phong cách Explore

**Slug:** `contributions-explore`  
**Yêu cầu:** Dựa vào UI/UX `ExplorePage.tsx`, thiết kế lại `ContributionsPage.tsx` (“Đóng góp của bạn”).  
**Phạm vi tài liệu:** Chỉ kế hoạch — không bao gồm triển khai code tại đây.

---

## Phase -1 — Context check

| Mục | Trạng thái |
|-----|------------|
| **Tham chiếu Explore** | `ExplorePage.tsx`: gradient page, `max-w-7xl`, lưới `lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]`, aside sticky, thẻ `border-secondary-200/50`, gradient cream, icon + `ring-1 ring-secondary-200/50`. Đóng nút drawer mobile: class `rounded-lg p-2 … focus-visible:ring-2 focus-visible:ring-primary-500` (tham chiếu cho nút X modal). |
| **Tham chiếu tab** | `ExploreSearchHeader.tsx`: tab active = nền trắng/cream, `ring-2 ring-secondary-300/70`, chữ đậm; inactive = hover `secondary-50`. |
| **Trang hiện tại** | `ContributionsPage.tsx`: layout một cột; legend + tab ngang; list thẻ; modal header primary đặc. |
| **Logic cần giữ** | `getMySubmissions`, `activeStatusTab`, pagination, detail modal, quick edit, delete, Expert redirect, contributor gate. |
| **Ràng buộc triển khai** | Desktop: sidebar chứa legend + menu tab dọc; main chỉ list + phân trang. Mobile: **không** drawer toàn màn như Explore; tab = thanh cuộn ngang dưới header; legend thu gọn hoặc cuối trang. Legend: **không** stepper/connector. |

---

## Phase 0 — Quyết định đã chốt (stakeholder)

### 1. Bố cục & lưới (Desktop / Mobile)

- **Có** lưới **2 cột** giống Explore trên **desktop** (`lg:grid …`).
- **Cột trái (aside sticky):** “Bảng điều khiển” — gồm (1) khối **giải thích luồng kiểm duyệt** (legend/chú giải tĩnh) và (2) **tab lọc trạng thái** dạng **menu dọc** (tinh thần tương tự `FilterSidebar` / cột trái Explore), cùng `activeStatusTab` hiện tại.
- **Cột phải (main):** Chỉ **danh sách thẻ** + **phân trang** (và trạng thái loading/error/empty trong vùng này).
- **Mobile:** **Không** drawer che màn hình. Tab trạng thái = **thanh cuộn ngang** (`overflow-x-auto`), đặt **ngay dưới header** (sau notice nếu có). Khối legend có thể **thu gọn** (ví dụ `<details>` / “Xem thêm”) hoặc đưa **xuống cuối** màn hình.

### 2. Khối “Theo dõi luồng kiểm duyệt”

- Chỉ **skin Explore** — **không** stepper, **không** connector line.
- Lý do: Stepper gợi quy trình người dùng đang làm (như upload); đây chỉ là **legend tĩnh**.
- Giữ **4 nhãn độc lập** (pill), đặt trong thẻ `from-[#FFFCF5]`, icon nhỏ có `ring-1`, tiêu đề `text-neutral-900`; tránh màu primary chói kiểu cũ nếu không cần semantic.

### 3. Tab lọc trạng thái

- **Đồng bộ visual** với pattern tab trong **`ExploreSearchHeader`**: active = nền trắng/cream + `ring-1 ring-secondary-200` (hoặc tương đương `ring-secondary-300/70` như file gốc) + chữ đậm; inactive = nền trong suốt / nhạt, hover rõ.
- **Desktop:** các tab nằm trong sidebar dọc; **Mobile:** cùng class nhưng bố cục hàng ngang cuộn được.

Chi tiết implement: có thể trích/xuất helper class chung hoặc copy token từ `ExploreSearchHeader` (ưu tiên consistency, tránh fork logic tìm kiếm).

### 4. Modal chi tiết bản thu

- **Restyle toàn bộ** — **bỏ** header khối **solid primary**.
- Panel: gradient `from-[#FFFCF5]`, `border-secondary-200/50`, `rounded-2xl`.
- Header modal: phân cách bằng spacing hoặc `border-b` mỏng; tiêu đề neutral/cream tone.
- Nút đóng (X): cùng họ với nút đóng drawer Explore (`hover:bg-neutral-100`, `focus-visible:ring-2 focus-visible:ring-primary-500`, v.v.).

### 5. Danh sách thẻ

- **Giữ list 1 cột** (quản lý: badge, thời gian, nút Sửa/Xóa cần không gian ngang).
- **Không** grid nhiều cột kiểu Explore results.
- Mỗi item: `rounded-xl` hoặc `rounded-2xl`, `border-secondary-200/50`, shadow nhẹ, hover nổi giống vùng kết quả Explore.

---

## Mục tiêu thiết kế (tóm tắt)

- Shell + notice contributor giống tinh thần `UploadPage` / Explore.
- Desktop: grid sidebar (legend + tab dọc) + main (cards + pagination).
- Mobile: tabs ngang scroll, legend gọn/cuối, không drawer.
- Legend = thẻ cream, 4 pill, không connector.
- Tabs = pattern ExploreSearchHeader.
- Modal = cream toàn bộ, không header đỏ đặc.
- Cards = 1 cột, token Explore.

## Ngoài phạm vi (giai đoạn này)

- Đổi API / hợp đồng backend.
- Bộ lọc metadata nâng cao.
- Stepper/connector cho luồng kiểm duyệt.
- Grid nhiều cột cho danh sách đóng góp.

---

## Phân rã công việc

### Phase 1 — Shell & notice

| # | Task | Ghi chú |
|---|------|---------|
| 1.1 | Root: gradient Explore + `min-h-screen` | |
| 1.2 | `max-w-7xl`, `py-8`, header `mb-6 lg:mb-8`, `BackButton` trong `shrink-0` | |
| 1.3 | Notice contributor: cream/secondary + ring; CTA `focus-visible:ring` | Giữ copy hiện tại |

### Phase 2 — Lưới desktop & mobile

| # | Task | Ghi chú |
|---|------|---------|
| 2.1 | `lg:grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:items-start` | Giống Explore |
| 2.2 | **Aside:** `rounded-2xl border border-secondary-200/50`, gradient cream, `lg:sticky lg:top-32 xl:top-40` (khớp `MainLayout` như `UploadPage`) | Tiêu đề aside + icon ring |
| 2.3 | Trong aside: legend (mục 3 Phase tiếp) + **nav dọc** tab trạng thái (`role="tablist"` / `aria-selected` nếu phù hợp) | Cùng state `activeStatusTab`, `setActiveStatusTab` |
| 2.4 | **Main:** một wrapper thẻ Explore chứa error/loading/empty/list + pagination | Không nhét legend/tabs desktop vào main |
| 2.5 | **Mobile:** ẩn aside hoặc chỉ legend cuối/trong `<details>`; **hàng tab** `flex overflow-x-auto` + `shrink-0`, sticky tùy chọn dưới header | Không fixed drawer phủ màn |

### Phase 3 — Legend, tab, cards, modal

| # | Task | Ghi chú |
|---|------|---------|
| 3.1 | Legend: thẻ cream, `h2`/`h3` `text-neutral-900`, 4 pill độc lập + icon nhỏ ring | **Không** connector |
| 3.2 | Tab: class mirror `ExploreSearchHeader` (active ring + cream, inactive hover) | `min-h-[44px]` |
| 3.3 | `renderSubmissionCard`: `border-secondary-200/50`, shadow/hover Explore; badge status giữ ý nghĩa, chỉnh contrast trên nền cream | List 1 cột |
| 3.4 | Pagination + nút trong card: token Explore, `focus-visible:ring` | |
| 3.5 | Error / empty / loading: bố cục giống Explore empty state | |
| 3.6 | Modal chi tiết: bỏ header gradient đậm; full cream panel; header line mỏng; nút X như Explore drawer | `aria-modal`, đóng overlay |

### Phase 4 — A11y, sticky, QA

| # | Task | Ghi chú |
|---|------|---------|
| 4.1 | Keyboard: tab list, Escape đóng modal (nếu chưa có) | |
| 4.2 | Sticky aside: `top-*` khớp header app | Tham chiếu UploadPage |
| 4.3 | Regression: Expert, guest, từng `activeStatusTab`, pagination, xóa, mở chi tiết | |

### Phase 5 — E2E (tuỳ chọn)

| # | Task | Ghi chú |
|---|------|---------|
| 5.1 | `08-contributions-explore-ui.spec.ts`: guest, contributor (login UI), có/không sidebar desktop | |

---

## Verification checklist (trước khi merge)

- [ ] Gradient page + grid 2 cột desktop; mobile không drawer, tab ngang scroll.
- [ ] Sidebar: legend (4 pill, không connector) + menu tab dọc; main chỉ cards + pagination.
- [ ] Tab trạng thái trông nhất quán với ExploreSearchHeader.
- [ ] Thẻ list 1 cột, viền/shadow/hover Explore.
- [ ] Modal cream, không header primary đặc; nút X giống Explore drawer.
- [ ] Logic `loadSubmissions` / filter / pagination không đổi hành vi.
- [ ] (Tuỳ chọn) E2E contributions pass.

---

## Tài liệu tham chiếu

- `src/pages/ExplorePage.tsx` — grid, aside, thẻ kết quả, nút đóng drawer.
- `src/components/features/ExploreSearchHeader.tsx` — tab active/inactive.
- `src/pages/UploadPage.tsx` — sticky offset, notice.
- `src/pages/ContributionsPage.tsx`

---

*Cập nhật: Phase 0 đã chốt (grid + sidebar điều khiển, legend không stepper, tab ExploreSearchHeader, modal cream, list 1 cột).*
