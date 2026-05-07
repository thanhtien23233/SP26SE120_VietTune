# PLAN: ConfirmAccountPage Refactor — Đồng bộ Visual với RegisterPage

**Loại:** UI/UX Refactor  
**Ưu tiên:** High  
**Tác giả:** Senior Frontend Engineer + Senior UI/UX Designer  
**Ngày:** 2026-04-29  
**File đích:** `src/pages/auth/ConfirmAccountPage.tsx`
**Trạng thái:** Implemented + Verified (Phase 1 -> Phase 10)

---

## 1. Senior Assessment — Hiện trạng

### Gap so với RegisterPage

| Thuộc tính | RegisterPage (đã refactor) | ConfirmAccountPage (hiện tại) |
|-----------|---------------------------|-------------------------------|
| Nền trang | `bg-[#FFF2D6]` + `background.png` fixed | `bg-transparent` — **không có nền** |
| Cultural pattern | ✅ background.png | ❌ không có |
| Header nav | ✅ `<AuthHeader />` | ❌ `<BackButton />` floating dark red pill |
| Card container | ✅ `bg-surface-panel rounded-2xl border shadow-lg` | ❌ không có card, layout thô |
| Logo | ✅ trong card, click về `/` | ✅ có, nhưng không trong card |
| Title style | `text-2xl font-bold text-neutral-900` | ✅ đúng nhưng không được wrap |
| Subtitle | rõ ràng | ngắn, chưa đủ context cho user |
| OTP input | n/a | single `<Input>` đơn giản |
| CTA button | `bg-primary-600 shadow-lg hover:shadow-xl` | `shadow-md` — chưa đồng bộ |
| Resend OTP | n/a | ❌ không có |
| iOS background | ✅ `backgroundAttachment` fallback | ❌ không có |
| Error state | n/a | chỉ có toast, không có inline |
| Trust/context info | ✅ Lock + trust text | ❌ không có |

### Nguyên nhân gốc

`ConfirmAccountPage` là page cũ được viết trước refactor RegisterPage. Nó chưa áp dụng:
- `AuthHeader`
- `backgroundImage` + `useMemo` attachment
- Card container pattern
- Design token thống nhất (shadow, border, radius)
- Resend OTP UX

### API Constraint quan trọng

**Không có resend API** trong `authService.ts`. `authService.confirmEmail(token)` gọi `GET /api/Auth/confirm-email?token=xxx`. Resend OTP countdown sẽ là UI-only state, **không** gọi thêm endpoint mới trừ khi backend thêm.

Tuy nhiên, countdown UX vẫn có thể triển khai hợp lý: sau 300s cho phép user quay về `/register` để đăng ký lại (thay vì gọi resend vì không có API). Đây là cách an toàn nhất không phá vỡ API contract.

---

## 2. Mục tiêu Refactor

1. Đồng bộ hoàn toàn visual language với `RegisterPage` (nền, card, header, CTA)
2. Thay `BackButton` floating bằng `AuthHeader` giống RegisterPage
3. Nâng cấp OTP input UX: 6 ô riêng biệt (hoặc single large input dạng OTP)
4. Thêm resend UX (countdown 300s -> link "Không nhận được mã? Đăng ký lại")
5. Hiển thị email đích nếu available trong navigate state
6. Rõ hơn subtitle, error state, loading state
7. Giữ nguyên 100% logic/API: `authService.confirmEmail`, `navigate('/login')` after success

---

## 3. Proposed UI Structure

```
┌──────────────────────────────────────────────────────┐
│  AUTH HEADER (AuthHeader component — giống Register) │
├──────────────────────────────────────────────────────┤
│  bg-[#FFF2D6] + background.png (cultural)            │
│                                                      │
│  ┌──────────────────────────────────────┐            │
│  │  CONFIRM CARD  (bg-surface-panel)    │            │
│  │  max-w-lg, rounded-2xl, shadow-lg    │            │
│  │                                      │            │
│  │  [Logo VietTune]                     │            │
│  │  "Xác thực tài khoản"                │            │
│  │  subtitle dài hơn + email hint       │            │
│  │                                      │            │
│  │  ── Email hint ────────────────────  │            │
│  │  📧 Mã OTP đã gửi tới:              │            │
│  │     user@email.com  (nếu có)        │            │
│  │                                      │            │
│  │  ── OTP Input ─────────────────────  │            │
│  │  [_] [_] [_] [_] [_] [_]           │            │
│  │  (6 ô single-char, auto-focus)      │            │
│  │  hoặc: 1 input lớn text-center,     │            │
│  │         tracking-widest (fallback)  │            │
│  │                                      │            │
│  │  ── Error state ───────────────────  │            │
│  │  ⚠ Mã OTP không đúng hoặc hết hạn  │            │
│  │                                      │            │
│  │  [═══ KÍCH HOẠT TÀI KHOẢN ═══]     │            │
│  │                                      │            │
│  │  Gửi lại mã sau 00:45               │            │
│  │  (sau 0s: "Quay lại đăng ký →")    │            │
│  │                                      │            │
│  │  Trở về trang chủ                   │            │
│  └──────────────────────────────────────┘            │
└──────────────────────────────────────────────────────┘
```

---

## 4. Component Reuse Plan

| Component | Tái sử dụng | Ghi chú |
|-----------|------------|---------|
| `AuthHeader` | ✅ Reuse trực tiếp | `hideHomeLink` không cần thiết ở đây |
| `background.png` | ✅ Reuse import | Giống hệt RegisterPage |
| `backgroundAttachment useMemo` | ✅ Copy pattern | iOS fallback `scroll` |
| Card container classes | ✅ Reuse token | `rounded-2xl border border-neutral-200/80 bg-surface-panel shadow-lg` |
| Logo markup | ✅ Copy từ Register | click → `/` |
| `Input` component | ✅ Reuse | dùng cho OTP input gom lại |
| `BackButton` | ❌ Loại bỏ | Thay bằng AuthHeader |
| **NEW: OTP 6-box** | ⚠️ Xem xét | Xem mục 6 bên dưới |
| CTA button | ✅ Copy class từ Register | `rounded-full bg-primary-600 shadow-lg hover:shadow-xl` |
| Navigate state email hint | ✅ Reuse `navigate(..., { state })` + `useLocation()` | Không cần sessionStorage |

---

## 5. Files to Modify

| File | Mức độ thay đổi | Ghi chú |
|------|----------------|---------|
| `src/pages/auth/ConfirmAccountPage.tsx` | **Cao** | Toàn bộ layout, OTP UX, resend state |
| `src/pages/auth/RegisterPage.tsx` | **Minimal** | Truyền email qua `navigate('/confirm-account', { state: { email } })` |
| `src/components/auth/AuthHeader.tsx` | **Không đổi** | Dùng as-is |

---

## 6. OTP UX Plan

### Phương án A — 6-ô input riêng biệt (recommended)
- 6 `<input maxLength={1}>` tự động focus sang ô tiếp theo khi nhập
- Tự động paste 6 chữ số một lúc
- Dùng `useRef` array để quản lý focus chain
- Mỗi ô: `w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border rounded-xl`
- Trạng thái: neutral → focused (primary border) → error (red border)
- **Cần tạo inline logic** trong ConfirmAccountPage (không cần component riêng nếu simple)

### Phương án B — Single large input (simpler)
- Giữ `<Input>` hiện tại nhưng style: `text-center text-2xl tracking-[0.45em] font-semibold`
- `inputMode="numeric"`, `maxLength={6}`, `autoComplete="one-time-code"`
- Ưu điểm: patch nhỏ hơn, ít rủi ro
- Nhược điểm: kém UX hơn 6-ô

**Recommendation:** Phương án B trước (patch nhỏ, an toàn), sau demo nếu cần nâng cấp lên A.

---

## 7. Resend OTP Plan

**Constraint:** Không có `resend` API trong `authService`. Không tự ý thêm API call.

**Giải pháp UI-only (đã triển khai):**
```
- countdown bắt đầu từ 300s khi page mount
- Hiển thị: "Gửi lại mã sau 00:45"
- Khi countdown = 0, hiển thị link: "Không nhận được mã? Đăng ký lại" (navigate('/register'))
- Logic: useState<number>(300) + useEffect setInterval
- Không gọi API, chỉ điều hướng user quay lại đăng ký để nhận email mới
```

Nếu sau này backend thêm resend endpoint, chỉ cần thay hành động của link thành `authService.resendOtp()`.

---

## 8. Email Hint Plan

**Source email (đã triển khai):**
- `RegisterPage` truyền email qua navigate state
- `ConfirmAccountPage` đọc bằng `useLocation()`

**Cách làm an toàn (không đổi API):**
1. Trong `RegisterPage.onSubmit`, sau success: `navigate('/confirm-account', { state: { email: data.email } })`
2. Trong `ConfirmAccountPage`, parse `location.state?.email` với type guard
3. Chỉ hiển thị hint khi email tồn tại

---

## 9. Validation / Error / Loading Plan

| State | Hiện tại | Đề xuất |
|-------|---------|---------|
| **Loading** | Button text đổi sang "Đang xác thực..." | Thêm `disabled`, `disabled:shadow-none`, `disabled:bg-neutral-400` |
| **Error** | Toast only | Toast + inline error dưới OTP input (dùng `error` prop của `<Input>`) |
| **Success** | Toast + navigate('/login') | Giữ nguyên — không thêm success state animation để tránh over-engineer |
| **Empty OTP** | `required` rule | Giữ nguyên |
| **Wrong format** | `/^\d{6}$/` validate | Giữ nguyên |

---

## 10. Responsive Plan

| Breakpoint | Layout |
|-----------|--------|
| **Mobile < 640px** | Card full-width `mx-4`, padding `p-5`, OTP input center, background nhẹ |
| **Tablet 640–1024px** | Card `max-w-md`, padding `p-6` |
| **Desktop ≥ 1024px** | Card `max-w-lg lg:max-w-xl`, padding `p-8` |

Cùng breakpoint pattern với RegisterPage để đồng nhất.

---

## 11. Risk Checklist

| Risk | Mức độ | Mitigation |
|------|--------|-----------|
| Route `/confirm-account` | Thấp | Không đổi `App.tsx` |
| `authService.confirmEmail(token)` | **Zero risk** | Không đổi API call |
| `navigate('/login')` after success | **Zero risk** | Giữ nguyên |
| OTP validation rules | Thấp | Copy nguyên `/^\d{6}$/` |
| Missing navigate state email | Thấp | Type guard + conditional render |
| Resend countdown | Thấp | UI-only state, không API call mới |
| `BackButton` removal | Thấp | Thay bằng `AuthHeader` |
| iOS background attachment | Thấp | Dùng `useMemo` pattern từ RegisterPage |

---

## 12. Step-by-Step Implementation Checklist

> Mỗi bước nhỏ — approve xong mới code bước tiếp.

### Phase 1 — Foundation layout

- [x] **1.1** Import và áp dụng `AuthHeader` thay `BackButton`
- [x] **1.2** Thêm `bg-[#FFF2D6]` + `background.png` với `backgroundAttachment` iOS fallback
- [x] **1.3** Wrap form trong card `bg-surface-panel rounded-2xl border border-neutral-200/80 shadow-lg`
- [x] **1.4** Đặt card responsive `max-w-md`/`lg:max-w-lg`

### Phase 2 — Header section trong card

- [x] **2.1** Logo VietTune (copy markup từ RegisterPage)
- [x] **2.2** Title: `"Xác thực tài khoản"` với style `text-2xl font-bold text-neutral-900`
- [x] **2.3** Subtitle dài hơn: `"Nhập mã OTP gồm 6 chữ số đã gửi đến email của bạn để kích hoạt tài khoản."`

### Phase 3 — Email hint

- [x] **3.1** Truyền `email` qua navigate state từ RegisterPage
- [x] **3.2** Đọc `email` trong ConfirmAccountPage bằng `useLocation()`
- [x] **3.3** Chỉ hiện email hint khi có email (graceful fallback khi thiếu)

### Phase 4 — OTP Input nâng cấp (single input)

- [x] **4.1** Giữ `<Input>` hiện tại, thêm: `text-center text-2xl tracking-[0.45em] font-semibold`
- [x] **4.2** Đảm bảo `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength={6}`
- [x] **4.3** Giữ label `"Mã OTP"`
- [x] **4.4** Giữ nguyên validation rule

### Phase 5 — CTA button + states

- [x] **5.1** Cập nhật CTA class: `bg-primary-600 shadow-lg hover:bg-primary-700 active:scale-[0.98]`
- [x] **5.2** Button text: `"Kích hoạt tài khoản"`
- [x] **5.3** Loading text: `"Đang xác thực..."` (giữ nguyên)
- [x] **5.4** `disabled:bg-neutral-400`

### Phase 6 — Resend / Countdown UI

- [x] **6.1** Thêm `useState(300)` countdown + `useEffect` interval đếm ngược
- [x] **6.2** Khi `countdown > 0`: hiển thị `"Gửi lại mã sau m:ss"`
- [x] **6.3** Khi `countdown === 0`: link `"Không nhận được mã? Đăng ký lại"` → `navigate('/register')`
- [x] **6.4** Clear interval trong cleanup

### Phase 7 — Error feedback / UX polish

- [x] **7.1** Giữ toast error
- [x] **7.2** Thêm inline error dưới OTP input
- [x] **7.3** Clear inline error khi user edit OTP

### Phase 8 — Responsive Polish

- [x] **8.1** Mobile spacing: `p-5`, `pt-6`, `pb-10`
- [x] **8.2** Tablet spacing: `sm:p-8`, `sm:pt-8`
- [x] **8.3** Desktop alignment: `lg:max-w-lg`, `lg:pt-10`, tinh chỉnh bottom link

### Phase 9 — Verification

- [x] **9.1** Register success navigate `/confirm-account` + pass state email
- [x] **9.2** Submit OTP đúng -> `authService.confirmEmail` -> navigate `/login`
- [x] **9.3** Submit OTP sai -> toast + inline error
- [x] **9.4** Countdown hoạt động 300->0 và link `/register` xuất hiện đúng
- [x] **9.5** Email hint hiện khi có state email, ẩn khi thiếu
- [x] **9.6** Lint sạch (`eslint`) và TypeScript sạch (`tsc --noEmit`)

---

## 13. Không thay đổi

- `App.tsx` — route `/confirm-account`
- `authService.confirmEmail` — API call, endpoint
- `navigate('/login')` after success
- `ConfirmAccountForm` type
- OTP validation rules (`/^\d{6}$/`, `required`)
- `uiToast` error/success calls

---

## 14. Design Token Reference

```
Background:       bg-[#FFF2D6]
Card:             bg-surface-panel (#FFFCF5) / border-neutral-200/80
Header gradient:  from-primary-700 to-primary-800
CTA button:       bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-xl
Text primary:     text-neutral-900
Text secondary:   text-neutral-600
Text muted:       text-neutral-500
Email hint bg:    bg-neutral-50 rounded-xl
OTP input:        text-center text-2xl tracking-[0.5em] font-mono
```
