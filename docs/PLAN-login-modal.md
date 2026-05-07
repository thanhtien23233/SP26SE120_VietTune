# PLAN: Login Modal thay thế Login Page

> **Slug**: `login-modal`
> **Ngày tạo**: 2026-04-19
> **Trạng thái**: Draft — chờ review trước khi triển khai

---

## Mục tiêu

Chuyển luồng đăng nhập từ **full-page `/login`** sang **modal overlay** mở ngay trên trang hiện tại, giữ nguyên context người dùng đang xem. Trang `/login` vẫn hoạt động như fallback (deep-link, guard redirect) nhưng render cùng component modal.

### Lợi ích

- Người dùng không bị rời khỏi trang đang xem (explore, recording detail, …)
- UX mượt hơn, giảm full-page navigation
- Tương thích ngược: `/login?redirect=…` vẫn hoạt động cho bookmark/guard

---

## Phân tích hiện trạng

### Login flow hiện tại

| Bước | Chi tiết |
|------|----------|
| Trigger | `Link to="/login"` (Header, HomePage, RegisterPage) hoặc `navigate('/login?redirect=...')` (guards, pages) |
| Route | `/login` — **ngoài** `MainLayout` (không có Header/Footer) |
| Form | Email + password (`react-hook-form`), validation inline |
| Submit | `authService.login()` → `setUser()` → `resolvePostLoginPath()` → `navigate()` |
| Error | Parse `response.data.message`, hiện lỗi inline |
| OTP sub-flow | Inline `fixed inset-0` overlay khi server yêu cầu xác nhận email |
| fromLogout | Session flag ẩn "Tiếp tục khách" khi vừa logout |

### Nơi tham chiếu `/login`

| File | Cách dùng |
|------|-----------|
| `App.tsx` | Route definition |
| `Header.tsx` | `Link to="/login"` (desktop + mobile), `navigate('/login')` on logout |
| `MainLayout.tsx` | Skip lưu `lastVisitedPage` khi path = `/login` |
| `HomePage.tsx` | Gateway `Link to="/login"` |
| `RegisterPage.tsx` | Footer link "Đã có tài khoản? Đăng nhập" |
| `ConfirmAccountPage.tsx` | `navigate('/login')` sau confirm |
| `RecordingDetailPage.tsx` | `window.location.href = '/login?redirect=...'` (hard nav) |
| `UploadPage.tsx` | `navigate(buildLoginRedirectPath('/upload'))` |
| `ContributionsPage.tsx` | `navigate(buildLoginRedirectPath('/contributions'))` |
| `routeAccess.ts` | `buildLoginRedirectPath` → guards |

### Dialog pattern hiện có

- `ConfirmationDialog`: `createPortal` → `document.body`, backdrop click, Escape, scroll lock
- `UploadProgressDialog`: tương tự
- Login OTP: custom `fixed inset-0` overlay (không dùng `ConfirmationDialog`)

---

## Thiết kế

### Kiến trúc tổng quan

```
┌─────────────────────────────────────────────┐
│  useLoginModalStore (Zustand)               │
│  ├─ isOpen: boolean                         │
│  ├─ redirectTo: string | null               │
│  ├─ onSuccessCallback: (() => void) | null  │
│  ├─ openLoginModal(opts?)                   │
│  └─ closeLoginModal()                       │
└─────────────────┬───────────────────────────┘
                  │
     ┌────────────┴────────────┐
     │                         │
┌────▼─────────┐   ┌──────────▼──────────┐
│ LoginModal   │   │  /login route        │
│ (portal)     │   │  (renders LoginModal │
│              │   │   full-page fallback) │
└──────────────┘   └──────────────────────┘
```

### P1 — LoginModal Store + Component

**File mới**: `src/stores/loginModalStore.ts`

```ts
type LoginModalState = {
  isOpen: boolean;
  redirectTo: string | null;
  onSuccessCallback: (() => void) | null;
  openLoginModal: (opts?: { redirect?: string; onSuccess?: () => void }) => void;
  closeLoginModal: () => void;
};
```

**File mới**: `src/components/auth/LoginModal.tsx`

- `createPortal` → `document.body` (giống `ConfirmationDialog`)
- Khi `isOpen = false` → render `null`
- UI: backdrop blur + centered card (rounded-2xl, max-w-md)
- Form nội dung **trích từ LoginPage**: email, password, submit, error display
- OTP sub-flow: giữ nguyên inline overlay bên trong modal
- Nút "Tạo tài khoản" → `navigate('/register')` + `closeLoginModal()`
- Nút "×" close (top-right) + Escape + backdrop click
- Body scroll lock khi mở
- Focus trap (tab within modal)
- Sau login thành công:
  - Gọi `onSuccessCallback?.()` nếu có
  - Nếu `redirectTo` → `navigate(resolvePostLoginPath(user, redirectTo))`
  - Nếu không có redirect → ở lại trang hiện tại (chỉ close modal)

**File mới**: `src/components/auth/LoginFormContent.tsx`

- Component thuần chứa form logic (react-hook-form, validation, submit handler)
- Shared giữa `LoginModal` và `LoginPage` (fallback)
- Props: `onSuccess(user)`, `className?`, `showGuestLink?`

### P2 — Tích hợp vào App

**`App.tsx`**

- Mount `<LoginModal />` **một lần** bên trong `AuthProvider`, ngoài `<Routes>`
- Route `/login` vẫn tồn tại nhưng component mới sẽ:
  - Nếu đã có `MainLayout` (không phải trường hợp hiện tại) → mở modal thay vì render page
  - Fallback: render `LoginFormContent` full-page cho direct URL access / SEO / bookmark

**`Header.tsx`**

- Desktop "Đăng nhập" button: thay `Link to="/login"` → `onClick: openLoginModal()`
- Mobile menu: tương tự
- Logout flow: giữ `navigate('/login')` (full-page) vì sau logout context đã clear

### P3 — Cập nhật navigation references

| File | Thay đổi |
|------|----------|
| `HomePage.tsx` | Nút gateway → `openLoginModal()` thay vì `Link to="/login"` |
| `UploadPage.tsx` | CTA → `openLoginModal({ redirect: '/upload' })` |
| `ContributionsPage.tsx` | CTA → `openLoginModal({ redirect: '/contributions' })` |
| `RecordingDetailPage.tsx` | Bỏ `window.location.href`, dùng `openLoginModal({ redirect: currentPath })` |
| `AdminGuard` / `ResearcherGuard` | Giữ `navigate('/login?redirect=...')` — guard redirect nên full-page để clear state đúng cách |
| `RegisterPage.tsx` | Link "Đã có tài khoản" → `openLoginModal()` + `navigate(-1)` hoặc giữ `Link` |
| `ConfirmAccountPage.tsx` | `navigate('/login')` → giữ nguyên (full-page hợp lý sau confirm) |

### P4 — LoginPage fallback (backward compat)

**`src/pages/auth/LoginPage.tsx`** — refactor:

- Đọc `?redirect=` từ URL
- Render `LoginFormContent` trong full-page layout (giữ branding split UI)
- Hoặc: khi detect đang trong `MainLayout`, tự `openLoginModal({ redirect })` rồi `navigate(-1)`
- `fromLogout` logic giữ nguyên: session flag, guest link ẩn/hiện

### P5 — Polish & Edge Cases

- **Focus trap**: `useEffect` trap Tab khi modal open
- **Accessibility**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Nested modals**: OTP overlay bên trong LoginModal → z-index stacking (LoginModal z-50, OTP z-60)
- **Route `/login` khi đã authenticated**: redirect ngay (giống hiện tại)
- **Multiple triggers**: store đảm bảo chỉ 1 modal instance
- **Animation**: fade-in backdrop + scale-up card (200ms `transition`)

---

## Checklist triển khai

### Phase 1: Core (LoginModal + Store)
- [ ] Tạo `src/stores/loginModalStore.ts`
- [ ] Tạo `src/components/auth/LoginFormContent.tsx` — trích form logic từ `LoginPage`
- [ ] Tạo `src/components/auth/LoginModal.tsx` — portal, backdrop, scroll lock, Escape, focus trap
- [ ] Mount `<LoginModal />` trong `App.tsx`
- [ ] Test: mở/đóng modal từ console (`useLoginModalStore.getState().openLoginModal()`)

### Phase 2: Header + HomePage Integration
- [ ] `Header.tsx`: desktop + mobile "Đăng nhập" → `openLoginModal()`
- [ ] `HomePage.tsx`: gateway button → `openLoginModal()`
- [ ] Verify logout flow vẫn hoạt động (navigate to `/login` full-page)

### Phase 3: Page-level Triggers
- [ ] `UploadPage.tsx` → `openLoginModal({ redirect: '/upload' })`
- [ ] `ContributionsPage.tsx` → `openLoginModal({ redirect: '/contributions' })`
- [ ] `RecordingDetailPage.tsx` → `openLoginModal({ redirect: currentPath })` (bỏ hard nav)

### Phase 4: LoginPage Refactor
- [ ] `LoginPage.tsx` → dùng `LoginFormContent` (reuse)
- [ ] Giữ full-page layout cho direct URL / guard redirect
- [ ] `fromLogout` logic giữ nguyên

### Phase 5: A11y & Polish
- [ ] Focus trap (`Tab` / `Shift+Tab` within modal)
- [ ] `role="dialog"`, `aria-modal`, `aria-labelledby`
- [ ] OTP sub-flow z-index stacking
- [ ] Fade/scale animation
- [ ] Test keyboard navigation (Escape, Tab, Enter)

### Phase X: Verification
- [ ] `npm run lint` — 0 errors
- [ ] `npx tsc --noEmit` — pass
- [ ] `npm run test:unit` — all pass
- [ ] `npm run build` — pass
- [ ] Manual test: mở modal từ Header (desktop + mobile)
- [ ] Manual test: mở modal từ HomePage gateway
- [ ] Manual test: mở modal từ UploadPage CTA (chưa login)
- [ ] Manual test: login thành công → modal đóng, ở lại trang
- [ ] Manual test: login thành công + redirect → navigate đúng
- [ ] Manual test: `/login` URL trực tiếp → full-page layout
- [ ] Manual test: `/login?redirect=/admin` → login → redirect to admin
- [ ] Manual test: guard redirect (admin/researcher) → full-page `/login`
- [ ] Manual test: logout → full-page `/login` + `fromLogout` flag
- [ ] Manual test: OTP flow trong modal
- [ ] Manual test: Escape / backdrop click đóng modal
- [ ] Manual test: Tab focus trap

---

## Ước lượng

| Phase | Effort |
|-------|--------|
| P1 — Core | ~2h |
| P2 — Header/Home | ~30min |
| P3 — Page triggers | ~30min |
| P4 — LoginPage refactor | ~1h |
| P5 — A11y & Polish | ~1h |
| PX — Verification | ~30min |
| **Tổng** | **~5.5h** |

---

## Rủi ro & Quyết định

| Rủi ro | Giải pháp |
|--------|-----------|
| OTP overlay chồng modal | Z-index stacking rõ ràng (modal z-50, OTP z-60) |
| Guard redirect mở modal thay vì page | Giữ guards dùng full-page `/login` — an toàn hơn khi state cần reset |
| `window.location.href` trong RecordingDetailPage | Chuyển sang SPA navigate + modal |
| Register flow phức tạp | Giữ register là full-page, chỉ login dùng modal |
| SEO / direct link `/login` | Giữ route `/login` render full-page fallback |
| `fromLogout` semantics thay đổi | Logout vẫn navigate to `/login` (full-page), flag hoạt động bình thường |

---

## Không thuộc phạm vi (Out of scope)

- Register modal (form dài, terms, phức tạp → giữ full-page)
- Forgot password flow (chưa implement)
- Social login / OAuth
- Token refresh tự động
