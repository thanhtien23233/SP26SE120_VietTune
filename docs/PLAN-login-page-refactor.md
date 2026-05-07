# PLAN: LoginPage Refactor — Đồng bộ Visual với RegisterPage + Bỏ modal khỏi primary flow

**Loại:** UI/UX Refactor  
**Ưu tiên:** High  
**Tác giả:** Senior Frontend Engineer + Senior UI/UX Designer  
**Ngày:** 2026-04-29  
**Files đích:** `src/pages/auth/LoginPage.tsx`, `src/components/layout/Header.tsx`

---

## 1. Senior Assessment — Hiện trạng

### Vấn đề cốt lõi

Login hiện có **hai flow song song và không đồng bộ**:

| Flow | Kích hoạt bởi | Visual | Nhất quán? |
|------|-------------|--------|-----------|
| **Modal popup** | Header "Đăng nhập" button, UploadPage, ContributionsPage, RecordingDetailPage, HomePage | White card trên dark overlay | ❌ Không match Register/Confirm |
| **Dedicated LoginPage `/login`** | Direct URL, bookmark | Dark layout (70% nền `#2C1810` + ZitherStrings) | ❌ Không match Register/Confirm |

`RegisterPage` và `ConfirmAccountPage` đã được refactor theo light cultural theme. `LoginPage` vẫn là dark split-panel và modal popup không thống nhất với flow mới.

### Phân tích trigger `openLoginModal()`

| File | Trigger | Redirect | Có thể chuyển sang `/login`? |
|------|---------|---------|-------------------------------|
| `Header.tsx` L329 | Button "Đăng nhập" (desktop) | none | ✅ Đổi thành `<Link to="/login">` |
| `Header.tsx` L508 | Button "Đăng nhập" (mobile menu) | none | ✅ Đổi thành navigate |
| `UploadPage.tsx` L69 | Guard unauthenticated | `/upload` | ✅ Đổi thành `navigate('/login?redirect=/upload')` |
| `ContributionsPage.tsx` L348 | Guard unauthenticated | `/contributions` | ✅ Đổi thành `navigate('/login?redirect=/contributions')` |
| `RecordingDetailPage.tsx` L204 | Guard unauthenticated | `location.pathname` | ✅ Đổi thành `navigate('/login?redirect=...')` |
| `HomePage.tsx` L407 | CTA button | none | ✅ Đổi thành `navigate('/login')` |

> Tất cả trigger đều có thể replace bằng navigate `/login` với `?redirect=` query param — vốn đã được xử lý đúng trong `LoginPage` thông qua `parseSafeRedirectParam`.

### LoginPage layout hiện tại (cần refactor)

```
[70% Dark brown nền] | [30% White form panel]
  ZitherStrings bg     LoginFormContent
  Logo lớn             title/form/button
  Hero text đen
```

→ **Không đồng bộ** với light cultural theme của Register/Confirm.

---

## 2. Mục tiêu Refactor

1. Chuyển Header "Đăng nhập" từ `openLoginModal()` sang `<Link to="/login">` (không xoá modal ngay)
2. Chuyển tất cả guard page trigger từ modal sang `navigate('/login?redirect=...')`
3. Refactor `LoginPage` layout sang light cultural theme (cream + `background.png` + card centered)
4. Reuse 100% `LoginFormContent` cho form logic — không đổi business logic
5. Reuse `AuthHeader` từ RegisterPage
6. Giữ nguyên modal component và store (vì xoá có thể có risk hidden dependency)
7. `LoginPage` sau refactor phải seamlessly nhận `?redirect=` param

---

## 3. Proposed LoginPage UI Structure

```
┌──────────────────────────────────────────────────────┐
│  AUTH HEADER (AuthHeader component)                  │
├──────────────────────────────────────────────────────┤
│  bg-[#FFF2D6] + background.png (cultural)            │
│                                                      │
│  ┌───────────────────────────────────────┐           │
│  │  LOGIN CARD  (bg-surface-panel)       │           │
│  │  max-w-md, rounded-2xl, shadow-lg     │           │
│  │                                       │           │
│  │  [Logo VietTune]                      │           │
│  │  "Đăng nhập vào VietTune"            │           │
│  │  subtitle: "Tiếp tục khám phá và     │           │
│  │   lưu giữ âm nhạc truyền thống Việt" │           │
│  │                                       │           │
│  │  ── Form fields ───────────────────   │           │
│  │  Email hoặc số điện thoại            │           │
│  │  Mật khẩu                            │           │
│  │                                       │           │
│  │  [══════ ĐĂNG NHẬP ══════]           │           │
│  │                                       │           │
│  │  Quên mật khẩu?                      │           │
│  │  Chưa có tài khoản? Đăng ký tại đây  │           │
│  │                                       │           │
│  │  Tiếp tục với tư cách khách (nếu có) │           │
│  └───────────────────────────────────────┘           │
└──────────────────────────────────────────────────────┘
```

---

## 4. Component Reuse Plan

| Component | Action | Ghi chú |
|-----------|--------|---------|
| `LoginFormContent` | ✅ Reuse 100% | Tất cả form logic/validation/API đã có sẵn |
| `AuthHeader` | ✅ Reuse trực tiếp | Không cần prop đặc biệt ở LoginPage |
| `background.png` | ✅ Reuse import | Giống RegisterPage, ConfirmAccountPage |
| `backgroundAttachment useMemo` | ✅ Copy pattern | iOS `scroll` fallback |
| Card container token | ✅ Reuse | `bg-surface-panel rounded-2xl border border-neutral-200/80 shadow-lg` |
| `ZitherStrings` (hiện tại) | ❌ Loại bỏ | Thay bằng `background.png` |
| Dark left panel (70%) | ❌ Loại bỏ | Thay bằng centered card |
| `LoginModal` component | 🔒 Giữ nguyên | Không xóa, chỉ tắt trigger ở Header |
| `useLoginModalStore` | 🔒 Giữ nguyên | Không xóa store |

---

## 5. Files Likely to Modify

| File | Mức độ thay đổi | Ghi chú |
|------|----------------|---------|
| `src/pages/auth/LoginPage.tsx` | **Cao** | Refactor toàn bộ layout, giữ form logic |
| `src/components/layout/Header.tsx` | **Nhẹ** | Đổi 2 button "Đăng nhập" từ `openLoginModal()` sang `Link to="/login"` |
| `src/pages/UploadPage.tsx` | **Nhẹ** | Đổi modal trigger sang `navigate('/login?redirect=/upload')` |
| `src/pages/ContributionsPage.tsx` | **Nhẹ** | Đổi modal trigger sang `navigate('/login?redirect=/contributions')` |
| `src/pages/RecordingDetailPage.tsx` | **Nhẹ** | Đổi modal trigger sang `navigate('/login?redirect=...')` |
| `src/pages/HomePage.tsx` | **Nhẹ** | Đổi CTA modal trigger sang `navigate('/login')` |

| File | Action |
|------|--------|
| `src/components/auth/LoginModal.tsx` | **Giữ nguyên** |
| `src/stores/loginModalStore.ts` | **Giữ nguyên** |
| `src/App.tsx` | **Giữ nguyên** |
| `src/services/authService.ts` | **Giữ nguyên** |

---

## 6. Risk Checklist

| Risk | Mức độ | Mitigation |
|------|--------|-----------|
| `?redirect=` param bị mất | Thấp | `LoginPage` đã xử lý `parseSafeRedirectParam` — chỉ cần truyền đúng query |
| `resolvePostLoginPath` vẫn hoạt động | Zero risk | Không đổi `handleSuccess` |
| Modal bị gọi từ nơi nào khác ngoài 6 file trên | Thấp | Grep đã kiểm tra — chỉ 6 file |
| `LoginFormContent` OTP overlay vẫn hoạt động trong page context | Thấp | OTP overlay dùng `fixed inset-0` — vẫn hoạt động trong page |
| Mất guard redirect sau login | Thấp | `navigate('/login?redirect=...')` + `parseSafeRedirectParam` đã có |
| User đang ở route cần auth rồi navigate đi, back browser | Thấp | React Router behavior giữ nguyên |
| `fromLogout` sessionStorage logic | Zero risk | Không đổi gì trong auth flow |
| iOS background | Thấp | Dùng `useMemo` pattern như RegisterPage |
| `LoginPage` hiện dùng `ZitherStrings` import | Thấp | Xoá import sau refactor |

---

## 7. Phase-by-Phase Implementation Checklist

### Phase 1 — Refactor LoginPage layout

**Rules:**
- Chỉ sửa `LoginPage.tsx`
- Giữ nguyên `LoginFormContent` usage và `handleSuccess` logic
- Giữ nguyên `redirectTo` / `parseSafeRedirectParam` / `resolvePostLoginPath`
- Giữ nguyên `fromLogout` logic
- Reuse `AuthHeader`, `background.png`, `backgroundAttachment useMemo` từ RegisterPage

**Tasks:**
- [ ] Xoá dark split-panel layout (70/30)
- [ ] Xoá `ZitherStrings` import và usage
- [ ] Import `AuthHeader`, `backgroundImage`
- [ ] Thêm `useMemo` cho iOS `backgroundAttachment`
- [ ] Wrap trang trong `bg-[#FFF2D6]` + `background.png` (giống RegisterPage)
- [ ] Thêm `AuthHeader` ở đầu trang
- [ ] Wrap `LoginFormContent` trong card `bg-surface-panel rounded-2xl border shadow-lg`
- [ ] Card centered: `max-w-md mx-auto px-4 pt-6 pb-10 sm:pt-8 sm:pb-12`
- [ ] Thêm logo + title + subtitle phía trên form trong card
- [ ] Đảm bảo `LoginFormContent` nhận đủ props hiện tại

### Phase 2 — Header: đổi trigger Đăng nhập

**Rules:**
- Chỉ sửa `Header.tsx`
- Không xoá import `useLoginModalStore` (còn dùng ở nơi khác trong file hay không — cần check)
- Chỉ đổi `onClick={() => openLoginModal()}` thành `<Link to="/login">`
- Giữ nguyên button "Đăng ký" (đã là `Link to="/register"`)
- Đổi cả desktop lẫn mobile

**Tasks:**
- [ ] Desktop `Header.tsx` L329: đổi `<button onClick={openLoginModal}>Đăng nhập</button>` → `<Link to="/login">Đăng nhập</Link>` với class tương đương
- [ ] Mobile `Header.tsx` L508: tương tự
- [ ] Giữ nguyên `openLoginModal` import nếu còn dùng ở nơi khác trong Header (kiểm tra trước khi xóa)

### Phase 3 — Guard pages: đổi modal trigger sang navigate

**Rules:**
- Mỗi file một patch nhỏ
- Không đổi guard logic — chỉ đổi action từ `openLoginModal(...)` sang `navigate('/login?redirect=...')`
- Thêm `useNavigate` import nếu chưa có

**Tasks:**
- [ ] `UploadPage.tsx`: `openLoginModal({ redirect: '/upload' })` → `navigate('/login?redirect=%2Fupload')`
- [ ] `ContributionsPage.tsx`: `openLoginModal({ redirect: '/contributions' })` → `navigate('/login?redirect=%2Fcontributions')`
- [ ] `RecordingDetailPage.tsx`: `openLoginModal({ redirect: location.pathname })` → `navigate('/login?redirect=' + encodeURIComponent(location.pathname))`
- [ ] `HomePage.tsx`: `openLoginModal()` → `navigate('/login')`
- [ ] Xoá `useLoginModalStore` import trong từng file sau khi đổi xong
- [ ] Giữ nguyên logic guard điều kiện (chỉ thay phần action)

### Phase 4 — Verification

**Rules:**
- Không đổi code trừ khi phát hiện bug
- Kiểm tra code-path trước khi test

**Tasks:**
- [ ] `LoginPage` render với nền cream + cultural pattern
- [ ] `AuthHeader` hiển thị đúng
- [ ] Form login submit → `authService.login` → `resolvePostLoginPath` → navigate đúng
- [ ] `?redirect=/upload` sau login navigate về `/upload`
- [ ] `fromLogout` ẩn guest link
- [ ] Forgot password link navigate `/forgot-password`
- [ ] "Đăng ký tại đây" navigate `/register`
- [ ] Header desktop "Đăng nhập" → navigate `/login`
- [ ] Header mobile "Đăng nhập" → navigate `/login`
- [ ] OTP overlay trong LoginPage (unconfirmed email) vẫn hiển thị đúng
- [ ] `LoginModal` vẫn tồn tại trong DOM (qua App.tsx) nhưng không được trigger từ Header/pages
- [ ] Lint + TypeScript clean

---

## 8. Không thay đổi tuyệt đối

- `src/App.tsx` — route `/login`, `<LoginModal />` mount
- `src/stores/loginModalStore.ts` — store
- `src/components/auth/LoginModal.tsx` — component
- `src/components/auth/LoginFormContent.tsx` — business logic
- `src/services/authService.ts` — login API
- `LoginPage` `handleSuccess`, `resolvePostLoginPath`, `parseSafeRedirectParam`
- `LoginPage` `fromLogout` sessionStorage check
- `redirect` query param processing
- Guard logic điều kiện trong UploadPage, ContributionsPage, RecordingDetailPage (chỉ đổi action)

---

## 9. Design Token Reference

```
Background:       bg-[#FFF2D6] + background.png
Card:             bg-surface-panel / border-neutral-200/80 / rounded-2xl / shadow-lg
Header gradient:  from-primary-700 to-primary-800  (via AuthHeader)
CTA button:       bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-xl
Text primary:     text-neutral-900
Text secondary:   text-neutral-600
Text muted:       text-neutral-500
Register link:    text-secondary-400
```
