# PLAN: RegisterPage Refactor — Light Cultural Theme

**Loại:** UI/UX Refactor  
**Ưu tiên:** High  
**Tác giả:** Senior Frontend Engineer + Senior UI/UX Designer  
**Ngày:** 2026-04-29  
**File đích:** `src/pages/auth/RegisterPage.tsx`

---

## 1. Senior Assessment

### Vấn đề hiện tại

`RegisterPage` đang dùng **dark theme** (`BronzeDrum` pattern trên nền nâu `#261a10`, text trắng, floating `BackButton` đỏ gradient), trong khi toàn bộ phần còn lại của app — `MainLayout`, `Header`, Dashboard, các trang nội dung — đều dùng **light cultural theme** (nền kem `#FFF2D6`, text tối, card cream, accent vàng cam).

Người dùng đi từ Landing/Dashboard vào Register bị ngắt mạch visual hoàn toàn. Đây là vấn đề về **design consistency** ảnh hưởng trực tiếp đến trust và UX.

### Nguyên nhân gốc

| Vấn đề | Nguyên nhân |
|--------|-------------|
| Dark background | `BronzeDrum` SVG render nền `#261a10` |
| Text trắng | `labelColor="light"` trên tất cả `<Input>` |
| Back nav sai style | `BackButton` dùng floating red pill — không đồng bộ với breadcrumb/header |
| Role cards dark glass | `bg-white/15`, `border-white/20` — thiết kế cho nền tối |
| Không có header | RegisterPage dùng `RootWrapper`, không qua `MainLayout` → không có `Header` |

### Gì cần giữ nguyên tuyệt đối

- Logic `react-hook-form` (`useForm<RegisterForm>`, tất cả `register()` rules)
- `onSubmit` handler và phân nhánh `selectedRole` → API call
- Payload API: `{ email, password, fullName, phoneNumber }` → `authService.register` / `registerResearcher`
- Route `/register` và `/auth/register-researcher` trong `App.tsx`
- `TermsAndConditions` modal
- `validatePassword` từ `src/utils/validation.ts`
- `sessionStorage` fromLogout logic

---

## 2. Mục tiêu Refactor

1. Chuyển RegisterPage từ **dark theme** sang **light cultural theme** đồng bộ với Dashboard
2. Thêm `AuthHeader` tối giản thay thế `BackButton` floating
3. Wrap form trong card `bg-surface-panel` theo design token chuẩn
4. Restyle role cards: selected = border vàng cam + nền kem, unselected = border nhạt
5. Cập nhật `Input` usage: `labelColor="dark"` cho nền sáng
6. Thêm trust text bảo vệ dữ liệu
7. Đảm bảo responsive desktop / tablet / mobile
8. Không thay đổi bất kỳ business logic hay API contract

---

## 3. Proposed UI Structure

```
┌─────────────────────────────────────────────────────┐
│  AUTH HEADER (simplified)                           │
│  ← Trang chủ  |  Logo VietTune  |  Đăng nhập link  │
├─────────────────────────────────────────────────────┤
│  bg-[#FFF2D6] + BronzeDrumLight (subtle cream)      │
│                                                     │
│  ┌───────────────────────────────────────┐          │
│  │  REGISTER CARD  (bg-surface-panel)    │          │
│  │  max-w-lg, rounded-2xl, shadow-lg     │          │
│  │                                       │          │
│  │  [Logo] + "Tham gia VietTune"         │          │
│  │  subtitle (text-neutral-600)          │          │
│  │                                       │          │
│  │  ── Role Selector ──────────────────  │          │
│  │  ┌──────────┐  ┌──────────┐          │          │
│  │  │🎵 Người  │  │📖 Nhà    │          │          │
│  │  │đóng góp  │  │nghiên cứu│          │          │
│  │  │(default) │  │          │          │          │
│  │  └──────────┘  └──────────┘          │          │
│  │                                       │          │
│  │  ── Form Fields ────────────────────  │          │
│  │  Họ và tên                            │          │
│  │  Số điện thoại                        │          │
│  │  Email                                │          │
│  │  Mật khẩu (+ strength indicator)     │          │
│  │  Xác nhận mật khẩu                   │          │
│  │                                       │          │
│  │  ── Trust + Terms ──────────────────  │          │
│  │  🔒 Dữ liệu được mã hóa và bảo vệ   │          │
│  │  Điều khoản & Chính sách bảo mật      │          │
│  │                                       │          │
│  │  [═══ ĐĂNG KÝ (primary CTA) ═══]     │          │
│  │                                       │          │
│  │  Đã có tài khoản? Đăng nhập          │          │
│  └───────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

### Role Cards — Design Spec

| State | Border | Background | Icon | Text |
|-------|--------|------------|------|------|
| **Selected** | `border-secondary-400` | `bg-cream-50` | `text-secondary-500` | `text-neutral-900` |
| **Unselected** | `border-neutral-200` | `bg-white` | `text-neutral-400` | `text-neutral-600` |
| **Hover (unselected)** | `border-neutral-300` | `bg-neutral-50` | — | — |

---

## 4. Component Breakdown

| Component | Action | Ghi chú |
|-----------|--------|---------|
| `RegisterPage.tsx` | **Major edit** | Toàn bộ layout + theme |
| `BackgroundPatterns.tsx` | **Add export** | Thêm `BronzeDrumLight` (cream bg, gold subtle) — không sửa `BronzeDrum` hiện có |
| **NEW: `AuthHeader.tsx`** | **Create** | `src/components/auth/AuthHeader.tsx` — header đơn giản cho auth pages |
| `Input.tsx` | **No change** | Đã hỗ trợ `labelColor="dark"` — chỉ thay đổi prop usage |
| `BackButton.tsx` | **No change** | Không dùng trong RegisterPage nữa |
| `MainLayout.tsx` | **No change** | Register vẫn outside MainLayout |
| `Header.tsx` | **No change** | Quá phức tạp cho auth page |
| `surfaceTokens.ts` | **Reuse** | `SURFACE_CARD` / `SURFACE_PANEL_GRADIENT` cho form card |
| `tailwind.config.js` | **No change** | Tất cả token đã có: primary, secondary, neutral, cream, surface |
| `App.tsx` | **No change** | Routes giữ nguyên |
| `authService.ts` | **No change** | API contract không đổi |
| `validation.ts` | **No change** | `validatePassword` tái sử dụng |

---

## 5. Files to Modify

| File | Mức độ thay đổi |
|------|----------------|
| `src/pages/auth/RegisterPage.tsx` | **Cao** — layout, theme, role cards, trust text |
| `src/components/image/pattern/BackgroundPatterns.tsx` | **Trung bình** — thêm export `BronzeDrumLight` |
| `src/components/auth/AuthHeader.tsx` | **Tạo mới** |
| `src/pages/auth/LoginPage.tsx` | **Tùy chọn** — có thể dùng `AuthHeader` sau khi hoàn thành |

---

## 6. Validation Plan

> Nguyên tắc: **giữ nguyên tất cả rules hiện tại**, chỉ thêm UX hint không phá vỡ logic.

| Field | Rule hiện tại | UX Enhancement đề xuất |
|-------|--------------|------------------------|
| **Họ và tên** | `required` | Thêm `minLength: 2`, `maxLength: 100`; trim whitespace hint |
| **Số điện thoại** | `required` + `/^[0-9]{10,11}$/` | Giữ nguyên; cải thiện placeholder `0912 345 678` |
| **Email** | `required` + email regex | Giữ nguyên; `toLowerCase()` on blur (không ảnh hưởng submit) |
| **Mật khẩu** | `required` + `validatePassword()` (6+, hoa, thường, số) | Thêm inline strength bar: Yếu / Trung bình / Mạnh |
| **Xác nhận mật khẩu** | `required` + match check | Thêm icon ✓/✗ inline khi match/không match |
| **Role** | Default `contributor`, toggle state | Không cần validate (luôn có giá trị) |

---

## 7. Responsive Plan

| Breakpoint | Layout |
|-----------|--------|
| **Mobile < 640px** | Full-width card `mx-4`, padding `p-5`, pattern ẩn hoặc rất nhẹ, AuthHeader minimal |
| **Tablet 640–1024px** | Card `max-w-md mx-auto`, padding `p-6`, pattern hiển thị nhẹ |
| **Desktop ≥ 1024px** | Card `max-w-lg mx-auto`, padding `p-8`, pattern decorative hai bên |

Specific rules:
- Form card: `w-full max-w-lg mx-auto px-4 sm:px-0`
- Role grid: `grid grid-cols-2 gap-3` — giữ 2 cột ở mọi kích thước (card nhỏ vừa đủ)
- AuthHeader: `px-4 sm:px-6 lg:px-8`
- Background decorations: `hidden sm:block` cho ornaments hai bên

---

## 8. Risk Checklist

| Risk | Mức độ | Mitigation |
|------|--------|-----------|
| Route `/register` / `/auth/register-researcher` | Thấp | Không đổi `App.tsx` |
| Form state (`useForm`, `watch`, `errors`) | Thấp | Copy nguyên hook config, chỉ thay JSX wrapper |
| Validation rules inline | Thấp | Copy verbatim từ `register()` calls |
| `selectedRole` enum → API branching | Thấp | `useState<RegisterRole>('contributor')` và `onSubmit` giữ nguyên |
| API payload `{ email, password, fullName, phoneNumber }` | **Zero risk** | Không đổi `onSubmit` |
| `labelColor` Input | Thấp | Chỉ đổi `"light"` → `"dark"` (hoặc xóa prop vì `dark` là default) |
| `BronzeDrum` reuse | Thấp | Thêm export mới `BronzeDrumLight`, không sửa cũ |
| `BackButton` removal | Thấp | Thay bằng `AuthHeader`; fromLogout ẩn back link |
| `TermsAndConditions` modal | **Zero risk** | Reuse 100% |
| Responsive layout mới | Trung bình | Test tại 320px, 375px, 768px, 1024px, 1440px |

---

## 9. Implementation Checklist

> Mỗi bước nhỏ — approve xong mới code bước tiếp.

### Phase 1 — Foundation

- [ ] **1.1** Tạo `src/components/auth/AuthHeader.tsx`
  - Gradient `from-primary-700 to-primary-800` (giống `Header.tsx`)
  - Logo link → `/`, text "VietTune"
  - Right side: link "Đăng nhập" → `/login`
  - Prop `hideBackLink?: boolean` cho fromLogout
  - Responsive: `h-14 sm:h-16`, `px-4 sm:px-6 lg:px-8`

- [ ] **1.2** Thêm `BronzeDrumLight` vào `BackgroundPatterns.tsx`
  - Nền `#FFF2D6` (cream)
  - Ornaments gold `#c9a84c` opacity thấp (~0.06–0.12)
  - Cùng cấu trúc SVG với `BronzeDrum` hiện tại

### Phase 2 — Layout Restructure

- [ ] **2.1** Refactor outer layout của `RegisterPage.tsx`
  - Thay `BronzeDrum` → `BronzeDrumLight`
  - Thay `<BackButton />` → `<AuthHeader hideBackLink={fromLogout} />`
  - Outer container: `min-h-screen bg-[#FFF2D6] flex flex-col`
  - Form wrapper card: `bg-surface-panel rounded-2xl border border-neutral-200/80 shadow-lg p-6 sm:p-8 max-w-lg w-full mx-auto mt-6 mb-12`

- [ ] **2.2** Retheme header section trong card
  - `text-2xl font-bold text-white` → `text-2xl font-bold text-neutral-900`
  - `text-neutral-300` → `text-neutral-600`

### Phase 3 — Role Cards

- [ ] **3.1** Restyle role selector cards sang light theme
  - Selected: `border-secondary-400 bg-cream-50 text-neutral-900 shadow-md scale-[1.02]`
  - Selected icon: `text-secondary-500`
  - Unselected: `border-neutral-200 bg-white text-neutral-600`
  - Hover unselected: `hover:border-neutral-300 hover:bg-neutral-50`
  - Contributor vẫn là default selected

### Phase 4 — Form Fields

- [ ] **4.1** Cập nhật tất cả `<Input>` trong RegisterPage
  - Xóa `labelColor="light"` (để dùng default `dark`)
  - Kiểm tra không còn dark-theme class nào conflict

### Phase 5 — CTA + Trust Text

- [ ] **5.1** Verify submit button style
  - `bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-full py-3.5`
  - `shadow-lg hover:shadow-xl transition-all active:scale-[0.98]`

- [ ] **5.2** Thêm trust text
  - Vị trí: trên hoặc dưới terms text
  - Nội dung: `🔒 Dữ liệu của bạn được mã hóa và bảo vệ an toàn`
  - Style: `text-xs text-neutral-500 flex items-center justify-center gap-1.5`
  - Icon: `<Lock className="h-3 w-3" />` từ lucide-react

- [ ] **5.3** Cập nhật màu terms + login link
  - Terms link: `text-primary-600 hover:underline` (giữ nguyên)
  - Login link: text neutral + highlight primary

### Phase 6 — Responsive Polish

- [ ] **6.1** Test và fine-tune tại các breakpoints
  - Mobile 320px, 375px, 390px
  - Tablet 768px, 1024px
  - Desktop 1440px, 1920px
  - Đặc biệt: role cards không overflow ở 320px

### Phase 7 — Verification

- [ ] **7.1** Smoke test functional flows
  - [ ] Đăng ký Contributor → API `/api/Auth/register-contributor` được gọi
  - [ ] Đăng ký Researcher → API `/api/Auth/register-researcher` được gọi
  - [ ] Validation errors hiển thị đúng (tất cả 5 fields)
  - [ ] Terms modal mở/đóng
  - [ ] Logo click → `/`
  - [ ] "Đăng nhập" link → `/login`
  - [ ] fromLogout: back link ẩn
  - [ ] Submit thành công → navigate `/confirm-account`
  - [ ] Submit thất bại → error toast đúng

- [ ] **7.2** Visual QA
  - [ ] Đồng bộ với `Header` (gradient đỏ)
  - [ ] Card style nhất quán với Dashboard cards
  - [ ] Role card selected state rõ ràng
  - [ ] Typography contrast đạt WCAG AA

---

## 10. Design Token Reference

```
Background:       bg-[#FFF2D6]  /  neutral-50
Card:             bg-surface-panel (#FFFCF5)  /  border-neutral-200/80
Header gradient:  from-primary-700 to-primary-800
CTA button:       bg-primary-600  hover:bg-primary-700
Role selected:    border-secondary-400  bg-cream-50
Role icon active: text-secondary-500
Text primary:     text-neutral-900
Text secondary:   text-neutral-600
Error:            text-primary-600  border-primary-400
Link accent:      text-secondary-400
```

---

## 11. Không thay đổi

- `App.tsx` — routes
- `authService.ts` — API calls, payloads, endpoints
- `types/user.ts` — `RegisterForm`, `UserRole`
- `validation.ts` — `validatePassword`
- `TermsAndConditions.tsx`
- `useForm` hook config
- `onSubmit` handler logic
- `sessionStorage` fromLogout
