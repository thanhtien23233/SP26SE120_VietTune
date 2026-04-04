# PLAN: Kiểm tra toast (`uiToast`) hoạt động toàn bộ

**Mục tiêu:** Xác minh mọi luồng người dùng có gọi `uiToast` đều hiển thị đúng (văn bản, loại success/error/info/warning, không bị modal che, thời lượng hợp lý).

**Phạm vi:** `src/uiToast/*`, `<Toaster />` trong `App.tsx`, các feature đã migrate (auth, profile, upload, contributions, moderation, admin, footer…).

**Ràng buộc:** Kế hoạch chỉ dùng để thực hiện sau; không thay thế cho chạy test thực tế.

---

## Quyết định dự án (đã khóa)

Các lựa chọn sau **áp dụng cho toàn bộ plan**; không mở lại Phase “Socratic gate” trừ khi product thay đổi chiến lược.

### 1. Ưu tiên: smoke test thủ công trên Dev

- **Trong phase này:** chỉ ưu tiên **smoke thủ công** trên môi trường Dev (và Staging khi cần đối chiếu backend).
- **Không** triển khai test tự động (Playwright / Vitest) cho **toàn bộ** toast ở thời điểm hiện tại — tốn nguồn lực, ROI thấp khi UI còn thay đổi nhanh.
- **Lý do:** Mục tiêu là xác nhận wrapper `uiToast` ổn định và thay thế hoàn toàn các hàm cũ. E2E toast dễ **flaky** (timing hiển thị/biến mất). **Playwright cho luồng lõi** chỉ đưa vào khi hệ thống đã ổn định hơn (ngoài phạm vi phase verify toast hiện tại).

### 2. Backend: API thật (Spring Boot trên Dev / Staging)

- Test **trực tiếp** với backend thật trên Dev/Staging — **không** dựa vào mock để kết luận `fromApiError` / interceptor đúng.
- **Lý do:** `fromApiError` và `attachNormalizedApiError` phải bóc tách **đúng payload lỗi thực** (400, 401, 403, 500…). Mock dễ tạo cảm giác “đúng” trong khi prod không khớp.
- **Lỗi khó tái hiện:** dùng **Offline** (tab Network trình duyệt) hoặc tương đương để ép lỗi mạng khi cần.

### 3. Tài khoản: đủ bộ role VietTune Archive

- Chuẩn bị tài khoản đủ role: **Guest**, **Contributor**, **Expert**, **Admin** (và **Researcher** nếu luồng toast gắn role này trong codebase).
- **Lý do:** Toast gắn phân quyền và nghiệp vụ (ví dụ Claim/Approve/Reject moderation; truy cập trái phép → 403). Một role duy nhất sẽ **bỏ sót** luồng đã có trong code / catalog.

### 4. Định nghĩa “All toast”: theo **flow** (call site `uiToast.*`), không vét cạn catalog

- Matrix kiểm tra bám **`rg "uiToast\."`** → map sang **hành động UI thực tế**; **không** bắt buộc ép hệ thống render từng key trong `MESSAGE_CATALOG`.
- **Lý do:** Catalog là từ điển; nếu `resolveCatalogMessage` / map key đúng trên **vài key đại diện**, phần còn lại cùng cơ chế. Trọng tâm QA/Dev: đi các **luồng chính** (đăng nhập, upload, xóa, duyệt, lỗi mạng, 403…) và đảm bảo **không còn `alert()`**, **không import trực tiếp `react-hot-toast`** ngoài chỗ cho phép, **`notify` cũ** không còn trên luồng đã migrate (eslint + grep).

---

## Phase −1: Context check (đã rà trong repo)

| Hạng mục | Ghi chú |
|----------|---------|
| Chuẩn toast | `uiToast` bọc `react-hot-toast`; cấu hình tại `src/uiToast/uiToast.ts`, `App.tsx` (`<Toaster position="top-center" />`). |
| Catalog | `MESSAGE_CATALOG` trong `src/uiToast/messageCatalog.ts` — mọi chuỗi cố định nên qua key. |
| ESLint | Hạn chế import `react-hot-toast` ngoài `App.tsx` và `src/uiToast/**` (xem `.eslintrc.cjs`). |
| Call site | Inventory **Phase 1 hoàn tất** — danh sách file + matrix: [`TOAST-SMOKE-matrix.md`](./TOAST-SMOKE-matrix.md) (chạy lại grep khi merge feature mới). |
| API errors | Interceptor **không** tự toast; UI gọi `uiToast.fromApiError` hoặc message catalog khi cần. |

---

## Phase 1: Inventory & matrix (theo flow, không vét catalog)

| Bước | Việc | Output |
|------|------|--------|
| 1.1 | `rg "uiToast\." src --glob "*.{ts,tsx}"` — liệt kê file + loại (`success` / `error` / `info` / `warning` / `fromApiError` / `promise`). | Bảng: **Luồng UI** (trang + role) → Hành động → Loại toast → Key hoặc chuỗi tự do. |
| 1.2 | **Tùy chọn (không bắt buộc):** spot-check vài key catalog đại diện có biến (vd. `{{step}}`) + vài key lỗi chung — chứng minh cơ chế map ổn; **không** yêu cầu mọi `MessageKey` phải có bước UI riêng. | Ghi chú ngắn trong matrix hoặc ticket. |
| 1.3 | Ghi nhận luồng có **modal** (`z-[100]+`): moderation wizard, approve/reject — toast phải **đọc được** (không bị che). | Hạng mục trong checklist Phase 3. |
| 1.4 | `rg "\balert\("` và `rg "from ['\"]react-hot-toast['\"]" src` (ngoài `App.tsx` + `src/uiToast/**`) + kiểm tra `notify` trên luồng đã migrate. | Danh sách chỗ cần xử lý nếu còn sót (hoặc xác nhận sạch). |

**Gán:** Dev / QA; agent explore chỉ đọc repo khi cần.

**Matrix đã generate (cập nhật khi đổi code):** [`docs/TOAST-SMOKE-matrix.md`](./TOAST-SMOKE-matrix.md)

### Phase 1 — Đã làm trong repo (inventory, không phải smoke trên trình duyệt)

| Bước | Trạng thái | Ghi chú |
|------|------------|---------|
| 1.1 | **Xong** | 12 file feature có `uiToast.success|error|info|warning|…` — chi tiết trong matrix. |
| 1.2 | Tùy QA | Spot-check catalog khi chạy Phase 2 (vd. `{{step}}`). |
| 1.3 | **Ghi nhận** | Moderation wizard / approve-reject: kiểm tra khi smoke Phase 3. |
| 1.4 | **Sạch** | Không `alert(` trong `src`. Import `react-hot-toast` chỉ `App.tsx`, `uiToast.ts`. Không `notify.*` từ feature tới `notificationStore` (chỉ `NotificationProvider` dùng store cho inbox). |

*Cập nhật inventory lần cuối theo grep: 2026-04-01.*

---

## Phase 2: Chiến lược kiểm tra — **chỉ smoke thủ công** (phase hiện tại)

- Thực hiện từng hàng trong matrix Phase 1 trên **Dev** (và **Staging** nếu cần so sánh backend): quan sát toast (nội dung, loại, thời lượng ~5s mặc định). **Thứ tự gợi ý:** xem mục “Phase 2 — Thứ tự smoke” trong [`TOAST-SMOKE-matrix.md`](./TOAST-SMOKE-matrix.md).
- **Lỗi API:** tái hiện bằng **API thật** — account/endpoint không đủ quyền (403), token hết hạn (401), payload sai (422/400), lỗi server (500) **theo tình huống an toàn** trên Dev; mạng: **Offline** tab Network.
- **Automation (Playwright / Vitest):** **không** nằm trong scope phase verify toast lúc này; có thể lên lịch lại khi UI/nghiệp vụ ổn định và product yêu cầu CI cho luồng lõi (ghi chép tách plan khác).

**Gán:** QA chủ đạo + Dev hỗ trợ tái hiện lỗi / sửa stacking.

---

## Phase 3: Checklist xác minh (Verification)

**Bản làm việc QA (điền P/F/N/A):** [`docs/TOAST-SMOKE-Phase3-checklist.md`](./TOAST-SMOKE-Phase3-checklist.md)

Tóm tắt mục tiêu — chi tiết và bảng ghi kết quả nằm trong file trên. Khi có nhiều role, lặp lại mục cần thiết theo **Guest / Contributor / Expert / Admin** (và Researcher nếu áp dụng).

- [ ] `<Toaster />` mount trong `RootWrapper` / không lỗi console khi load app.
- [ ] `uiToast.success` trên luồng đại diện (vd. upload save, moderation approve).
- [ ] `uiToast.error` + catalog (vd. moderation `server_failed` / `local_failed`) khi tái hiện được.
- [ ] `uiToast.warning` (vd. wizard step incomplete).
- [ ] `uiToast.info` (vd. wizard ready for approve).
- [ ] `uiToast.fromApiError` / thông báo lỗi API **trên backend thật**: đã thử **ít nhất vài** mã trong nhóm 400, 401, 403, 500 (tùy tình huống an toàn trên Dev) + **Offline** cho lỗi mạng nếu cần.
- [ ] Toast **không bị che** bởi modal moderation / dialog (stacking).
- [ ] `resolveCatalogMessage` / biến `{{step}}` hiển thị đúng trên ít nhất một luồng.
- [ ] **Sạch legacy:** không `alert()` trên luồng chính; không `react-hot-toast` trực tiếp ngoại lệ ESLint; `notify` không còn trên luồng đã migrate.

---

## Phase 4: Báo cáo & theo dõi

- Ghi **Fail** kèm: URL, role, bước tái hiện, screenshot, console/network.
- Nếu Fail do stacking: ticket riêng — điều chỉnh `Toaster` `containerStyle` / `toastOptions` (implementation ngoài phạm vi plan này).
- Cập nhật `docs/uiToast.md` hoặc `docs/PLAN-toast-message.md` **chỉ khi** team thống nhất quy trình kiểm tra định kỳ (optional).

---

## Agent assignments (tham chiếu)

| Vai trò | Nhiệm vụ |
|---------|----------|
| Planner | Duy trì matrix theo **flow** (`uiToast.*`), phạm vi đã khóa ở trên. |
| Dev | Inventory grep (1.1, 1.4), hỗ trợ tái hiện lỗi API; sửa z-index / wiring nếu checklist Fail. |
| QA | Smoke Phase 2–3 trên **Dev** (+ Staging nếu cần), **đủ role**, API thật; báo cáo Pass/Fail. |
| Automation | **Ngoài scope** phase này; xem lại khi hệ thống ổn định. |

---

## Tài liệu liên quan

- `docs/uiToast.md`
- `docs/PLAN-toast-message.md` (lộ trình migrate; có thể thêm mục “verification định kỳ” sau).

---

## Tự động hóa (bổ sung — CI / local)

| Lệnh | Mục đích |
|------|----------|
| `npm run check:toast` | Cấm `alert()`, cấm import `react-hot-toast` ngoài `App.tsx` và `uiToast/uiToast.ts`. |
| `npm run test:unit` | Vitest: `interpolate`, `resolveCatalogMessage` / catalog không rỗng. |
| `npm run test:e2e:toast` | Playwright project `toast-smoke`: có `[data-rht-toaster]` trên `/`, đăng nhập sai → toast “Lỗi đăng nhập” (cần dev server + API). |

E2E toast vẫn phụ thuộc timing và backend; **Phase 3 checklist thủ công** vẫn là nguồn sự thật cho đủ role và modal.

---

*Được tạo bởi `/plan`: kiểm tra toast hoạt động — **slug:** `toast-verify`.*
