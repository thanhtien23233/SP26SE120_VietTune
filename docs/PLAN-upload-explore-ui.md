# PLAN: Upload UI/UX theo phong cách Explore



**Slug:** `upload-explore-ui`  

**Yêu cầu gốc:** Dựa vào UI/UX của `src/pages/ExplorePage.tsx`, làm lại UI/UX trang / luồng upload.  

**Phạm vi:** Chỉ kế hoạch — không bao gồm triển khai code trong tài liệu này.



---



## Phase -1 — Context check



| Mục | Trạng thái |

|-----|------------|

| **Nguồn tham chiếu UI** | `ExplorePage.tsx`: nền `bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35`, layout `max-w-7xl`, tiêu đề trang + `BackButton`, lưới desktop `lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]`, sidebar sticky, thẻ nội dung với `rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] … shadow-lg hover:shadow-xl`, icon trong ô `rounded-lg bg-gradient-to-br from-primary-100 … ring-1 ring-secondary-200`. |

| **ExploreSearchHeader** | Chỉ tham chiếu **token màu / gradient / ring** — **không** dùng pattern pill-tab cho stepper upload (xem Phase 0 đã chốt). |

| **Upload hiện tại** | `UploadPage.tsx`: `max-w-7xl`, tiêu đề + nút hướng dẫn + `BackButton`, khối contributor notice, vùng chính bọc `UploadMusic`. |

| **Form / wizard** | `UploadMusic.tsx` (~4600+ dòng): wizard **3 bước cố định** (Tải lên → Metadata & AI → Xem lại & Gửi); logic submit, API, validation gắn chặt trong file. |

| **Ràng buộc triển khai** | **Skin:** chỉ thay **class Tailwind** (màu, border, shadow, gradient cream/secondary). **Không** đổi điều kiện render logic, không xé/gộp bước, không đổi luồng A→B→C. **Ngoại lệ hẹp:** trong khối stepper, cho phép thêm markup tối thiểu phục vụ **connector line** (ví dụ đoạn line giữa các nút bước) miễn là không đổi `showWizard`, `uploadWizardStep`, `canNavigateToStep`, hay map bước 1–3. |

| **project-planner.md** | Không có trong repo; kế hoạch tuân theo quy ước lệnh `/plan` (Phase -1, Phase 0, breakdown, checklist). |



---



## Phase 0 — Quyết định đã chốt (stakeholder)



### 1. Bố cục: lưới + sidebar sticky (giống Explore)



- **Có** — giữ **cấu trúc lưới có sidebar** (sticky) như Explore trên desktop (`lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]` hoặc tương đương).

- **Nội dung cột trái** (chưa siết trong quyết định): gợi ý lúc implement — ô “bối cảnh” (tiến độ tóm tắt, mẹo ngắn, hoặc lặp trạng thái bước để dễ nhìn khi form dài). Tránh chiếm quá nhiều chiều ngang so với Explore.



### 2. Wizard: 3 bước + thanh tiến độ có connector line



- **Giữ nguyên 3 bước**; **tuyệt đối không** tách/gộp bước (ví dụ tách AI) trong phase này.

- **UI:** luồng là **tuyến tính bắt buộc** A→B→C → dùng **thanh tiến độ có connector line** nối các bước (đúng semantics hơn pill tab song song như `ExploreSearchHeader`).

- Style các “nút”/điểm trên thanh: lấy **gradient / ring / màu họ** của Explore (primary/secondary/cream).



### 3. Chỉnh sửa & form: skin Explore toàn diện



- Áp dụng **toàn bộ** skin Explore cho **form** (kể cả `?edit=true`), **không** làm nửa vời (chỉ nền + header).

- Giảm rủi ro: **chỉ** đổi class tokens; **không** thay cấu trúc cây DOM tổng thể hay điều kiện render (ngoại lệ stepper xem cột “Ràng buộc” ở Phase -1).



### 4. Mobile: stack đơn giản



- **Không** drawer “tóm tắt / checklist” (tránh over-engineering, giới hạn không gian).

- **Stack dọc:** stepper (có thể **thu gọn** — text ngắn hoặc chấm / trạng thái compact) → vùng form chính; dễ scroll, không che input.



### 5. Popup hướng dẫn



- **Giữ overlay (modal)** như hiện tại (tránh layout shift của panel in-page).

- **Restyle:** thẻ cream như Explore — `from-[#FFFCF5]`, `border-secondary-200/50`, `rounded-2xl`, shadow/hover cùng họ.



---



## Mục tiêu thiết kế (align với Explore)



- **Nền trang:** Cùng gradient cream/secondary như Explore.

- **Lưới desktop:** Sidebar sticky + cột chính chứa `UploadMusic` (và phần header trang có thể full-width phía trên lưới — bám sát cách Explore đặt title + Back rồi tới grid).

- **Khối nội dung / card:** `border-secondary-200/50`, gradient `#FFFCF5` / cream, shadow `hover:shadow-xl`; tiêu đề section với icon trong ô gradient + `ring-secondary`.

- **Stepper:** Sequential — **connector line**, không dùng pill-tab kiểu tìm kiếm song song.

- **UploadPage:** Header rhythm giống Explore; notice Contributor + modal hướng dẫn đều trong họ visual mới.

- **Không đổi:** Luồng dữ liệu, API, validation, điều kiện Contributor, thứ tự bước nghiệp vụ.



## Ngoài phạm vi (giai đoạn này)



- Refactor tách toàn bộ `UploadMusic.tsx` thành nhiều file (có thể follow-up).

- Thay đổi copy tiếng Việt trừ khi bắt buộc cho nhãn UI mới.

- Drawer mobile, tính năng mới (lưu nháp cloud, upload đa file, v.v.).



---



## Phân rã công việc



### Phase 1 — Shell trang + lưới + sidebar + modal



| # | Task | File / vùng | Ghi chú |

|---|------|-------------|---------|

| 1.1 | Bọc trang bằng gradient Explore + `max-w-7xl` + `py-8` | `UploadPage.tsx` | Đồng bộ `ExplorePage` |

| 1.2 | Header (title + hướng dẫn + Back) theo spacing Explore | `UploadPage.tsx` | |

| 1.3 | **Thêm lưới desktop:** `aside` sticky + `main` cho form; mobile: **stack** (sidebar content trên hoặc dưới title tùy UX, không fixed drawer) | `UploadPage.tsx` | Di chuyển *khối* hiện có vào cột đúng **mà không đổi** logic con bên trong `UploadMusic` |

| 1.4 | Nội dung sidebar: card cùng token Explore; placeholder nội dung (tiến độ / mẹo) — implement chi tiết khi `/create` | `UploadPage.tsx` hoặc component nhỏ inline | Không bắt buộc trùng FilterSidebar logic |

| 1.5 | Restyle khối notice Contributor + wrapper form | `UploadPage.tsx` | Cream/secondary |

| 1.6 | Restyle modal hướng dẫn: overlay giữ nguyên hành vi; panel = thẻ cream Explore | `UploadPage.tsx` | `role="dialog"`, đóng overlay |



### Phase 2 — Stepper connector + skin toàn `UploadMusic`



| # | Task | File / vùng | Ghi chú |

|---|------|-------------|---------|

| 2.1 | Thay UI stepper thành **dòng bước + connector line** giữa các node; node active/completed/disabled dùng token Explore | `UploadMusic.tsx` (khối “Luồng đóng góp”) | Giữ `onClick` / `disabled` / `canNavigateToStep`; cho phép markup line **chỉ** trong vùng này |

| 2.2 | Mobile: biến thể **compact** (text/chấm) của cùng thanh — không che form | Cùng file | |

| 2.3 | Rà toàn bộ card/section trong form: đổi `border-primary-*`, `bg-white` lẻ tẻ → **họ secondary/cream** nhất quán | `UploadMusic.tsx` | Chỉ class; bước 1–3 + edit mode |

| 2.4 | `SectionHeader`, drop zone, toggle audio/video, metadata, review: cùng ngôn ngữ thẻ Explore | Rải rác trong file | |

| 2.5 | Footer Quay lại / Tiếp theo / submit: CTA gradient primary + `focus-visible:ring` như Explore | Cuối form / wizard | |



### Phase 3 — Responsive, a11y, contrast



| # | Task | Ghi chú |

|---|------|---------|

| 3.1 | Mobile: scroll mượt, stepper compact, vùng chạm tối thiểu | |

| 3.2 | **Không** ép `role="tablist"` cho step sequential trừ khi mapping đúng semantics; ưu tiên `aria-current` / nhãn bước rõ | |

| 3.3 | Kiểm tra contrast trên gradient | |

| 3.4 | Sticky sidebar: không che CTA/màn hình nhỏ; `top-*` tương thích header app | |



### Phase 4 — Kiểm thử thủ công & hồi quy



| # | Task |

|---|------|

| 4.1 | Contributor: full flow 3 bước, audio + video |

| 4.2 | Non-contributor: notice + form dimmed |

| 4.3 | `?edit=true`: toàn form skin mới, không vỡ layout |

| 4.4 | Modal hướng dẫn: mở/đóng, overlay, nền thẻ cream |

| 4.5 | Desktop: sidebar sticky hợp lý khi scroll dài |



---



## Gán agent / vai trò (gợi ý)



| Vai trò | Trách nhiệm |

|---------|-------------|

| **FE implementer** | `UploadPage.tsx`: gradient, grid, sidebar, modal restyle; `UploadMusic.tsx`: connector stepper + quét class cream/secondary. |

| **Reviewer** | Đối chiếu `ExplorePage`; xác nhận không đổi điều kiện render / map bước; sidebar không phá mobile. |

| **QA** | Chấp nhận tại mobile + desktop; sequential flow A→B→C. |



---



## Verification checklist (Phase X — trước khi merge)

**Trạng thái:** đã đóng theo triển khai Phase 1–4 + E2E `tests/e2e/07-upload-explore-ui.spec.ts`. Lệnh: `npm run test:e2e:upload`.

- [x] Nền + lưới + sidebar sticky (desktop) đúng tinh thần Explore; mobile chỉ stack, không drawer.

- [x] Stepper 3 bước có **connector line**, semantics tuyến tính; **không** pill-tab kiểu tìm kiếm song song.

- [x] Toàn form (gồm edit mode) dùng họ cream/secondary; không “patch” chỉ header.

- [x] Modal hướng dẫn: overlay + panel `from-[#FFFCF5]`, `border-secondary-200/50`, `rounded-2xl`.

- [x] Wizard 3 bước và điều kiện next/back không đổi; không tách/gộp bước.

- [x] Thay đổi chủ yếu là Tailwind classes; không refactor cây DOM ngoài phép cục bộ stepper (line).

- [x] Contributor gate hoạt động; không lỗi console cơ bản (DEV) — kiểm tra tay khi merge nhánh.

- [x] E2E upload UI: `07-upload-explore-ui.spec.ts` + project `upload-ui` trong `playwright.config.ts` (đăng nhập contributor qua UI vì auth IndexedDB).



---



## Rủi ro & giảm thiểu



| Rủi ro | Giảm thiểu |

|--------|-------------|

| `UploadMusic.tsx` rất lớn | PR theo lớp: (A) `UploadPage` grid + modal; (B) stepper; (C) quét class toàn form. |

| Sidebar trống hoặc trùng stepper | Sidebar: tiến độ ngắn / mẹo — tránh lặp word-for-word toàn bộ stepper nếu gây noise. |

| Connector làm hỏng layout mobile | Prototype compact riêng (`max-lg:`) với cùng state bước. |

| Lệch “chỉ class, không DOM” | Ghi rõ trong PR description phần markup stepper được phép. |



---



## Tài liệu tham chiếu nhanh (đường dẫn)



- `src/pages/ExplorePage.tsx` — gradient page, grid, sticky aside, thẻ kết quả.

- `src/components/features/ExploreSearchHeader.tsx` — **tokens** màu/ring (không copy pattern tab cho stepper).

- `src/pages/UploadPage.tsx` — shell upload, modal.

- `src/components/features/UploadMusic.tsx` — wizard, form.



---



*Cập nhật: Phase 0 đã được stakeholder chốt (sidebar + connector stepper + skin full + mobile stack + modal restyle).*

