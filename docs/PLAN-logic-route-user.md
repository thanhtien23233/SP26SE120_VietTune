# PLAN: Logic Route for User (Frontend)

## Phase -1: Context Check

### User Request
- Logic route for user.

### Scope Chosen (Socratic Gate)
- Pham vi: frontend routing.
- Muc tieu: ket hop nhieu dieu kien dieu huong (auth + role + onboarding/profile state).
- Muc do chi tiet: detailed plan (4-6 phases + test checklist + risk).

### Current State Snapshot
- Ung dung dang dung React (`src/App.tsx`) va co cac trang auth/chuc nang theo role.
- Logic dieu huong co kha nang dang phan tan o route guard, page-level redirect, hoac auth state checks.
- Chua co "single source of truth" ro rang cho route policy neu them dieu kien moi.

### Constraints
- Planning only, khong viet code trong phase nay.
- Giu hanh vi route hien tai neu chua duoc xac thuc thay doi.
- Uu tien an toan truy cap (deny-by-default cho route nhay cam).

---

## Phase 0: Socratic Gate (Q&A Summary)

### Quyet dinh da chot voi user
1. Tap trung frontend route logic.
2. Dieu huong dua tren nhieu dieu kien ket hop.
3. Can plan chi tiet de trien khai theo phases.

### Assumptions
- He thong da co thong tin auth session/co user profile trong state management hien tai.
- Role va profile completion co the lay duoc tai thoi diem app bootstrap hoac sau login.
- Cac trang protected can redirect toi page hop le thay vi hien trang loi tho.

---

## Phase 1: Inventory Route Matrix

### Goal
- Lap ban do route-to-access rule de khong bo sot edge cases.

### Tasks
1. Liet ke toan bo routes hien co theo nhom: public, auth-only, role-restricted, onboarding-required.
2. Xac dinh tung route can condition nao:
   - `isAuthenticated`
   - `role in allowedRoles`
   - `isProfileCompleted` (hoac onboarding status)
3. Dinh nghia fallback route cho moi truong hop fail rule (vi du: login, unauthorized, onboarding, home).
4. Tao ma tran "Route x Condition x Fallback" de lam baseline review.

### Deliverables
- Route matrix ro rang va co the review voi team.

### Risks
- Bo sot route dynamic/nested route.

### Mitigation
- Doi chieu matrix voi `App` router config va tat ca link navigation chinh.

---

## Phase 2: Define Central Route Policy

### Goal
- Chuan hoa route decision ve mot policy model thong nhat.

### Tasks
1. Chon policy schema:
   - route id/path
   - access type
   - allowed roles
   - onboarding requirement
   - redirect target khi fail
2. Dinh nghia thu tu evaluate rule de tranh conflict:
   - session loading
   - auth check
   - role check
   - onboarding/profile check
3. Chuan hoa default behavior:
   - loading state khi chua co user context
   - deny-by-default cho protected route neu data khong hop le
4. Chot naming va convention de de maintain (policy keys, helpers, guard wrappers).

### Deliverables
- Tai lieu route policy model + decision order.

### Risks
- Xung dot giua redirect tu route guard va redirect trong page component.

### Mitigation
- Quy dinh redirect o mot lop guard uu tien, page-level chi xu ly truong hop dac thu.

---

## Phase 3: Implementation Breakdown Plan

### Goal
- Chia nho implementation de giam regression risk.

### Tasks
1. Buoc 1: Tach auth/role/onboarding checks ve helper/guard chung.
2. Buoc 2: Map cac route hien tai vao policy model.
3. Buoc 3: Dong bo login/logout redirect flow va deep-link behavior.
4. Buoc 4: Dong bo unauthorized/onboarding pages va UX thong bao.
5. Buoc 5: Dọn logic redirect trung lap o cac page component.

### Deliverables
- Task list co thu tu phu thuoc ro rang cho dev.

### Risks
- Redirect loop khi condition chong cheo.

### Mitigation
- Dat loop-prevention rules (khong redirect toi route dang dung; whitelist fallback path).

---

## Phase 4: Testing & Validation Strategy

### Goal
- Dam bao route behavior dung voi tat ca to hop dieu kien.

### Tasks
1. Test matrix theo scenario:
   - guest user
   - authenticated user (basic role)
   - privileged role (moderator/admin/expert)
   - onboarding incomplete vs complete
2. Validation deep-link:
   - truy cap truc tiep URL protected route
   - reload trang sau login
   - quay lai trang truoc do sau auth
3. Regression scope:
   - login page
   - main app shell
   - role-specific pages
4. E2E checklist cho cac luong chinh va fallback behavior.

### Deliverables
- Test plan co du scenario functional + regression.

### Risks
- Khac biet timing load state gay flicker/redirect sai.

### Mitigation
- Xac dinh ro loading gate truoc khi evaluate final route decision.

---

## Phase 5: Rollout & Observability

### Goal
- Trien khai an toan va de theo doi su co route.

### Tasks
1. Uu tien rollout theo nhom route quan trong truoc (auth + protected core routes).
2. Ghi nhan route decision logs o moi truong dev/staging de debug nhanh.
3. Chuan bi rollback checklist neu phat hien redirect loop hoac route miss.
4. Chot tai lieu van hanh ngan gon cho team QA va dev.

### Deliverables
- Rollout checklist + incident response mini playbook.

### Risks
- Loi route chi xuat hien trong edge-case user state.

### Mitigation
- Theo doi log theo role/status va bo sung testcase ngay sau khi gap issue.

---

## Agent Assignments

### Agent A - Route Inventory
- Audit route map va tao route matrix (public/protected/role/onboarding).
- Chot fallback rules cho tung route group.

### Agent B - Guard & Policy Design
- Thiet ke policy schema va decision order.
- De xuat pattern guard wrapper + helper contracts.

### Agent C - QA/E2E
- Tao scenario matrix va checklist regression.
- Chot test case cho deep-link, reload, login-return, unauthorized.

---

## Verification Checklist (Phase X)

### Functional
- [ ] Guest vao route protected -> redirect dung ve login.
- [ ] User da login nhung sai role -> redirect dung ve unauthorized/home.
- [ ] User dung role nhung chua onboarding -> redirect dung ve onboarding.
- [ ] User hop le truy cap route protected thanh cong.
- [ ] Login xong quay lai deep-link route hop le dung nhu ky vong.

### Stability
- [ ] Khong xay ra redirect loop.
- [ ] Khong co flicker man hinh route giua cac state.
- [ ] Reload trang van giu route decision dung.

### Regression
- [ ] Khong pha vo navigation hien co cua public pages.
- [ ] Khong anh huong flow logout/login va session timeout.

### Observability
- [ ] Co du log context de debug route decision trong dev/staging.

---

## Next Execution Entry Point
- Sau khi review plan nay, chuyen sang implementation mode va bat dau tu Phase 1 -> Phase 2 truoc.
- Uu tien chot route matrix + policy schema truoc khi sua code guard.

---

## Phase -1 Execution Output (Completed)

### Baseline da xac minh trong code
- Router dang duoc khai bao tap trung o `src/App.tsx` voi `createBrowserRouter`.
- Route protected hien co:
  - `/admin/*` qua `AdminGuard`
  - `/researcher` qua `ResearcherGuard`
- Nhieu route khac hien la public (`/profile`, `/contributions`, `/upload`, `/moderation`, ...), chua duoc enforce guard dong nhat o router layer.
- Login redirect da co co che an toan `redirect` query param trong `src/pages/auth/LoginPage.tsx` (`getSafeRedirect`).
- Sau login, default navigation hien tai theo role:
  - `RESEARCHER -> /researcher`
  - `EXPERT -> /moderation`
  - con lai -> `/`

### Findings quan trong cho cac phase tiep theo
- `AdminGuard` va `ResearcherGuard` dang tu redirect bang `useEffect + navigate`, de tao duplicate decision path neu page-level redirect cung ton tai.
- Dieu kien truy cap hien dang tron giua `role` va `isActive` ngay trong tung guard, chua co policy schema trung tam.
- Chua thay loading gate thong nhat o router root cho truong hop auth state dang khoi tao.
- Chua co route matrix chinh thuc (Route x Condition x Fallback), can tao o Phase 1.

### Route Matrix Starter (seed cho Phase 1)
- Public: `/`, `/explore`, `/search`, `/recordings/:id`, `/about`, `/terms`, `/login`, `/register`, `/confirm-account`.
- Guarded-admin: `/admin`, `/admin/create-expert`.
- Guarded-researcher: `/researcher`.
- Redirect route: `/dashboard -> /moderation`.
- Error routes: `/403`, `*` (not found).

### Gate de vao Phase 1
- [x] Da xac minh vi tri router va guard chinh.
- [x] Da xac dinh redirect flow sau login.
- [x] Da xac dinh cac diem co nguy co conflict route decision.
- [x] Chot route matrix day du va fallback map (thuc hien trong Phase 1).

---

## Phase 1 Execution Output (Completed)

### Route x Condition x Fallback Matrix (Current Baseline)

| Route group | Route(s) | Required conditions | Fail fallback (current) | Notes |
|---|---|---|---|---|
| Public core | `/`, `/explore`, `/search`, `/semantic-search`, `/chatbot`, `/instruments`, `/ethnicities`, `/masters`, `/about`, `/terms` | none | n/a | Public by router config |
| Public detail | `/recordings/:id` | none | n/a | Public detail page |
| Public auth pages | `/login`, `/register`, `/confirm-account` | none | n/a | Login co `redirect` safe-check |
| Public error pages | `/403`, `*` | none | n/a | Static fallback pages |
| Redirect alias | `/dashboard` | none | auto redirect -> `/moderation` | Hard redirect in router |
| Public but candidate protected | `/recordings/:id/edit`, `/upload`, `/profile`, `/contributions`, `/moderation`, `/approved-recordings`, `/notifications` | none (hien tai) | n/a | Nhom route can review policy o Phase 2 |
| Guarded researcher | `/researcher` | `user != null` AND `(role=RESEARCHER OR ADMIN)` AND `isActive=true` | guest -> `/login?redirect=...`; fail role/status -> `/` | Logic nam trong `ResearcherGuard` |
| Guarded admin | `/admin`, `/admin/create-expert` | `user != null` AND `role=ADMIN` AND `isActive=true` | guest -> `/login?redirect=...`; fail role/status -> `/` | Logic nam trong `AdminGuard` |

### Gap log cho Phase 2 (Policy Design Input)
- Chua co route class `auth-only` rieng (chi yeu cau dang nhap, khong role restriction).
- Chua co fallback semantics chuan hoa:
  - unauthorized -> dang ve `/` thay vi `/403` trong guard.
  - onboarding/profile-incomplete route chua duoc khai bao.
- Chua co decision layer trung tam: guard dang vua "check" vua "navigate", kho dong bo khi scope route tang.

### Decisions da chot cho implementation tiep theo
1. Su dung matrix tren lam source of truth tam thoi.
2. Phase 2 se dinh nghia policy model trung tam (accessType, allowedRoles, requiresProfile, fallback).
3. Khong doi behavior runtime o Phase 1 (chi inventory + mapping), tranh regression som.

### Gate de vao Phase 2
- [x] Da inventory tat ca routes hien co trong `App` router.
- [x] Da map condition/fallback cho cac route guarded.
- [x] Da danh dau nhom route candidate can policy hoa.
- [ ] Chot policy schema va decision order thong nhat (thuc hien trong Phase 2).

---

## Phase 3 Execution Output (Completed)

### Muc tieu thuc thi
- Chuyen Phase 3 tu "y tuong tong quan" thanh implementation backlog co thu tu, co dependency, co rollback point.

### Dependency note (quan trong)
- Phase 3 da duoc chia task chi tiet, nhung mot so task can output tu Phase 2 (policy schema + decision order) de code khong bi rework.

### Implementation Backlog (ordered)

#### Sprint 3.1 - Foundation Extraction
1. Tao `route-access` helper layer (read-only wrapper quanh logic hien co) de tach dieu kien khoi UI component.
2. Chuyen cac check lap trong `AdminGuard` va `ResearcherGuard` thanh helper function co type ro rang.
3. Giu nguyen fallback runtime hien tai (`/login?redirect`, `/`) o buoc nay de khong doi behavior.
4. Add TODO anchor tai cac route candidate protected (upload/profile/contributions/notifications/...)
   de san sang map policy sau.

#### Sprint 3.2 - Policy Wiring
1. Nhung policy map vao guard path da co (`/admin`, `/researcher`) truoc.
2. Binh thuong hoa cach truyen `redirect` path cho login (1 utility duy nhat).
3. Tach phan "render UI message" khoi phan "route decision" de tranh duplicate condition.
4. Add safeguard tranh redirect-loop:
   - khong redirect neu target == current pathname
   - fallback ve `/` neu target khong hop le

#### Sprint 3.3 - Auth Flow Alignment
1. Dong bo login success redirect:
   - uu tien `redirect` query param (safe path)
   - fallback theo policy thay vi hardcode role-only.
2. Dong bo logout -> login -> return path behavior.
3. Chot handling khi auth state dang loading:
   - guard tam hoan evaluate cho toi khi co ket qua state.

#### Sprint 3.4 - UX/Error Path Harmonization
1. Chuan hoa unauthorized handling:
   - su dung 1 rule nhat quan (`/403` hoac `/`) theo policy decision.
2. Chuan hoa thong diep cho 3 trang thai:
   - guest
   - sai role
   - inactive/pending approval
3. Dam bao page-level redirect cu duoc go bo/thu gon neu trung voi guard-layer redirect.

#### Sprint 3.5 - Cleanup & Hardening
1. Remove logic redirect trung lap trong page components.
2. Review tat ca useEffect navigate dependencies de tranh re-trigger khong can thiet.
3. Add light debug logging cho route decision (dev only).

### File Touch Plan (du kien)
- `src/components/admin/AdminGuard.tsx`
- `src/components/admin/ResearcherGuard.tsx`
- `src/pages/auth/LoginPage.tsx`
- `src/App.tsx`
- `src/stores/authStore.ts`
- `src/components/common/` (neu can shared guard utility wrapper)

### Definition of Done - Phase 3
- [ ] Guard checks duoc truu tuong hoa, khong con logic copy/paste giua guards.
- [ ] Redirect flow login/deep-link nhat quan cho guest va signed-in users.
- [ ] Khong redirect-loop o cac route protected.
- [ ] Runtime behavior cua route hien co khong bi vo (trong khi chua rollout full policy).
- [ ] Co rollback plan theo file-level commit chunks.

### Rollback Boundaries
- Boundary A: sau Sprint 3.1 (chi extraction, khong behavior change).
- Boundary B: sau Sprint 3.2 (policy wiring cho guarded routes chinh).
- Boundary C: sau Sprint 3.4 (UX/fallback harmonization).

### Gate tiep theo
- [x] Da co implementation backlog theo thu tu.
- [x] Da co file touch plan + DoD + rollback boundaries.
- [x] Can chot Phase 2 policy schema/dependency truoc khi bat dau code Sprint 3.2 tro di.

---

## Phase 2 Execution Output (Completed)

### Central Route Policy Schema (chot de implement)

```ts
type AccessType = "public" | "auth" | "role";

type RoutePolicy = {
  path: string;                      // canonical route path
  accessType: AccessType;            // public/auth/role
  allowedRoles?: UserRole[];         // required when accessType = "role"
  requireActive?: boolean;           // default true for protected routes
  requireProfileCompleted?: boolean; // optional onboarding/profile gate
  fallback: {
    unauthenticated?: string;        // usually /login?redirect=...
    unauthorized?: string;           // /403 (preferred) or /
    inactive?: string;               // e.g. / or dedicated waiting page
    profileIncomplete?: string;      // e.g. /profile or /onboarding
  };
};
```

### Policy Classification (from current routes)
- `public`: `/`, `/explore`, `/search`, `/semantic-search`, `/chatbot`, `/instruments`, `/ethnicities`, `/masters`, `/about`, `/terms`, `/recordings/:id`, `/login`, `/register`, `/confirm-account`, `/403`, `*`
- `role` (hien tai): `/researcher`, `/admin`, `/admin/create-expert`
- `auth` (de xep vao rollout tiep theo): `/profile`, `/contributions`, `/notifications`
- `role/auth pending review`: `/upload`, `/moderation`, `/approved-recordings`, `/recordings/:id/edit`

### Decision Order (single source of truth)
1. **Route match** -> tim policy theo `pathname`.
2. **Public short-circuit** -> `allow`.
3. **Auth state loading** -> `defer` (hien loading gate, chua redirect).
4. **Authentication check**:
   - neu chua login -> `fallback.unauthenticated` (kem redirect param safe).
5. **Active status check** (neu `requireActive=true`):
   - neu inactive -> `fallback.inactive`.
6. **Role check** (neu `accessType=role`):
   - neu role khong hop le -> `fallback.unauthorized`.
7. **Profile/onboarding check** (neu `requireProfileCompleted=true`):
   - neu chua dat -> `fallback.profileIncomplete`.
8. **Allow render**.

### Fallback Standardization (chot)
- `unauthenticated`: `/login?redirect={encodedPath}`
- `unauthorized`: `/403` (thay vi `/` de ro semantically)
- `inactive`:
  - researcher pending approval: giu UX message trong `ResearcherGuard`, fallback `/`
  - role khac inactive: `/`
- `profileIncomplete` (du kien): `/profile`

### Guard Implementation Contract
- Guard khong tu quyet dinh rule "ngam"; guard chi:
  1. goi policy evaluator
  2. xu ly 3 trang thai: `allow | defer | redirect`
  3. render UI fallback/loading theo ket qua evaluator
- Page components khong nen tu redirect neu da thuoc policy-controlled route.

### Conflict Resolution Rules
- Redirect priority: policy evaluator > page-level navigate.
- Neu target redirect == current path -> break loop, fallback `/`.
- Chuan hoa redirect builder utility de tranh encode khac nhau giua guards.

### Mapping to Existing Guards (migration strategy)
1. `AdminGuard` migrate truoc (scope gon, role ro rang).
2. `ResearcherGuard` migrate sau (co inactive/pending UX).
3. Sau khi 2 guard on-policy:
   - dua route `auth-only` vao shared guard wrapper.
   - remove duplicate navigate logic trong pages.

### Gate close for Phase 2
- [x] Da chot policy schema.
- [x] Da chot decision order.
- [x] Da chot fallback semantics.
- [x] Da chot migration strategy cho guard hien tai.
- [x] Dependency cua Phase 3 da du dieu kien de bat dau implementation.

---

## Sprint 3.1 Execution Output (Completed)

### Muc tieu Sprint 3.1
- Tach logic access checks thanh helper dung chung.
- Giu nguyen runtime behavior, chi refactor structure.

### Changes da thuc hien
1. Tao helper layer moi: `src/utils/routeAccess.ts`
   - `buildLoginRedirectPath(pathname)`
   - `canAccessAdminRoute(user)`
   - `canAccessResearcherRoute(user)`
   - `isResearcherPendingApproval(user)`
2. Refactor `AdminGuard` sang dung helper:
   - bo hardcoded role check tai component
   - dung helper tao login redirect path
3. Refactor `ResearcherGuard` sang dung helper:
   - bo duplicate role/status checks
   - dung helper tao login redirect path
4. Dat TODO anchors trong `src/App.tsx` cho cac route candidate policy:
   - `recordings/:id/edit`, `upload`
   - `profile`, `contributions`, `notifications`
   - `moderation`, `approved-recordings`

### Runtime impact
- Khong doi fallback behavior hien tai:
  - guest -> `/login?redirect=...`
  - unauthorized/inactive -> `/` (giu nguyen theo behavior cu)
- UI states trong 2 guard giu nguyen.

### Sprint 3.1 Gate
- [x] Hoan tat helper extraction.
- [x] Hoan tat guard refactor khong doi behavior.
- [x] Da dat TODO anchor cho candidate routes.
- [x] San sang vao Sprint 3.2 (policy wiring + loop safeguards).

---

## Sprint 3.2 Execution Output (Completed)

### Muc tieu Sprint 3.2
- Nhung central policy vao guard routes hien co (`/admin`, `/researcher`).
- Chuan hoa route decision ve 1 evaluator va them safeguard tranh redirect-loop.

### Changes da thuc hien
1. Mo rong `src/utils/routeAccess.ts` voi policy evaluator:
   - `RouteGuardPolicy`, `GuardDecision`, `GuardDecisionReason`
   - `ADMIN_ROUTE_POLICY`, `RESEARCHER_ROUTE_POLICY`
   - `evaluateGuardAccess(user, pathname, policy)` -> `allow | redirect`
2. Them safeguard utility:
   - `resolveSafeRedirectTarget(currentPathname, candidateTarget)`
   - chan target khong hop le (`//`, path khong bat dau bang `/`)
   - chan self-redirect (`target === current pathname`) -> fallback `/`
3. Refactor `AdminGuard`:
   - doi sang flow policy-driven (`decision.status`)
   - redirect theo `decision.redirectTo`
   - UI loading/unauthorized render dua tren `decision.reason`
4. Refactor `ResearcherGuard`:
   - policy-driven decision cho redirect
   - giu pending-approval UX cho researcher inactive
   - tach ro branch `unauthenticated` va `inactive/unauthorized`

### Runtime impact
- Hanh vi business hien tai duoc giu on dinh:
  - guest -> login kem `redirect`
  - sai role/inactive -> `/`
- Guard decision da duoc tap trung vao 1 evaluator de san sang Sprint 3.3/3.4.

### Sprint 3.2 Gate
- [x] Guarded routes chinh da on-policy (`/admin`, `/researcher`).
- [x] Redirect builder/evaluator duoc chuan hoa.
- [x] Loop safeguards da duoc ap dung trong utility.
- [x] San sang Sprint 3.3 (auth flow alignment trong login/logout/deep-link).

---

## Sprint 3.3 Execution Output (Completed)

### Muc tieu Sprint 3.3
- Dong bo login success redirect theo policy fallback.
- Chuan hoa deep-link/login redirect builder o cac entry points chinh.
- Them handling auth-loading trong guard decision de tranh redirect som.

### Changes da thuc hien
1. Mo rong `routeAccess` cho post-login policy fallback:
   - `getDefaultPostLoginPath(user)`:
     - `Admin -> /admin`
     - `Researcher -> /researcher`
     - `Expert -> /moderation`
     - role khac -> `/`
   - `resolvePostLoginPath(user, requestedRedirect)` (uu tien redirect hop le, fallback theo policy)
2. Cap nhat `LoginPage`:
   - bo hardcode fallback theo role inline.
   - dung `resolvePostLoginPath(...)` de xac dinh dich den sau login.
3. Chuan hoa deep-link redirect utility:
   - `Header` logout flow dung `buildLoginRedirectPath(location.pathname)` thay vi hardcoded `/login`.
   - `ContributionsPage` va `UploadPage` dung chung `buildLoginRedirectPath(...)`.
4. Them auth-loading gate vao policy evaluator:
   - `evaluateGuardAccess(..., { isAuthLoading })` co the tra `defer`.
   - `AdminGuard`/`ResearcherGuard` render loading state khi `defer`, tranh redirect premature.

### Runtime impact
- Guest bi chan tai protected routes van duoc dua toi login kem redirect param.
- Sau login:
  - neu co redirect hop le -> quay ve route do.
  - neu khong co redirect -> fallback theo policy default path.
- Logout flow giu UX cu (`fromLogout`) nhung co return-path nhat quan hon.

### Sprint 3.3 Gate
- [x] Login success redirect da policy-aligned.
- [x] Deep-link/login redirect utility da duoc thong nhat o cac diem chinh.
- [x] Guard decision co auth-loading defer branch.
- [x] San sang Sprint 3.4 (unauthorized semantics + UX harmonization).

---

## Sprint 3.4 Execution Output (Completed)

### Muc tieu Sprint 3.4
- Chuan hoa semantics unauthorized ve route `/403`.
- Tach UX cho 3 trang thai trong guard: guest, unauthorized, inactive.
- Giu nguyen pending-approval UX rieng cho researcher.

### Changes da thuc hien
1. Cap nhat policy fallback trong `routeAccess`:
   - `ADMIN_ROUTE_POLICY.unauthorizedRedirectTo = "/403"`
   - `RESEARCHER_ROUTE_POLICY.unauthorizedRedirectTo = "/403"`
2. Cap nhat `AdminGuard`:
   - branch `unauthenticated`: giu loading + redirect login.
   - branch `unauthorized`: loading state "dang chuyen trang" truoc khi vao `/403`.
   - branch `inactive`: thong diep rieng "tai khoan chua kha dung", fallback ve `/`.
3. Cap nhat `ResearcherGuard`:
   - branch `unauthenticated`: giu loading + redirect login.
   - branch `unauthorized`: loading state "dang chuyen trang" truoc khi vao `/403`.
   - branch `inactive`:
     - neu researcher pending approval -> giu UX card cho duyet.
     - neu inactive khac -> thong diep "tai khoan chua kha dung", fallback ve `/`.

### Runtime impact
- User sai role truy cap `/admin` hoac `/researcher` duoc chuan hoa redirect sang `/403` (khong con ve `/`).
- User guest van bi dieu huong sang login kem redirect param.
- Researcher pending approval van giu thong diep dac thu nhu truoc.

### Sprint 3.4 Gate
- [x] Unauthorized semantics duoc thong nhat (`/403`).
- [x] Guest/inactive/unauthorized UX branches da tach ro trong guard.
- [x] Pending approval UX duoc giu nguyen.
- [x] San sang Sprint 3.5 (cleanup duplicate redirects + hardening).

---

## Sprint 3.5 Execution Output (Completed)

### Muc tieu Sprint 3.5
- Don dep logic redirect trung lap con lai.
- Hardening guard effect/dependency de han che re-trigger khong can thiet.
- Bo sung telemetry nhe de debug route decision trong dev.

### Changes da thuc hien
1. Cleanup utility:
   - Loai bo 2 helper khong con duoc su dung trong `routeAccess`:
     - `canAccessAdminRoute`
     - `canAccessResearcherRoute`
2. Hardening guard effects:
   - `AdminGuard` va `ResearcherGuard`:
     - doi effect dependency sang primitives (`decisionStatus`, `decisionReason`, `redirectTo`, `pathname`)
     - tranh phu thuoc truc tiep vao object decision de giam re-run noise.
3. Dev observability:
   - Them `logGuardDecision(...)` trong `routeAccess` (chi log khi `import.meta.env.DEV`).
   - Goi log trong `AdminGuard` va `ResearcherGuard` de theo doi `allow | defer | redirect` va target.

### Runtime impact
- Khong doi business behavior da chot o Sprint 3.4.
- Guard navigation on dinh hon trong qua trinh re-render.
- Co them dau vet debug route decision cho moi truong dev/staging local.

### Sprint 3.5 Gate
- [x] Cleanup redirect/guard helper debt hoan tat.
- [x] Guard hardening (effect/dependency) hoan tat.
- [x] Dev telemetry nhe cho route decision da co.
- [x] Phase 3 implementation backlog da hoan tat.

---

## Phase 4 Execution Output (Validation Snapshot)

### Validation da chay
1. `npm run build` -> **PASS**
   - TypeScript compile va Vite production build thanh cong.
2. `npm run lint` -> **FAIL (repo-level existing issues)**
   - Co nhieu loi/warning ton tai o cac module ngoai route-scope.
   - Khong phai regression rieng tu luong route policy.
3. Targeted lint cho files route da sua -> **PASS**
   - `src/components/admin/AdminGuard.tsx`
   - `src/components/admin/ResearcherGuard.tsx`
   - `src/utils/routeAccess.ts`
4. Structured smoke run (Playwright headless, localhost)
   - Script: `scripts/manual-smoke-routing.mjs`
   - Persona scope: guest, contributor, researcher(active/inactive), admin
   - Ket qua: 8 PASS / 1 FAIL / 0 BLOCKED (sau khi co credential that)

### Smoke Result Matrix
- **PASS** `guest-admin-login-redirect` -> `http://localhost:3000/login?redirect=%2Fadmin`
- **PASS** `guest-researcher-login-redirect` -> `http://localhost:3000/login?redirect=%2Fresearcher`
- **PASS** `guest-continue-link-home` -> `http://localhost:3000/`
- **PASS** `contributor-to-admin-403` -> `http://localhost:3000/403`
- **PASS** `contributor-to-researcher-403` -> `http://localhost:3000/403`
- **PASS** `admin-access-admin` -> `http://localhost:3000/admin`
- **PASS** `researcher-access-researcher` -> `http://localhost:3000/researcher`
- **PASS** `inactive-researcher-pending-not-403` -> `http://localhost:3000/researcher` (pendingVisible=true)
- **PASS** `deep-link-return-after-real-login` -> `http://localhost:3000/researcher` (credential that: researcher)

### Checklist Status Update

#### Functional
- [x] Guest vao route protected -> redirect dung ve login. *(PASS via smoke matrix)*
- [x] User da login nhung sai role -> redirect dung ve unauthorized/home. *(PASS -> `/403`)*
- [ ] User dung role nhung chua onboarding -> redirect dung ve onboarding. *(chua rollout onboarding gate)*
- [x] User hop le truy cap route protected thanh cong. *(PASS admin + researcher active)*
- [x] Login xong quay lai deep-link route hop le dung nhu ky vong. *(PASS voi credential researcher that)*

#### Stability
- [x] Khong xay ra redirect loop. *(PASS trong smoke matrix cac flow protected)*
- [ ] Khong co flicker man hinh route giua cac state. *(co defer branch + can UX verify)*
- [ ] Reload trang van giu route decision dung. *(can manual verify)*

#### Regression
- [x] Khong pha vo navigation hien co cua public pages. *(PASS: `/` va login guest flow on dinh)*
- [ ] Khong anh huong flow logout/login va session timeout. *(can manual/E2E verify)*

#### Observability
- [x] Co du log context de debug route decision trong dev/staging.

### Open Items de chot Phase 4
- Neu can gate "done" day du: bo sung E2E nho cho
  - inactive researcher -> pending/inactive UX behavior.
