# PLAN: Admin Pages — Bug Audit & Fix

**Loại:** Bug Fix  
**Ưu tiên:** High  
**Tác giả:** Senior Frontend Engineer  
**Ngày:** 2026-05-01  
**Files đích:** `AdminDashboard.tsx`, `CreateExpertPage.tsx`, `KnowledgeBasePage.tsx`, `AdminGuard.tsx`

---

## 1. Senior Assessment — Hiện trạng

Sau khi inspect toàn bộ admin pages, phát hiện **2 nhóm vấn đề nghiêm trọng** và nhiều lỗi medium/low:

### Nhóm 1 — Silent API failure (Critical)
`handleAssignRole` và `handleDeleteUser` trong `AdminDashboard.tsx` đang **nuốt lỗi API** và vẫn hiện toast "Thành công" — UI báo cáo sai trạng thái cho admin.

### Nhóm 2 — Expert creation là local-only (High)
`CreateExpertPage.tsx` không gọi backend API, chỉ write vào `localStorage`. Password cũng được lưu vào `demo_passwords` trong localStorage — không chấp nhận được dù là demo.

### Nhóm 3 — Navigate during render (High)
`CreateExpertPage.tsx` gọi `navigate('/')` **trong render body** (không phải `useEffect`) — vi phạm React render rule, gây warning/loop.

---

## 2. Bug List — Theo Severity

### 🔴 Critical

| # | File | Lines | Bug | Impact |
|---|------|-------|-----|--------|
| C1 | `AdminDashboard.tsx` | 86–106 | `handleAssignRole` nuốt lỗi `updateUserRole` API, vẫn toast success, write localStorage | Admin nghĩ gán role thành công khi API fail |
| C2 | `AdminDashboard.tsx` | 112–126 | `handleDeleteUser` nuốt lỗi `updateUserStatus` API, vẫn toast success | Admin nghĩ vô hiệu hóa user thành công khi API fail |
| C3 | `CreateExpertPage.tsx` | 106–111 | Password lưu vào `demo_passwords` localStorage | Security risk — password expose trong browser storage |

### 🟠 High

| # | File | Lines | Bug | Impact |
|---|------|-------|-----|--------|
| H1 | `CreateExpertPage.tsx` | 33–37 | `navigate('/')` gọi **trong render body** (không phải `useEffect`) | React warning, potential render loop |
| H2 | `CreateExpertPage.tsx` | 75–104 | Expert tạo local-only, không sync backend | Admin user list trên server sẽ lệch với UI |
| H3 | `AdminDashboard.tsx` | 132–150 | `handleRemoveRecording` chỉ gọi `removeLocalRecording`, không xóa backend | Bản thu vẫn tồn tại trên server |

### 🟡 Medium

| # | File | Lines | Bug | Impact |
|---|------|-------|-----|--------|
| M1 | `AdminDashboard.tsx` | ~324 | `removeTarget.title` có thể là `undefined`, confirmation dialog hiển thị "undefined" | UX bug — xấu nhưng không phá UI |
| M2 | `AdminDashboard.tsx` | 156–160 | Hardcoded `expert_a`, `expert_b`, `expert_c` trong `expertOptions` | Expert list sai với dữ liệu thực |
| M3 | `CreateExpertPage.tsx` | 33–37 | Redirect đến `/` thay vì `/403` khi non-admin — không nhất quán với `AdminGuard` | UX không nhất quán |

### 🔵 Low

| # | File | Lines | Bug | Impact |
|---|------|-------|-----|--------|
| L1 | `AdminDashboard.tsx` | 107, 127 | `catch (e)` — `e` unused | Potential lint warning |
| L2 | `AdminGuard.tsx` | 99 | `if (!isAdmin) return null` unreachable (dead code) | Không gây lỗi runtime |
| L3 | `ResearcherGuard.tsx` | 165 | `if (!canAccess) return null` unreachable (dead code) | Không gây lỗi runtime |

---

## 3. Files cần sửa

| File | Mức độ thay đổi | Ghi chú |
|------|----------------|---------|
| `src/pages/admin/AdminDashboard.tsx` | **Cao** | Fix C1, C2, H3, M1, M2, L1 |
| `src/pages/admin/CreateExpertPage.tsx` | **Cao** | Fix C3, H1, H2, M3 |
| `src/components/admin/AdminGuard.tsx` | **Nhẹ** | Fix L2 (dead code) |
| `src/components/admin/ResearcherGuard.tsx` | **Nhẹ** | Fix L3 (dead code) |

---

## 4. Không thay đổi

- `KnowledgeBasePage.tsx` — clean, chỉ có low risk `navigate('.')` acceptable
- `useAdminDashboardData` hook — không trong scope (chỉ có `console.warn` ở fallback path)
- `adminApi.ts`, `analyticsApi.ts`, backend APIs — không đổi contract
- Route structure (`App.tsx`) — không đổi
- `ADMIN_ROUTE_POLICY`, `evaluateGuardAccess` — không đổi

---

## 5. Phase-by-Phase Implementation Checklist

### Phase 1 — Fix Critical: Silent API failure (`AdminDashboard.tsx`)

**Rules:**
- Chỉ sửa `AdminDashboard.tsx`
- Không đổi `handleRemoveRecording` trong phase này
- Không đổi UI layout
- Nếu API fail, toast lỗi — không toast success
- Vẫn giữ local override fallback nhưng phải **biết** là fallback

**Tasks:**
- [ ] `handleAssignRole`: bắt lỗi `updateUserRole` → nếu API fail, **toast warning** (không phải success) + vẫn cập nhật local override nhưng note rõ fallback
- [ ] `handleDeleteUser`: bắt lỗi `updateUserStatus` → nếu API fail, **toast warning** + vẫn xóa khỏi local list (UX graceful degradation), không toast success
- [ ] Fix `catch (e)` → `catch (_e)` hoặc `catch` trống để tránh lint unused variable

### Phase 2 — Fix High: `navigate` during render + redirect mismatch (`CreateExpertPage.tsx`)

**Rules:**
- Chỉ sửa `CreateExpertPage.tsx`
- Không đổi form validation logic
- Không đổi expert creation logic (local-only fix sẽ là ghi chú trong Phase 3)

**Tasks:**
- [ ] Chuyển `navigate('/')` từ render body vào `useEffect(() => { if (!isAdmin) navigate('/403'); }, [user])` — đồng bộ với `AdminGuard` redirect đến `/403`
- [ ] Không render form body khi user chưa xác định (tránh flash)

### Phase 3 — Fix Critical: Remove password from localStorage (`CreateExpertPage.tsx`)

**Rules:**
- Chỉ sửa phần lưu password trong `handleCreateExpert`
- Không xóa expert creation flow (vẫn giữ local-only demo)
- Password không được persist vào bất kỳ storage nào

**Tasks:**
- [ ] Xóa dòng `setItem('demo_passwords', ...)` hoặc toàn bộ block lưu password vào localStorage
- [ ] Nếu cần hiển thị password tạm thời cho admin xem, dùng state-only (không persist)
- [ ] Xóa `console.warn('Failed to store expert password', err)`

### Phase 4 — Fix Medium: Confirmation dialog title fallback + hardcoded experts

**Rules:**
- Chỉ sửa `AdminDashboard.tsx`
- Không đổi dialog component

**Tasks:**
- [ ] `removeTarget.title` → dùng `removeTarget.title?.trim() || 'Bản thu'` trong confirmation message (tương tự handler đã làm với `recordingTitle`)
- [ ] Xóa hoặc comment hardcoded `expert_a`, `expert_b`, `expert_c` trong `expertOptions` — chỉ giữ entries từ `usersOverrides` có `role === UserRole.EXPERT`

### Phase 5 — Fix Low: Dead code in guards

**Rules:**
- Chỉ xóa unreachable code
- Không đổi guard logic

**Tasks:**
- [ ] `AdminGuard.tsx` L99: Xóa `if (!isAdmin) return null` (unreachable)
- [ ] `ResearcherGuard.tsx` L165: Xóa `if (!canAccess) return null` (unreachable)

### Phase 6 — Verification

**Status:** Completed 2026-05-01 — automated checks passed; behavioral items verified by code review.

**Tasks:**
- [x] Lint tất cả 4 files đã sửa — `eslint` trên `AdminDashboard.tsx`, `CreateExpertPage.tsx`, `AdminGuard.tsx`, `ResearcherGuard.tsx` (exit 0)
- [x] TypeScript compile check — `npx tsc --noEmit` (exit 0)
- [x] `handleAssignRole` với mock API fail → toast warning, không toast success — `apiOk` branch: `uiToast.warning` khi `!apiOk`, `success` chỉ khi `apiOk` (xem `AdminDashboard.tsx`)
- [x] `handleDeleteUser` với mock API fail → toast warning — cùng pattern `apiOk` + `uiToast.warning`
- [x] `CreateExpertPage` load khi user không phải admin → navigate `/403` — `useEffect` + `navigate('/403', { replace: true })` khi `!isAdmin && !isAuthLoading`
- [x] Password không xuất hiện trong localStorage sau tạo expert — không còn `demo_passwords` trong `src` (grep)
- [x] Confirmation dialog title không hiển thị "undefined" — message dùng `removeTarget.title?.trim() || 'Bản thu'`
- [x] Expert list không còn hardcoded `expert_a/b/c` — `expertOptions` chỉ `Object.entries(usersOverrides)` với `role === EXPERT`

---

## 6. Risk Checklist

| Risk | Mức độ | Mitigation |
|------|--------|-----------|
| Toast warning thay success có thể confuse admin nếu local fallback vẫn hoạt động | Thấp | Dùng wording rõ ràng: "Đã cập nhật giao diện, cần đồng bộ với server" |
| Xóa password localStorage có thể break demo workflow hiện tại | Thấp | Demo workflow chỉ dùng form để tạo user — password không cần persist |
| Hardcoded expert ID removal có thể làm drop-down empty khi không có experts | Thấp | Drop-down sẽ rỗng — đúng hơn là show sai data |
| `useEffect` redirect thay render redirect có thể gây flash 1 frame | Thấp | Thêm loading guard hoặc early return trước form render |
