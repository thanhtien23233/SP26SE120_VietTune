# PLAN: Hook Search Bar + Login Gateway Modal

## Phase -1: Context Check

### User Request
- Nang cap Hero section tren HomePage voi "Hook Search Bar" noi bat.
- Gia lap AI loading (khong goi backend API) cho guest.
- Mo Login Gateway Modal sau khi guest submit query.
- Giu visual tone am, hoc thuat, red/cream theo VietTune.

### Scope Chosen (Socratic Gate)
- Scope page: `home_only` (chi HomePage hero hien tai).
- Animation level: `medium` (typing placeholder + loading feel + modal transition).
- Register route: uu tien theo yeu cau `/auth/register-researcher`, co verify route ton tai.

### Current State Snapshot
- Router hien tai co `/`, `/login`, `/register`, `/confirm-account`; route `/auth/register-researcher` can verify.
- HomePage da co slogan/chuc nang public; chua co "hook search" gate cho guest.
- Guard/policy da co cho route role-sensitive (`/admin`, `/researcher`) nhung chua co pre-login gateway modal tai hero.

### Constraints
- Planning only, khong viet code trong phase nay.
- Khong goi API that cho flow nay (chi simulated loading).
- UX phai ro rang: "AI da quet" nhung can login/register researcher de xem ket qua.

---

## Phase 0: Socratic Gate (Q&A Summary)

### Quyet dinh da chot
1. Trien khai truoc tren HomePage.
2. Muc animation trung binh, uu tien mem + hien dai.
3. Plan docs-only; implementation se lam sau qua `/create`.

### Assumptions
- Guest la doi tuong chinh cua flow "bait-and-switch".
- User da dang nhap (dac biet researcher) co the duoc dieu huong sang search page thay vi mo modal.
- Route `/auth/register-researcher` co the chua ton tai -> can fallback strategy.

---

## Phase 1: Hero Layout Refactor Plan

### Goal
- Tao khong gian cho search hook va tang conversion vao login/register.

### Tasks
1. Remove block "Terms and Conditions" o trung tam hero de mo rong visual.
2. Dat search bar lon ngay duoi project slogan.
3. Them placeholder semantic-goi-y:
   - static/typing sample: `Thu tim: "cac bai hat thu hoach su dung dan bau"...`
4. Them CTA button `Tim kiem` voi icon AI sparkle (neu icon set ho tro).
5. Dam bao responsive:
   - desktop: search + button tren 1 row
   - mobile: stack input/button, tap target lon.

### Deliverables
- Hero wireframe-level implementation checklist.
- Tailwind class guideline cho red/cream style, rounded corners, shadow.

### Risks
- Hero qua tai visual khi them animation + button lon.

### Mitigation
- Gioi han 1 animation chinh (placeholder typing), modal transition don gian.

---

## Phase 2: Guest Search Interaction (No API)

### Goal
- Tao trai nghiem "AI dang xu ly" ma khong goi backend.

### Tasks
1. Capture submit events:
   - click `Tim kiem`
   - press Enter trong input.
2. Block real API call cho guest:
   - khong trigger service layer/search endpoint.
3. Simulate loading 1000-1500ms:
   - disable input/button tam thoi
   - hien spinner/loading text nhe.
4. Sau loading:
   - open Login Gateway Modal.
5. Debounce/double-submit guard:
   - tranh multiple modal open neu user click lien tuc.

### Deliverables
- Interaction flow map (idle -> loading -> modal).
- State machine nho cho component (`idle/loading/modalOpen`).

### Risks
- User hieu nham la da thuc su co ket qua AI.

### Mitigation
- Message modal ro "yeu cau quyen truy cap" va call-to-action minh bach.

---

## Phase 3: Login Gateway Modal Plan

### Goal
- Chuyen doi guest sang login/register researcher voi thong diep manh me.

### Modal Spec (Vietnamese, as requested)
- Icon: lock hoac AI icon.
- Title: `Yeu cau quyen truy cap`
- Message:
  - `He thong AI da quet kho du lieu VietTune. Dang nhap hoac Dang ky tai khoan Nghien cuu vien (Researcher) ngay de xem ket qua phan tich chuyen sau va truy cap toan bo kho luu tru!`
- Buttons:
  1. Primary: `Dang nhap` -> `/login`
  2. Secondary: `Dang ky Researcher` -> `/auth/register-researcher`
  3. Ghost: `Dong` -> close modal

### UX/Accessibility Tasks
1. Backdrop blur manh (`backdrop-blur-md`) + dim overlay.
2. Focus trap + ESC close + click outside close (neu duoc chap nhan).
3. Keyboard navigation cho 3 buttons.
4. Prevent body scroll khi modal open.

### Deliverables
- Modal content contract.
- Navigation behavior contract cho 3 actions.

### Risks
- Route secondary button khong ton tai.

### Mitigation
- Verify route; neu missing, fallback tam:
  - `/register` + preselect researcher (hoac show notice).

---

## Phase 4: Styling & Brand Consistency Plan

### Goal
- Dong bo visual voi "warm, traditional, academic" theme.

### Tasks
1. Search bar style:
   - cream background, red border/accent, rounded-xl/2xl, elegant shadow.
2. Button style:
   - gradient red tone, icon sparkle, hover/active transitions.
3. Modal card style:
   - cream card + red heading accent + soft shadow.
4. Motion spec (`medium`):
   - placeholder typing loop nhe.
   - loading pulse/spinner.
   - modal fade + scale.

### Deliverables
- Tailwind styling guideline theo token/class pattern hien co.
- UI acceptance checklist cho desktop + mobile.

---

## Phase 5: Verification Checklist (Phase X)

### Functional
- [ ] Terms block da duoc remove khoi hero trung tam.
- [ ] Search bar lon + placeholder semantic hien dung.
- [ ] Click button hoac Enter deu kich hoat loading -> modal.
- [ ] Guest flow khong goi API search that.
- [ ] Buttons modal route dung:
  - [ ] Dang nhap -> `/login`
  - [ ] Dang ky Researcher -> `/auth/register-researcher` (hoac fallback da chot)
  - [ ] Dong -> close modal

### UX
- [ ] Modal blur backdrop dung muc (`backdrop-blur-md`).
- [ ] UI khong jitter khi loading/modal open.
- [ ] Keyboard/ESC/focus behavior hop le.

### Regression
- [ ] Khong pha vo layout hero tren mobile/tablet/desktop.
- [ ] Khong anh huong flow login/register hien co.
- [ ] Khong tao warning accessibility nghiem trong.

---

## Agent Assignments

### Agent A - Hero UI
- Refactor hero layout + search input/button visuals.

### Agent B - Interaction Logic
- Implement guest-only no-API loading flow + modal trigger state.

### Agent C - Modal & Routing
- Build modal UX/accessibility + action routing + route fallback handling.

---

## Next Execution Entry Point
- Sau khi review plan:
  - Run `/create Phase 1` de bat dau implement Hero layout.
  - Sau do `/create Phase 2` va `/create Phase 3` theo thu tu.
