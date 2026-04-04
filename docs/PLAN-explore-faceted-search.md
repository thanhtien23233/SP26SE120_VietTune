# PLAN: Refactor Explore Page - Faceted 2-Column UX

## Phase -1: Context Check

### User Request
- Refactor trang `Khám phá âm nhạc dân tộc` từ layout dọc sang layout 2 cột kiểu streaming học thuật.
- Sidebar faceted filters (sticky), main content gồm mode switch + search + recordings grid.
- Tối ưu UX, responsive, tone đỏ gạch + kem nhạt, dùng `lucide-react`.

### Scope Chosen (Socratic Gate)
- Scope: `full_rework` (UI + state + data flow).
- Mobile filter: `drawer` (nút mở Drawer/Sheet).
- Semantic mode: `same_page_switch` (không chuyển trang, đổi logic search trong cùng Explore).

### Current State Snapshot
- `ExplorePage` đang theo bố cục cũ, ưu tiên stacked content.
- Cần tách rõ concern:
  - filter sidebar
  - search/mode controls
  - result grid/cards.
- Hệ thống đã dùng TypeScript + Tailwind + `lucide-react`.

### Constraints
- Planning only, không viết code trong phase này.
- Không phá route hiện có của Explore.
- Giữ consistency với brand VietTune và accessibility.

---

## Phase 0: Socratic Gate (Q&A Summary)

### Quyết định đã chốt
1. Làm full rework Explore (không chỉ skin UI).
2. Mobile dùng Drawer cho filters.
3. Semantic mode nằm trong cùng page (switch logic nội bộ).

### Assumptions
- Dữ liệu facet có thể lấy từ nguồn hiện có hoặc suy ra từ recordings list.
- Search modes có thể chia thành:
  - keyword query
  - semantic query (API/path riêng hoặc param mode).
- Có thể incremental rollout: giữ fallback về keyword nếu semantic fail.

---

## Phase 1: Layout Architecture (2-Column Foundation)

### Goal
- Dựng khung 25/75 rõ ràng, responsive và sticky sidebar.

### Tasks
1. Tạo page shell:
   - nền warm cream
   - container rộng rãi (`max-w` lớn, spacing thoáng).
2. Desktop layout:
   - trái 25%: filter sidebar (`sticky top-4`).
   - phải 75%: mode switch + search + result grid.
3. Mobile layout:
   - ẩn sidebar mặc định
   - nút `Bộ lọc` mở Drawer.
4. Tablet behavior:
   - kiểm tra breakpoint để không bị cramped.

### Deliverables
- Explore layout blueprint.
- Breakpoint matrix cho desktop/tablet/mobile.

---

## Phase 2: FilterSidebar Component (Faceted Filters)

### Goal
- Tạo sidebar filter dạng accordion, dễ quét và dễ thao tác.

### Tasks
1. Tách component `FilterSidebar`:
   - props: options, selected, onChange, onApply, onReset.
2. Accordion groups:
   - Dân tộc (checkbox list)
   - Thể loại/Nhạc cụ (checkbox list)
   - Khu vực (select/tags)
   - Bối cảnh văn hóa (checkbox list)
3. Footer actions:
   - `Áp dụng` (primary đỏ đậm)
   - `Xóa bộ lọc` (outline).
4. Mobile Drawer integration:
   - mở/đóng drawer
   - apply xong tự đóng.

### Deliverables
- `FilterSidebar` spec + interaction states.
- Filter state shape chuẩn hóa.

---

## Phase 3: Search Header + Mode Switch

### Goal
- Biến search area thành control center rõ ràng và dễ dùng.

### Tasks
1. Thêm mode switch/tabs:
   - `Tìm theo từ khóa`
   - `Tìm theo ngữ nghĩa`.
2. Search bar nổi bật:
   - input lớn + icon Search bên trong.
3. State/data behavior:
   - mode đổi -> query strategy đổi.
   - giữ query hiện tại hoặc reset theo rule rõ ràng.
4. Request orchestration:
   - keyword path và semantic path trong cùng page.
   - loading/empty/error states riêng cho từng mode.

### Deliverables
- Search interaction contract.
- API integration strategy by mode.

---

## Phase 4: Recordings Grid + Card Redesign

### Goal
- Tăng mật độ thông tin nhưng vẫn dễ đọc, giảm cồng kềnh waveform.

### Tasks
1. Grid setup:
   - `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
2. Tách component `RecordingCardCompact` (hoặc refactor `RecordingCard`):
   - thumbnail gọn
   - title đậm
   - badges (dân tộc, nhạc cụ)
   - play button tròn đỏ
   - stats text nhỏ (lượt nghe/lượt tải/nguồn)
   - CTA `Xem chi tiết`.
3. Bỏ waveform lớn khỏi Explore grid version.
4. Hover/focus states đồng nhất.

### Deliverables
- Card spec mới cho Explore.
- Mapping field data -> UI badges/meta.

---

## Phase 5: Data Flow, State & Performance

### Goal
- Đảm bảo rework mượt, state rõ ràng, không over-render.

### Tasks
1. State model:
   - `searchMode`, `query`, `pendingFilters`, `appliedFilters`, `pagination`.
2. Apply flow:
   - filter chỉ tác động khi bấm `Áp dụng`.
3. API/query optimization:
   - debounce input search phù hợp
   - cancel request cũ khi query/mode đổi.
4. Memoization:
   - options transform
   - card list mapping.

### Deliverables
- State diagram + request lifecycle.
- Performance checklist.

---

## Phase 6: Accessibility, Responsive QA, Regression

### Goal
- Chốt chất lượng trước rollout.

### Tasks
1. Accessibility:
   - keyboard nav cho accordion, tabs, drawer.
   - focus ring rõ.
   - aria labels cho icons/buttons.
2. Responsive QA:
   - desktop/tablet/mobile.
   - drawer behavior ổn định trên mobile.
3. Regression:
   - không phá route detail.
   - không phá semantic/keyword existing contracts.
4. Visual consistency:
   - tone đỏ gạch + kem nhạt nhất quán toàn page.

### Deliverables
- QA pass checklist.
- Rollout readiness summary.

---

## Agent Assignments

### Agent A - Layout & Sidebar
- Dựng shell 2 cột + sticky + drawer mobile.

### Agent B - Search & Mode Logic
- Implement tabs, keyword/semantic switching, request flow.

### Agent C - Card/UX & QA
- Refactor cards, badges, accessibility, regression testing.

---

## Verification Checklist (Phase X)

**Trạng thái (đối chiếu code, 2026-03):** các mục dưới đã được xác minh trên `ExplorePage`, `FilterSidebar`, `ExploreSearchHeader`, `RecordingCardCompact`, `exploreRecordingsLoad` / `exploreFacetDraft`. Desktop dùng `lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]` (sidebar cố định hẹp + main co giãn) — tương đương mục tiêu 2 cột, không phải đúng 25%/75% pixel-perfect.

### Layout
- [x] Desktop đúng tỉ lệ 25/75. *(≈ sidebar 260–320px + cột chính `1fr`; đạt intent 2 cột.)*
- [x] Sidebar sticky hoạt động khi scroll. *(`lg:sticky lg:top-24` trên `aside`.)*
- [x] Mobile dùng Drawer filter mượt. *(Panel trượt, backdrop, Escape, khóa scroll, ARIA dialog — Phase 6.)*

### Filters
- [x] Accordion groups đầy đủ theo spec. *(Dân tộc, thể loại ghi âm, dòng nhạc, nhạc cụ, khu vực, bối cảnh văn hóa.)*
- [x] `Áp dụng` và `Xóa bộ lọc` hoạt động đúng.
- [x] Filter state rõ pending/applied. *(`facetDraft` pending → URL/`filters` khi Áp dụng; đồng bộ từ URL vào draft.)*

### Search Modes
- [x] Tab keyword/semantic hoạt động trong cùng page. *(`mode` trên URL + `ExploreSearchHeader`.)*
- [x] Search bar lớn + icon đúng thiết kế.
- [x] Loading/error/empty state rõ ràng. *(`LoadingSpinner`, `searchError`, empty copy + CTA.)*

### Grid & Card
- [x] Grid 1/2/3 cột theo breakpoint. *(`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.)*
- [x] Card gọn, bỏ waveform lớn. *(`RecordingCardCompact` không dùng waveform.)*
- [x] Badges + play button + stats + detail CTA hiển thị đúng.

### Quality
- [x] Responsive pass. *(Breakpoint + drawer; co giãn lên desktop đóng drawer.)*
- [x] Accessibility pass cơ bản. *(Phase 6: tablist/tabpanel, drawer dialog, focus, `aria-live` kết quả.)*
- [x] Không regression hành vi route/detail/search. *(`to={/recordings/${id}}`, `linkState`; route `/explore` giữ nguyên.)*

---

## Next Execution Entry Point
- Phases 1–6 + Phase X (checklist) đã gắn với codebase hiện tại.
- Việc tiếp theo (ngoài plan gốc): polish theo feedback UX, E2E cho `/explore`, hoặc mở rộng facet/API nếu product yêu cầu.
