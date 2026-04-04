# PLAN: Review Web App - Chuc nang theo Role

## Phase -1: Context Check

### User Request
- Review web app, liet ke chi tiet cac chuc nang hien co cua cac role.

### Scope Chosen (Socratic Gate)
- Role scope: tat ca role (`Guest`, `Contributor`, `Expert`, `Researcher`, `Admin`).
- Muc do: liet ke chuc nang theo trang/flow.
- Output focus: docs-only (phan tich hien trang, khong sua code).

### Current State Snapshot
- Router chinh nam o `src/App.tsx`.
- Access control dang la hybrid:
  - mot phan guard o router (`AdminGuard`, `ResearcherGuard`)
  - mot phan gate trong tung page (`ModerationPage`, `UploadPage`, `ContributionsPage`, ...)
- Header hien thi navigation theo role + `isActive`.

### Constraints
- Planning only, khong thay doi code.
- Bieu dien hien trang dung theo implementation hien tai.
- Co danh dau diem khong dong nhat de team de review sau.

---

## Phase 0: Socratic Gate (Q&A Summary)

### Quyet dinh da chot voi user
1. Bao gom tat ca role.
2. Liet ke theo trang/flow de de review.
3. Chi tao tai lieu phan tich hien trang.

### Assumptions
- Review theo codebase hien tai (khong suy doan backend policy ngoai code).
- "Chuc nang hien co" bao gom:
  - route-level access
  - header/menu actions
  - page-level actions/gates

---

## Phase 1: Role Inventory & Access Matrix

### Goal
- Tao ma tran role -> route access -> action hien co.

### Tasks
1. Chot danh sach role va bien the trang thai account.
2. Liet ke route duoc guard vs route public.
3. Map role nao vao duoc route nao o thuc te.
4. Chuan hoa output thanh ma tran de team de doi chieu.

### Deliverables
- Role matrix baseline.
- Route guard summary.

---

## Phase 2: Feature Mapping Theo Tung Role

### Goal
- Liet ke day du chuc nang hien co cua tung role theo trang/flow.

### Tasks
1. Guest:
   - trang public
   - CTA login/register
   - hanh vi khi vao route can quyen
2. Contributor:
   - upload
   - contributions workflow
   - profile actions
   - notifications
3. Expert:
   - moderation flow
   - approved recordings
   - account deletion request
4. Researcher:
   - researcher portal modules
   - pending approval behavior
5. Admin:
   - admin dashboard modules
   - create expert
   - cross-role capabilities

### Deliverables
- Danh sach feature theo role (co source path).

---

## Phase 3: Navigation & UX Gate Analysis

### Goal
- Phan tich role-specific navigation va in-page gates de tim drift.

### Tasks
1. Review Header desktop/mobile theo role.
2. Review page-level gate thong dung (`forbidden`, `dim`, `redirect`, `disable form`).
3. So sanh route-level permission vs navigation discoverability.
4. Ghi nhan user-flow quan trong:
   - guest -> login redirect
   - unauthorized -> `/403`
   - inactive/pending handling

### Deliverables
- Navigation behavior summary.
- Gate behavior summary theo role.

---

## Phase 4: Inconsistency Review (Docs-only)

### Goal
- Danh dau cac diem khong dong nhat trong hien trang role/route.

### Tasks
1. Route public nhung gate trong-page.
2. Header desktop vs mobile khac nhau theo role.
3. Role co quyen truy cap nhung khong co link discoverability.
4. Redirect alias co the dan toi trang forbidden.
5. Notification/access pages khong gate chat o router.

### Deliverables
- Danh sach inconsistency + muc do uu tien review.
- Khong de xuat code fix trong phase nay (chi docs hien trang).

---

## Role Feature Snapshot (Initial)

### Guest
- Truy cap cac trang public va duoc yeu cau login khi vao route can quyen.
- Co "Tiep tuc voi tu cach khach" o login.

### Contributor
- Dong gop ban thu (`/upload`), quan ly dong gop (`/contributions`), profile, notifications.

### Expert
- Kiem duyet (`/moderation`), quan ly da duyet (`/approved-recordings`), flow duyet/chinh sua/xoa.

### Researcher
- Cong nghien cuu (`/researcher`) voi search nang cao, compare, export, graph/chat modules.
- Co trang thai pending approval neu inactive.

### Admin
- Quan tri he thong (`/admin`), tao expert (`/admin/create-expert`), xu ly cac request quan tri.

---

## Agent Assignments

### Agent A - Route & Guard Mapper
- Thu thap route-level access va guard logic.

### Agent B - Role Feature Mapper
- Liet ke tinh nang theo tung role tu pages va actions.

### Agent C - UX Gate Reviewer
- Tong hop navigation drift va cac diem khong dong nhat.

---

## Verification Checklist (Phase X)

### Coverage
- [ ] Du 5 role: Guest/Contributor/Expert/Researcher/Admin.
- [ ] Moi role co route + feature + action summary.
- [ ] Co trich dan file nguon cho moi phat hien chinh.

### Accuracy
- [ ] Route guard mapping khop `App` + guard files.
- [ ] Page-level gate mapping khop behavior hien tai.
- [ ] Khong tron "de xuat fix" vao phan docs-only.

### Completeness
- [ ] Co section inconsistencies.
- [ ] Co section navigation desktop/mobile theo role.
- [ ] Co flow login/unauthorized/inactive handling.

---

## Next Execution Entry Point
- Sau khi plan duoc review, tao file report ket qua chinh thuc:
  - `docs/ROLE-FEATURE-INVENTORY.md`
- Report nen theo bang:
  - `Role | Routes | Header Nav | In-page Actions | Gate Behavior | Gaps`.
