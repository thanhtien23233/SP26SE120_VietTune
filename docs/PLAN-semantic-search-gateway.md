# PLAN: Semantic Search Hook + Access Gateway

## Phase -1: Context Check

### User Request
- Thiết kế Hero rộng, thoáng, căn giữa, tiêu đề lớn.
- Thêm semantic search bar kiểu “mồi câu”.
- Submit search thì fake AI processing 1.5s (không gọi API).
- Sau loading, mở modal chặn quyền truy cập với CTA login/register.

### Scope Chosen (Socratic Gate)
- Phạm vi: `home_only` (chỉ HomePage).
- Route CTA "Đăng ký cấp quyền": `/register`.

### Current State Snapshot
- HomePage đã có hero và các khối nội dung recordings/features.
- Có sẵn hệ thống route `/login`, `/register`.
- Cần đảm bảo flow mồi câu không gây side-effect backend.

### Constraints
- Planning only, không viết code trong phase này.
- Không gọi backend API cho hành vi search mồi câu.
- Giữ tone thương hiệu VietTune (đỏ/kem, học thuật, tinh tế).

---

## Phase 0: Socratic Gate (Q&A Summary)

### Quyết định đã chốt
1. Triển khai trước ở HomePage.
2. CTA Secondary của modal trỏ `/register`.
3. Flow fake AI loading 1.5s là bắt buộc.

### Assumptions
- Guest là đối tượng chính của flow chặn quyền truy cập.
- User đã đăng nhập có thể dùng đường dẫn search thật ở bước sau (ngoài scope plan này nếu cần).
- Modal cần rõ thông điệp “đã tìm thấy dữ liệu” để tăng conversion.

---

## Phase 1: Hero Layout Refactor

### Goal
- Tạo Hero ấn tượng, thoáng, tập trung vào hook search.

### Tasks
1. Cấu trúc lại Hero theo layout centered, rộng và nhiều khoảng thở.
2. Nâng cấp headline chính:
   - cỡ chữ lớn
   - phân cấp tốt với subtitle.
3. Tối ưu typography và spacing cho desktop/mobile.
4. Đảm bảo search bar là điểm nhấn visual số 1.

### Deliverables
- Hero blueprint mới (headline + subtitle + search hook).
- Responsive layout rules.

---

## Phase 2: Semantic Search Hook UI

### Goal
- Triển khai input “mồi câu” hiện đại, nổi bật.

### Tasks
1. Thêm search input lớn:
   - bo góc lớn
   - border nhẹ
   - shadow nổi bật.
2. Placeholder đúng yêu cầu:
   - `Ví dụ: Tìm các bài hát mừng lúa mới của người Tày...`
3. Thêm nút `Tìm kiếm` + icon AI lấp lánh.
4. Thiết kế trạng thái input:
   - idle / focus / disabled.

### Deliverables
- Search bar component-level spec.
- Button style spec (icon + label).

---

## Phase 3: Fake AI Processing Logic

### Goal
- Mô phỏng trải nghiệm AI mà không tốn backend/API.

### Tasks
1. Bắt submit bằng click hoặc Enter.
2. Chặn API call thực hoàn toàn cho flow này.
3. Khi submit:
   - disable input + button
   - đổi label button thành:
     - `AI đang phân tích ngữ nghĩa...`
   - hiển thị spinner xoay.
4. Giữ trạng thái loading 1.5 giây.
5. Kết thúc loading -> mở Access Modal.
6. Chống double-submit khi đang loading.

### Deliverables
- State flow: `idle -> loading(1.5s) -> modalOpen`.
- No-API interaction contract.

---

## Phase 4: Access Gateway Modal

### Goal
- Chặn quyền truy cập hợp lý và chuyển đổi sang login/register.

### Modal Content
- Nội dung:
  - `🔒 Hệ thống đã tìm thấy các bản ghi âm và sơ đồ tri thức phù hợp! Đăng nhập hoặc đăng ký ngay để xem kết quả chi tiết và truy cập toàn bộ kho lưu trữ VietTune.`
- CTA:
  1. Primary: `Đăng nhập` -> `/login`
  2. Secondary: `Đăng ký cấp quyền` -> `/register`
  3. Close: nút `X`

### UX Tasks
1. Modal nằm giữa màn hình, nền blur (`backdrop-blur`).
2. Mở/đóng mượt (fade/scale nhẹ).
3. Hỗ trợ đóng bằng:
   - nút `X`
   - `Esc`
   - click outside (nếu bật).
4. Accessibility cơ bản:
   - role dialog
   - focus management
   - keyboard navigation.

### Deliverables
- Modal behavior spec + accessibility checklist.

---

## Phase 5: Styling & Verification

### Goal
- Chốt giao diện ấn tượng, đúng brand, không phá UX cũ.

### Tasks
1. Tinh chỉnh visual theo tone đỏ/kem học thuật.
2. Kiểm thử responsive:
   - mobile/tablet/desktop.
3. Kiểm thử interaction:
   - Enter/click
   - loading 1.5s
   - modal open/close/CTA routes.
4. Kiểm tra không có API request search thật từ flow mồi câu.

### Deliverables
- UI polish checklist.
- Functional verification checklist.

---

## Agent Assignments

### Agent A - Hero & Search UI
- Refactor layout hero và search hook visual.

### Agent B - Interaction Logic
- Implement fake processing, spinner, disable-state, anti double-submit.

### Agent C - Modal & Accessibility
- Build gateway modal, blur backdrop, CTA routing, keyboard support.

---

## Verification Checklist (Phase X)

### Functional
- [ ] Hero centered, thoáng, headline nổi bật.
- [ ] Search bar đúng placeholder yêu cầu.
- [ ] Submit không gọi API backend thật.
- [ ] Loading hiển thị đúng 1.5 giây.
- [ ] Label loading + spinner hiển thị đúng.
- [ ] Modal xuất hiện sau loading.
- [ ] CTA routes đúng:
  - [ ] `Đăng nhập` -> `/login`
  - [ ] `Đăng ký cấp quyền` -> `/register`
- [ ] Nút `X` đóng modal hoạt động.

### UX & Accessibility
- [ ] Backdrop blur hoạt động đúng.
- [ ] Focus/keyboard/Esc handling ổn định.
- [ ] Không giật lag ở mobile.

### Regression
- [ ] Không ảnh hưởng routing hiện có của HomePage.
- [ ] Không phát sinh API call ngoài ý muốn.

---

## Next Execution Entry Point
- Sau khi review plan:
  - Run `/create Phase 1` để bắt đầu layout Hero.
  - Sau đó `/create Phase 2` -> `/create Phase 3` -> `/create Phase 4`.

---

## Phase 1 Execution Output (Completed)

### Changes da thuc hien
1. Refactor Hero theo huong rong, thoang, can giua:
   - tang padding va bo goc block hero.
   - tao khoang tho theo chieu doc ro hon.
2. Nang cap visual hierarchy:
   - them eyebrow text ("Kho tri thuc am nhac dan toc").
   - title lon hon, subtitle dam hon.
   - description mo rong max-width de doc de hon.
3. Polish hero identity:
   - logo lon hon + shadow nhe.
   - canh chinh typography theo tone premium-academic.
4. Features grid:
   - tang gap cho desktop lon de thoang mat hon.

### Validation nhanh
- Lint pass tren `HomePage`.
- Khong thay doi logic route/auth/API hien tai.

### Gate de vao Phase 2
- [x] Hero centered, thoang, headline noi bat.
- [x] Visual hierarchy duoc nang cap.
- [ ] Them semantic search hook UI (input/button/icon) theo yeu cau (Phase 2).

---

## Phase 2 Execution Output (Completed)

### Changes da thuc hien
1. Them Semantic Search Hook UI vao Hero:
   - input lon, bo goc, border mem, shadow noi.
   - icon search trong input.
2. Placeholder da cap nhat dung yeu cau:
   - `Vi du: Tim cac bai hat mung lua moi cua nguoi Tay...`
3. Them nut `Tim kiem` voi icon AI sparkle ben canh.
4. Responsive:
   - desktop: input + button cung hang.
   - mobile: stack input tren, button duoi.

### Scope confirmation (phase nay)
- Chi thay doi UI thanh search hook.
- Chua implement fake loading 1.5s.
- Chua mo modal chong truy cap.
- Chua can thiep API flow.

### Gate de vao Phase 3
- [x] Search bar hook da xuat hien va dung placeholder.
- [x] CTA button + sparkle icon da co.
- [ ] Implement fake AI processing no-API + disabled/loading state (Phase 3).

---

## Phase 3 Execution Output (Completed)

### Changes da thuc hien
1. Fake AI processing da duoc them:
   - submit qua Enter/click.
   - khong goi backend API.
   - loading state 1.5s.
2. UI state trong loading:
   - disable input + button.
   - button label doi thanh `AI dang phan tich ngu nghia...`.
   - spinner xoay (`Loader2`) hien thi trong button.
3. Anti double-submit:
   - bo qua submit khi dang loading.
   - clear timeout khi unmount.
4. Sau loading:
   - mo gateway modal state (`modalOpen`).
   - hien modal co ban de xac nhan trigger flow.

### Scope confirmation
- Phase nay tap trung interaction logic va loading UX.
- Modal hien co ban de kiem tra flow; se polish theo full spec o Phase 4.

### Gate de vao Phase 4
- [x] No-API fake processing 1.5s hoat dong.
- [x] Disable + spinner + loading label da dung.
- [x] Sau loading da trigger modal.
- [ ] Hoan thien modal theo full content/CTA/backdrop spec (Phase 4).

---

## Phase 4 Execution Output (Completed)

### Changes da thuc hien
1. Modal da duoc hoan thien theo full spec:
   - backdrop blur manh (`backdrop-blur-md`) + dim background.
   - modal center, card style premium (red/cream, rounded, shadow).
2. Modal content da cap nhat dung thong diep:
   - `🔒 Hệ thống đã tìm thấy các bản ghi âm và sơ đồ tri thức phù hợp!...`
3. CTA actions day du:
   - Primary `Dang nhap` -> `/login`
   - Secondary `Dang ky cap quyen` -> `/register`
   - Close button `X` de dong modal.
4. Accessibility + interaction:
   - `role="dialog"`, `aria-modal`, `aria-labelledby`
   - close bang `Esc`
   - close bang click outside
   - body scroll lock khi modal open
   - focus vao CTA chinh khi mo modal.

### Validation nhanh
- Lint pass tren `HomePage`.
- Flow hoan chinh: submit -> loading 1.5s -> modal open -> CTA/close hoat dong.

### Phase 4 Gate
- [x] Modal full content dung yeu cau.
- [x] CTA routes dung.
- [x] X close + Esc + click outside hoat dong.
- [x] Backdrop blur + UI polish dat muc tieu.
