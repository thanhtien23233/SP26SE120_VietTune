# PLAN: HomePage UI/UX — đồng bộ với Explore

## Phase -1: Context Check

### User Request
- Chỉnh **UI/UX trang Chủ (`HomePage`)** cho **giống phong cách trang Khám phá (`ExplorePage`)**: màu sắc, khối nội dung, lưới bản thu, hành vi tìm kiếm (ở mức trải nghiệm nhìn & tương tác), không phá route hay luồng nghiệp vụ cốt lõi nếu không được chốt.

### Current State Snapshot (rút gọn)

| Khía cạnh | `HomePage` (hiện tại) | `ExplorePage` (tham chiếu) |
|-----------|------------------------|----------------------------|
| Nền trang | `min-h-screen` không class nền toàn trang rõ (nền từ `MainLayout` #FFF2D6) | Gradient kem / cream + secondary nhạt |
| Hero | Một khối lớn `rounded-3xl`, `#FFFCF5`, logo + tagline + form “AI” giả lập → modal đăng nhập | Không có hero marketing; tiêu đề trang + `BackButton` |
| Tìm kiếm | Một ô semantic + nút primary đỏ; không tab keyword/semantic | `ExploreSearchHeader`: tab keyword/semantic, ô nhập secondary/cream, nút Tìm gradient vàng |
| Danh sách bản thu | `RecordingCard`, grid 4 cột, khối section `#FFFCF5` | `RecordingCardCompact`, grid 3 cột, khối gradient kem/secondary |
| Bộ lọc | Không có sidebar facet | `FilterSidebar` + drawer mobile |

### Constraints
- **Kế hoạch chỉ** — không triển khai code trong tài liệu này.
- Giữ **brand** VietTune (primary đỏ, secondary vàng, cream).
- Tránh phá **SEO/hero** và **modal gateway** nếu product vẫn cần (chốt ở Phase 0).

---

## Phase 0: Socratic Gate (cần chốt trước khi code)

### Câu hỏi làm rõ (trả lời khi implement)

1. **Phạm vi “giống Explore”**  
   - **A — Chỉ skin:** cùng token màu, bo góc, shadow, style ô tìm kiếm và thẻ bản thu; **giữ** hero + modal + `RecordingCard`.  
   - **B — Gần full:** đổi `RecordingCard` → `RecordingCardCompact`, grid 3 cột; hero thu gọn hoặc tách khối giống Explore (không bắt buộc 2 cột filter).  
   - **C — Tối đa:** thêm vùng “Khám phá nhanh” link `/explore` + tái sử dụng component tìm kiếm giống Explore (có thể variant `embedded`).

   *Đề xuất mặc định:* **B** (đồng bộ thẻ + lưới + khối section rõ ràng nhất) hoặc **A** nếu muốn ít đụng logic.

2. **Hero + form semantic giả (gateway modal)**  
   - Giữ nguyên hành vi “gõ → chờ → mở modal đăng nhập”?  
   - Hay thay bằng CTA “Đi tới Khám phá” / embed ô giống Explore (keyword thật → `/explore?q=...`)?

3. **Nền trang Chủ**  
   - Có áp dụng **cùng** lớp nền gradient như Explore (`from-cream-50 via-… to-secondary-50/35`) cho `HomePage` wrapper không, hay chỉ đổi màu các **card** bên trong?

4. **Section “Phổ biến / Gần đây”**  
   - Giữ `SectionHeader` + `RecordingCard` hay đổi tiêu đề khối giống Explore (icon + `Music`, `rounded-2xl`, border `secondary`)?

### Giả định nếu không có phản hồi
- Áp dụng **đồng bộ trực quan** (màu khối, border, shadow, grid 3 cột + `RecordingCardCompact`) **không** thêm full `FilterSidebar` lên Home.
- **Giữ** gateway modal trừ khi product quyết thay luồng.

---

## Phase 1: Token & Shell trang

### Goal
- Trang Chủ có **cùng “không gian màu”** với Explore (nền kem / gradient tùy chốt Phase 0).

### Tasks
1. Thêm wrapper `HomePage` cùng family class nền với `ExplorePage` (hoặc chỉ điều chỉnh nếu đã thừa hưởng từ layout — tránh double background lệch tone).
2. Liệt kê các `style={{ backgroundColor: "#FFFCF5" }}` và thay bằng utility Tailwind đồng bộ Explore (`gradient`, `border-secondary`, v.v.).

### Deliverables
- Bảng mapping: block Home → class tương đương Explore.

---

## Phase 2: Hero & Tìm kiếm

### Goal
- Khối hero / tìm kiếm **nhìn cùng họ** với `ExploreSearchHeader` (tab optional, ít nhất là ô input + viền + nút phụ).

### Tasks
1. **Variant component:** `HomeSearchHero` hoặc props `variant="home"` trên component chia sẻ — tránh copy-paste dài.  
2. Quyết định: tab keyword/semantic trên Home hay chỉ một hàng CTA + link “Khám phá đầy đủ”.  
3. Nút chính: primary đỏ vs secondary vàng — **align** với nút “Tìm” trên Explore nếu chọn đồng bộ.

### Deliverables
- Wireframe text (mobile/desktop) trong PR hoặc comment issue.

---

## Phase 3: Lưới bản thu & thẻ

### Goal
- Section “Phổ biến / Gần đây” dùng **`RecordingCardCompact`** + `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` như Explore (hoặc giữ 4 cột + card cũ nếu chọn Phase 0‑A).

### Tasks
1. Thay import và props (`to`, `linkState` nếu cần).  
2. Điều chỉnh `SectionHeader` hoặc thay heading block giống khối “Bản thu mới nhất” (icon + `Music` / `TrendingUp`).  
3. Kiểm tra chiều cao hàng và empty state (nếu có).

### Deliverables
- Screenshot so sánh Home vs Explore trước/sau.

---

## Phase 4: Khối phụ & Modal

### Goal
- Khối Điều khoản + modal gateway **không lệch tone** (cùng border/shadow họ Explore).

### Tasks
1. Đồng bộ `rounded-2xl`, `border`, shadow với các khối Explore.  
2. Kiểm tra focus trap / `aria-modal` modal (giữ chuẩn hiện có).

---

## Phase 5: QA & Regression

### Goal
- Không hỏng fetch recordings, modal, link `/explore`, `/terms`, `/login`, `/register`.

### Tasks
1. Responsive: sm/md/lg.  
2. Guest vs đã đăng nhập (nếu có nhánh UI).  
3. Performance: `memo` / list keys không đổi nếu chỉ đổi card component.

---

## Agent Assignments

| Agent | Trách nhiệm |
|-------|----------------|
| **A — Layout & tokens** | Phase 1: nền trang, mapping màu khối. |
| **B — Hero & search UX** | Phase 2: component chia sẻ / variant, copy CTA. |
| **C — Grid & cards** | Phase 3: `RecordingCardCompact`, grid, header section. |
| **D — Polish & QA** | Phase 4–5: modal, terms block, E2E smoke Home nếu có. |

---

## Verification Checklist (Phase X)

### Visual
- [ ] Nền trang Chủ cùng họ với Explore (theo quyết định Phase 0).
- [ ] Khối chính (hero hoặc section) có border/shadow/bo góc nhất quán Explore.
- [ ] Ô tìm kiếm / CTA không “lạc tone” so với Explore.

### Grid & card
- [ ] Lưới bản thu đúng số cột đã chốt; thẻ hiển thị play/stats/CTA đúng.
- [ ] Link tới `/recordings/:id` hoạt động.

### Hành vi
- [ ] Gateway modal (nếu giữ) vẫn mở/đóng đúng.
- [ ] Fetch popular/recent không lỗi sau đổi card.

### Regression
- [ ] Route `/`, `/explore`, header/footer không vỡ layout.

---

## Next Execution Entry Point

Sau khi chốt Phase 0 (A/B/C + hero/modal + nền):

1. Chạy `/create` hoặc task implement theo Phase 1 → 5.  
2. Ưu tiên tái sử dụng: `ExploreSearchHeader` (hoặc tách shared), `RecordingCardCompact`, `cn` + token từ `tailwind.config` (`primary`, `secondary`, `cream`).

---

*File tạo theo lệnh `/plan`: `docs/PLAN-homepage-explore.md` — **chỉ kế hoạch, không chứa mã nguồn triển khai.*
