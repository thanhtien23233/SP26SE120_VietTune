# PLAN: E2E Tests — Toàn bộ Features trong Codebase

**Slug:** `e2e-feature-gaps`
**Ngày tạo:** 2026-04-15
**Cập nhật:** 2026-04-16 — Chuyển đổi chiến lược sang **Real Integration E2E Test** (không dùng Mock API)
**Nguồn:** Khảo sát toàn bộ `src/` — pages, components, services, routes
**Phạm vi:** Tạo Playwright E2E spec cho **mọi feature** có trong codebase, tương tác **trực tiếp với Backend API thật** trên môi trường Test/Staging.

---

## Overview

### Hiện trạng E2E test (9 files)
| File | Scope | Đã cover |
|------|-------|----------|
| `01-contributor.spec.ts` | Contributor login | ✅ |
| `05-explore.spec.ts` | /explore guest | ✅ |
| `06-homepage.spec.ts` | / homepage | ✅ |
| `07-upload-explore-ui.spec.ts` | /upload UI surface | ✅ |
| `08-contributions-explore-ui.spec.ts` | /contributions sidebar/tab | ✅ |
| `09-moderation-explore-ui.spec.ts` | /moderation route responds | ✅ (minimal) |
| `10-toast-smoke.spec.ts` | Toaster mount + login toast | ✅ |
| `11-contributor-flow-assertions.spec.ts` | Contributions tabs, upload wizard, API call | ✅ |
| `auth.setup.ts` | Contributor auth setup | ✅ |

### Chưa cover (cần bổ sung) — 22 feature groups

| # | Feature Group | Route/Page | Role | E2E? |
|---|--------------|-----------|------|------|
| 1 | Auth — Login | `/login` | Guest | ⚠️ chỉ toast |
| 2 | Auth — Register | `/register` | Guest | ❌ |
| 3 | Auth — Confirm Account | `/confirm-account` | Guest | ❌ |
| 4 | Homepage — full content | `/` | Guest | ⚠️ minimal |
| 5 | Explore — filters, search, cards | `/explore` | Guest | ⚠️ minimal |
| 6 | Recording Detail — media, sidebar, actions | `/recordings/:id` | Guest | ❌ |
| 7 | Search — keyword filters + export | `/search` | Guest | ❌ |
| 8 | Semantic Search — NLP query | `/semantic-search` | Guest | ❌ |
| 9 | Chatbot — AI Q&A | `/chatbot` | Auth | ❌ |
| 10 | Knowledge Base public view | `/kb/entry/:id` | Guest | ❌ |
| 11 | Instruments catalogue | `/instruments` | Guest | ❌ |
| 12 | Ethnicities catalogue | `/ethnicities` | Guest | ❌ |
| 13 | Masters catalogue | `/masters` | Guest | ❌ |
| 14 | About page | `/about` | Guest | ❌ |
| 15 | Profile — edit, delete account | `/profile` | Auth | ❌ |
| 16 | Upload — 3-step wizard full flow | `/upload` | Contributor | ⚠️ surface only |
| 17 | Contributions — detail, version history, status tabs | `/contributions` | Contributor | ⚠️ tabs only |
| 18 | Moderation — queue, claim, approve/reject, wizard | `/moderation` | Expert | ⚠️ route only |
| 19 | Approved Recordings — expert browse | `/approved-recordings` | Expert | ❌ |
| 20 | Researcher Portal — archive, compare, QA, graph, export | `/researcher` | Researcher | ❌ |
| 21 | Admin Dashboard — stats, users, AI, analytics, KB, embargo, disputes | `/admin` | Admin | ❌ |
| 22 | Admin — Create Expert | `/admin/create-expert` | Admin | ❌ |
| 23 | Admin — Knowledge Base Management | `/admin/knowledge-base` | Admin | ❌ |
| 24 | Notifications — feed, badge, mark read, delete | `/notifications` | Auth | ❌ |
| 25 | Edit Recording | `/recordings/:id/edit` | Contributor | ❌ |
| 26 | §A Dual Audio Player | `/researcher` tab compare | Researcher | ❌ |
| 27 | §B Export Academic Datasets | `/researcher` + `/search` | Researcher | ❌ |
| 28 | §C Expert Annotation Tools | `/moderation` tab annotation | Expert | ❌ |
| 29 | §D AI Supervision Dashboard | `/admin` tab aiMonitoring | Admin | ❌ |
| 30 | §E+H Embargo/Copyright Dispute | `/moderation` detail + `/admin` | Expert/Admin | ❌ |
| 31 | §F Collection Analytics Charts | `/admin` tab analytics | Admin | ❌ |
| 32 | §K Submission Version History | `/contributions` + `/moderation` | Contributor/Expert | ❌ |
| 33 | §L Notification Web Flow | `/notifications` + header | Auth | ❌ |
| 34 | Header/Footer — navigation, responsive | all pages | Guest | ❌ |
| 35 | Terms & Conditions | inline component | Guest | ❌ |
| 36 | 403 Forbidden page | `/403` | Guest | ❌ |
| 37 | 404 Not Found page | `/*` | Guest | ❌ |

---

## Project Type

**WEB** — React + Vite + Playwright

---

## Success Criteria

1. Mỗi route có ≥ 1 E2E spec kiểm tra **tải thành công + UI render**
2. Mỗi feature phức tạp có thêm **happy path interaction test**
3. Tất cả spec chạy pass trên `npm run test:e2e` locally
4. Sử dụng **100% Real API** từ môi trường Backend Test/Staging. Mọi test case phải tương tác trực tiếp với database thật của môi trường test.
5. Spec không bị flaky (dùng `data-testid`, `waitForSelector`, retry hợp lý)

---

## Tech Stack

| Tool | Version | Mục đích |
|------|---------|----------|
| Playwright | ^1.49.1 | E2E browser testing |
| TypeScript | ^5.3.3 | Type-safe specs |
| Vite dev server | ^5.0.11 | Local webServer |

---

## File Structure

```
tests/e2e/
├── helpers/
│   ├── contributorSession.ts          # (đã có)
│   ├── expertSession.ts               # [MỚI]
│   ├── researcherSession.ts           # [MỚI]
│   ├── adminSession.ts                # [MỚI]
│   ├── testDataTeardown.ts            # [MỚI] — Dọn dẹp dữ liệu rác sau test via Real API
│   ├── contributorUploadHappyPath.ts  # (đã có)
│   └── viettuneIndexedDBAuth.ts       # (đã có)
├── auth.setup.ts                      # Mở rộng: contributor + expert + researcher + admin
│
│   # --- Guest pages (không cần auth) ---
├── 12-auth-pages.spec.ts              # [MỚI] Login, Register, Confirm
├── 13-homepage-full.spec.ts           # [MỚI] Homepage content đầy đủ
├── 14-explore-full.spec.ts            # [MỚI] Explore filters, cards, search
├── 15-recording-detail.spec.ts        # [MỚI] Recording detail page
├── 16-search-page.spec.ts             # [MỚI] Keyword search + filters
├── 17-semantic-search.spec.ts         # [MỚI] Semantic NLP search
├── 18-catalogues.spec.ts              # [MỚI] Instruments, Ethnicities, Masters
├── 19-static-pages.spec.ts            # [MỚI] About, Terms, 403, 404
├── 20-kb-public-view.spec.ts          # [MỚI] KB entry public view
│
│   # --- Auth pages (cần login) ---
├── 21-profile-page.spec.ts            # [MỚI] Profile edit/delete
├── 22-chatbot-page.spec.ts            # [MỚI] AI chatbot
├── 23-notification-feed.spec.ts       # [MỚI] Notification list + badge + actions
├── 24-header-navigation.spec.ts       # [MỚI] Header nav + responsive + role links
│
│   # --- Contributor pages ---
├── 25-upload-full-wizard.spec.ts      # [MỚI] Upload 3-step wizard deep
├── 26-contributions-full.spec.ts      # [MỚI] Contributions detail + version history
├── 27-edit-recording.spec.ts          # [MỚI] Edit recording page
│
│   # --- Expert pages ---
├── 28-moderation-full.spec.ts         # [MỚI] Moderation queue + claim + wizard
├── 29-approved-recordings.spec.ts     # [MỚI] Approved recordings browse
├── 30-annotation-expert.spec.ts       # [MỚI] §C Annotation CRUD
├── 31-embargo-dispute.spec.ts         # [MỚI] §E+H Embargo + disputes
│
│   # --- Researcher pages ---
├── 32-researcher-portal.spec.ts       # [MỚI] Archive, filter, list
├── 33-dual-player.spec.ts             # [MỚI] §A Dual audio compare
├── 34-export-dataset.spec.ts          # [MỚI] §B Export CSV/XLSX
├── 35-researcher-qa-graph.spec.ts     # [MỚI] QA tab + Knowledge Graph tab
│
│   # --- Admin pages ---
├── 36-admin-dashboard.spec.ts         # [MỚI] Dashboard overview + tabs
├── 37-admin-create-expert.spec.ts     # [MỚI] Create expert flow
├── 38-admin-knowledge-base.spec.ts    # [MỚI] KB management
├── 39-ai-dashboard-admin.spec.ts      # [MỚI] §D AI monitoring
├── 40-analytics-charts.spec.ts        # [MỚI] §F Analytics charts
│
└── fixtures/
    └── e2e-clip.wav                   # (đã có)
```

---

## Task Breakdown

### Phase 1 — Hạ tầng (Blocker)

#### Task 1.1: Session helpers cho Expert/Researcher/Admin
- **Agent:** `frontend-specialist` · **Skill:** `webapp-testing`
- **Priority:** P0 (blocker)
- **INPUT:** Pattern `contributorSession.ts` + `viettuneIndexedDBAuth.ts`
- **OUTPUT:** `expertSession.ts`, `researcherSession.ts`, `adminSession.ts`
- **VERIFY:** TypeScript compile, import works

#### Task 1.2: Mở rộng `auth.setup.ts` multi-role
- **Priority:** P0 · **Dependencies:** 1.1
- **OUTPUT:** 3 setup steps mới (expert, researcher, admin) — skip nếu thiếu env
- **VERIFY:** `npx playwright test --project=setup` pass

#### Task 1.3: Playwright projects mới
- **Priority:** P0 · **Dependencies:** 1.2
- **OUTPUT:** Thêm vào `playwright.config.ts`:
  - `guest-full` — specs 12–20, guest storage
  - `auth-ui` — specs 21–24, contributor session
  - `contributor-full` — specs 25–27, contributor session
  - `expert-ui` — specs 28–31, expert session
  - `researcher-ui` — specs 32–35, researcher session
  - `admin-ui` — specs 36–40, admin session
- **VERIFY:** `npx playwright test --list` hiển thị projects

#### Task 1.4: Thiết lập Test Data / Database Teardown
- **Priority:** P1
- **OUTPUT:** File `tests/e2e/helpers/testDataTeardown.ts` — helper dọn dẹp dữ liệu rác sau khi test chạy xong bằng Real API
- **Nội dung helper:**
  - Hàm `deleteTestNotifications(token)` — gọi `DELETE /api/Notification/:id` cho các notification tạo trong test
  - Hàm `deleteTestSubmissions(token)` — gọi API xóa submission E2E
  - Hàm `cleanupTestUser(token)` — reset profile về trạng thái ban đầu nếu test đã sửa
  - Pattern: mỗi test tạo dữ liệu sẽ lưu ID vào mảng, `afterAll` gọi teardown xóa hết
- **VERIFY:** TypeScript compile, import works, chạy cleanup không lỗi

#### Task 1.5: npm scripts cập nhật
- **Priority:** P1 · **Dependencies:** 1.3
- **OUTPUT:** Scripts cho từng project group + combined `test:e2e:features`
- **VERIFY:** `npm run test:e2e:features -- --list`

---

### Phase 2 — Guest Specs (Không cần auth)

#### Task 2.1: `12-auth-pages.spec.ts`
- **Priority:** P1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Login page renders | Navigate `/login`, verify form fields + button |
| Login validation | Submit empty → error feedback |
| Login failure toast | Sai password → toast "Lỗi đăng nhập" (upgrade từ 10-toast) |
| Register page renders | Navigate `/register`, verify fields |
| Register validation | Submit invalid → error messages |
| Confirm account page renders | Navigate `/confirm-account` → UI renders |

#### Task 2.2: `13-homepage-full.spec.ts`
- **Priority:** P1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Hero section renders | h1, subtitle, CTA visible |
| Navigation links work | Click "Khám phá" → `/explore` |
| Featured recordings load | API thật trả về danh sách → recording cards visible |
| Statistics section | "Bản thu", "Dân tộc", etc. counters |
| Responsive layout | Mobile viewport → hamburger menu |

#### Task 2.3: `14-explore-full.spec.ts`
- **Priority:** P1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Explore page loads | Grid/list renders |
| Filter sidebar toggles | Open/close filter panel |
| Search by keyword | Type in search → results filter |
| Filter by ethnicity | Select filter → recording cards update |
| Recording card click → detail | Click card → navigate `/recordings/:id` |
| Pagination works | Click page 2 → new results |

#### Task 2.4: `15-recording-detail.spec.ts`
- **Priority:** P1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Detail page loads | Title, media player, sidebar info |
| Audio player renders | WaveSurfer/HTML5 audio element visible |
| Sidebar metadata | Ethnicity, region, type, duration |
| Action buttons | Like, Download, Share visible |
| GPS map shows | Recording có GPS → map iframe hiển thị |
| Annotations section | API trả annotations → read-only display |
| Dispute button | "Báo cáo vi phạm" button visible |
| 404 handling | Invalid ID → "Không tìm thấy" message |

#### Task 2.5: `16-search-page.spec.ts`
- **Priority:** P1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Search page renders | Search bar, filters visible |
| Keyword search works | Type query → results |
| Export button opens dialog | Click export → ExportDatasetDialog |
| Empty results message | Search nonsense → "Chưa có kết quả" |

#### Task 2.6: `17-semantic-search.spec.ts`
- **Priority:** P1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Page renders | Title "Tìm theo ý nghĩa", search input |
| Suggested queries display | 8 suggestion chips visible |
| Click suggestion → search | Click chip → results load |
| Empty results | Search nonsense → fallback message |
| Navigate to search page link | Click "Đến trang Tìm kiếm" → `/search` |

#### Task 2.7: `18-catalogues.spec.ts`
- **Priority:** P2
- **Tests:**

| Test | Mô tả |
|------|--------|
| Instruments page loads | `/instruments` → list/grid renders |
| Instruments search | Filter instruments by name |
| Ethnicities page loads | `/ethnicities` → list renders |
| Ethnicities search | Filter by name |
| Masters page loads | `/masters` → list renders |
| Masters search | Filter performers |

#### Task 2.8: `19-static-pages.spec.ts`
- **Priority:** P2
- **Tests:**

| Test | Mô tả |
|------|--------|
| About page renders | `/about` → content visible |
| 403 page | `/403` → forbidden message |
| 404 page | `/nonexistent-route` → not found message |

#### Task 2.9: `20-kb-public-view.spec.ts`
- **Priority:** P2
- **Tests:**

| Test | Mô tả |
|------|--------|
| KB entry renders | API trả KB entry → title + content display |
| KB entry not found | Invalid ID → error message |

---

### Phase 3 — Auth User Specs

#### Task 3.1: `21-profile-page.spec.ts`
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Profile page loads | Name, role, email visible |
| Edit profile opens modal | Click "Chỉnh sửa hồ sơ" → modal |
| Edit validation | Empty name → error |
| Edit save | Fill valid data → gọi PUT API thật → verify toast thành công hoặc lưu cục bộ |

#### Task 3.2: `22-chatbot-page.spec.ts`
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Chatbot page loads | Welcome message, input field, sidebar |
| Send message | Type + Enter → user message appears |
| Bot reply | Gửi tin nhắn → chờ AI API thật trả reply → bot reply rendered |
| Chat history sidebar | Sidebar shows conversation list |
| New chat button | Click → reset to welcome msg |
| Flag message toggle | Click flag → icon toggles |

#### Task 3.3: `23-notification-feed.spec.ts` (§L)
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Notification page loads | API trả danh sách → list renders |
| Header badge shows count | API trả unread-count → badge number |
| Mark as read | Click item → PUT /read gọi API thật |
| Delete notification | Click delete → DELETE gọi API thật, item removed |
| Navigate to recording | Click notification → `/recordings/:id` |
| Empty state | Không có notifications → empty message |

#### Task 3.4: `24-header-navigation.spec.ts`
- **Priority:** P2
- **Tests:**

| Test | Mô tả |
|------|--------|
| Header renders logo + nav | Logo, navigation links visible |
| Guest nav links | Explore, Search, Instruments, About visible |
| Auth nav links | Profile, Contributions, Notifications visible |
| Mobile hamburger | Viewport 375px → menu toggle |
| Role-specific links | Contributor→Upload; Expert→Moderation; Admin→Dashboard |
| Footer renders | Copyright, links visible |

---

### Phase 4 — Contributor Specs

#### Task 4.1: `25-upload-full-wizard.spec.ts`
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Upload page renders wizard | 3-step stepper, file input visible |
| Step 1: file selection | Select WAV → preview + next button |
| Step 2: metadata form | Fill title, ethnicity, region, instrument |
| Step 2: validation | Submit empty → error messages |
| Step 3: confirmation | Summary review, submit button |
| Submit form và verify API thật trả về 200 OK | POST Submission → success toast + redirect |
| Terms checkbox | Must agree before submit |

#### Task 4.2: `26-contributions-full.spec.ts` (§K)
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Contributions loads | Status tabs visible (Tất cả, Bản nháp, etc.) |
| Tab filtering | Click "Đã duyệt" → filtered list |
| Detail modal opens | Click item → modal with full info |
| Version timeline in detail | API trả SubmissionVersion → timeline renders |
| Version detail modal | Click timeline item → diff view |
| Request delete | "Yêu cầu xóa" button visible for approved |
| Request edit | "Yêu cầu chỉnh sửa" button visible |

#### Task 4.3: `27-edit-recording.spec.ts`
- **Priority:** P2 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Edit page loads | Form pre-filled with recording data |
| Edit validation | Clear title → error |
| Save changes | Gọi PUT API thật → verify success toast |

---

### Phase 5 — Expert Specs

#### Task 5.1: `28-moderation-full.spec.ts`
- **Priority:** P0 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Moderation page loads | Queue sidebar + detail panel |
| Queue loads submissions | GET get-by-status API thật → items in sidebar |
| Claim submission | Click "Nhận xử lý" → status changes |
| Detail view renders | Select item → media + metadata + tabs |
| Tab navigation | Review, AI, Annotation tabs |
| Approve flow | Click "Duyệt" → confirmation → PUT API thật |
| Reject flow | Click "Từ chối" → reason form → PUT API thật |
| Verification wizard | Open wizard → multi-step dialog |
| Unclaim | Click "Bỏ nhận" → unclaim |

#### Task 5.2: `29-approved-recordings.spec.ts`
- **Priority:** P2 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Page loads | API trả approved list → recordings grid |
| Search/filter | Filter approved recordings |
| Click → detail | Navigate to recording detail |

#### Task 5.3: `30-annotation-expert.spec.ts` (§C)
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Annotation tab visible | Tab "Chú thích học thuật" in moderation |
| Load annotations | GET API thật → list renders |
| Create annotation | Fill form → POST API thật → new item appears |
| Edit annotation | Click edit → update → PUT API thật |
| Delete annotation | Click delete → confirm → DELETE API thật |
| Validation | Submit empty form → error messages |
| RecordingDetail read-only | Annotations display on recording page |

#### Task 5.4: `31-embargo-dispute.spec.ts` (§E+§H)
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Embargo section in moderation | EmbargoSection renders in detail |
| Embargo badge on recording | Recording có embargo → badge visible |
| Dispute list on admin | DisputeListPanel renders |
| Report dispute form | Click "Báo cáo vi phạm" → form opens |
| Evidence upload | Upload file in dispute form |
| Sensitive content checkbox | Wizard step 3 → checkbox visible |

---

### Phase 6 — Researcher Specs

#### Task 6.1: `32-researcher-portal.spec.ts`
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Portal loads | Researcher guard allows access |
| Archive list renders | GET get-by-status API thật → recordings visible |
| Filter bar works | Ethnicity, region, search filters |
| Tab navigation | Archive, So sánh, QA, Knowledge Graph tabs |
| Single track player | Click recording → player opens |

#### Task 6.2: `33-dual-player.spec.ts` (§A)
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Compare tab loads | Select "So sánh" tab |
| Select 2 recordings | Check 2 items → DualAudioComparePlayer mounts |
| A/B controls visible | "A+B", "A only", "B only" buttons |
| Play/Pause sync | Click play → both players sync |
| Reset button | Click reset → players reset |

#### Task 6.3: `34-export-dataset.spec.ts` (§B)
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Export button on researcher | Click → ExportDatasetDialog opens |
| Format picker | JSON, CSV, XLSX options visible |
| Column selector | Select all / clear all toggles |
| Export on search page | /search export button → dialog opens |

#### Task 6.4: `35-researcher-qa-graph.spec.ts`
- **Priority:** P2 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| QA tab loads | Chat interface with welcome message |
| Send research question | Gửi câu hỏi → chờ AI API thật trả reply → response rendered |
| Knowledge Graph tab loads | Tab click → graph viewer mounts |

---

### Phase 7 — Admin Specs

#### Task 7.1: `36-admin-dashboard.spec.ts`
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Dashboard loads | Admin guard allows, stats visible |
| Tab navigation | Overview, Users, Moderation, AI, Analytics, KB tabs |
| Overview stats cards | GET analytics API thật → count cards render |
| User management section | Users list renders |

#### Task 7.2: `37-admin-create-expert.spec.ts`
- **Priority:** P2 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Create expert page loads | Form fields visible |
| Form validation | Submit empty → errors |
| Create flow | Fill form → POST API thật → verify success |

#### Task 7.3: `38-admin-knowledge-base.spec.ts`
- **Priority:** P2 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| KB management loads | List of entries |
| Create entry | Form → POST API thật → new entry |
| Edit entry | Click edit → rich text editor |
| Revision history | View revisions for entry |

#### Task 7.4: `39-ai-dashboard-admin.spec.ts` (§D)
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| AI monitoring tab loads | Click tab → panel |
| Accuracy card | GET analytics/experts API thật → % rendered |
| Flagged count card | GET flagged messages API thật → count |
| Expert performance table | Table with name/reviews/accuracy |
| Flagged response list | FlaggedResponseList items render |

#### Task 7.5: `40-analytics-charts.spec.ts` (§F)
- **Priority:** P1 · **Dependencies:** Phase 1
- **Tests:**

| Test | Mô tả |
|------|--------|
| Analytics tab renders | 4 chart sections visible |
| Coverage gap chart | GET /coverage API thật → BarChart SVG |
| Content analytics | GET /content API thật → chart rendered |
| Monthly trend chart | API thật trả data → trend line |
| Contributor leaderboard | GET /contributors API thật → ranking table |
| Empty data fallback | API trả rỗng → fallback text |

---

### Phase 8 — Integration & CI

#### Task 8.1: Cập nhật CI scripts
- **Priority:** P2
- **OUTPUT:** `test:e2e:ci` chạy toàn bộ specs kết nối Real Backend Test Environment

#### Task 8.2: `.env.e2e-multi-role.example`
- **Priority:** P2
- **OUTPUT:** Example file cho E2E_EXPERT_EMAIL, E2E_RESEARCHER_EMAIL, E2E_ADMIN_EMAIL, VITE_API_BASE_URL

#### Task 8.3: E2E test README
- **Priority:** P2
- **OUTPUT:** `docs/E2E-test-guide.md` — hướng dẫn chạy, cấu hình, debug, kết nối Backend Test Env

---

## Agent Assignment

| Phase | Tasks | Agent | Skills |
|-------|-------|-------|--------|
| Phase 1 | 1.1–1.5 | `frontend-specialist` | `webapp-testing`, `clean-code` |
| Phase 2 | 2.1–2.9 | `frontend-specialist` | `webapp-testing` |
| Phase 3 | 3.1–3.4 | `frontend-specialist` | `webapp-testing` |
| Phase 4 | 4.1–4.3 | `frontend-specialist` | `webapp-testing` |
| Phase 5 | 5.1–5.4 | `frontend-specialist` | `webapp-testing` |
| Phase 6 | 6.1–6.4 | `frontend-specialist` | `webapp-testing` |
| Phase 7 | 7.1–7.5 | `frontend-specialist` | `webapp-testing` |
| Phase 8 | 8.1–8.3 | `frontend-specialist` | `webapp-testing` |

---

## Dependency Graph

```
Phase 1 (Serial — BLOCKER):
  1.1 → 1.2 → 1.3 → 1.5
  1.4 (parallel với 1.1–1.3)

Phase 2–7 (Parallel by role — after Phase 1):
  Phase 2 (Guest)       ─┐
  Phase 3 (Auth)        ─┤
  Phase 4 (Contributor) ─┤
  Phase 5 (Expert)      ─┼─→ Phase 8 (CI/Docs)
  Phase 6 (Researcher)  ─┤
  Phase 7 (Admin)       ─┘
```

---

## Real API Testing Workflow (TDD Loop)

Toàn bộ E2E spec trong plan này **KHÔNG dùng `page.route()` / Mock API**. Mọi test tương tác trực tiếp với Backend API thật qua `VITE_API_BASE_URL`.

### Bước 1 — Đỏ (Fail)

Viết Playwright test gọi API thật. Chạy test.

**Nếu test FAIL**, nguyên nhân có thể là:

| Loại lỗi | Ví dụ |
|-----------|-------|
| Backend API trả lỗi | 500 Internal Server Error, 404 endpoint chưa deploy |
| Frontend handle sai | Nhận response nhưng render sai, crash, không hiện toast |
| Timeout | API quá chậm, SignalR không kết nối được |
| Auth | Token hết hạn, role không đủ quyền |
| Data | Database test chưa có seed data phù hợp |

### Bước 2 — Ghi nhận (Không tự sửa test để lách lỗi)

Khi test fail ở Bước 1:

1. **KHÔNG** được tự ý sửa assertion / thêm `page.route()` / bọc `try-catch` để test pass giả.
2. **Ghi nhận** trạng thái lỗi:
   - Cập nhật trạng thái trực tiếp vào cột `Trạng thái` trong bảng **Phase X — Verification Checklist** phía dưới.
   - Hoặc ghi chi tiết vào file `docs/test-report.md` (tạo nếu chưa có) theo format:

```markdown
## [NGÀY] — Test Report

### FAIL: 28-moderation-full.spec.ts > Approve flow
- **Lỗi:** API PUT /Submission/approve-submission trả 500
- **Root cause:** Backend chưa deploy endpoint mới
- **Action:** Báo Backend team fix, chờ redeploy
- **Chặn:** Task 5.1 — chưa Done
```

3. Task **KHÔNG được đánh dấu Done** khi còn test FAIL.

### Bước 3 — Xanh (Pass)

Developer (Người dùng) sẽ chủ động:

1. **Fix code Frontend** nếu lỗi thuộc FE (handle response sai, UI crash, selector sai).
2. **Nhờ Backend fix API** nếu lỗi thuộc BE (endpoint lỗi, thiếu field, auth sai).
3. **Chạy lại test** đến khi **PASS (Xanh)**.
4. Chỉ khi test PASS mới được tính là **Done task**.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Bước 1     │     │  Bước 2      │     │  Bước 3     │
│  Viết test  │────▶│  FAIL?       │────▶│  Fix code   │
│  (Real API) │     │  Ghi nhận    │     │  FE hoặc BE │
│             │     │  KHÔNG lách  │     │  Chạy lại   │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                                          PASS? ▼
                                         ┌──────────┐
                                         │  Done ✅  │
                                         └──────────┘
```

---

## Effort Estimate

| Phase | Specs | Effort |
|-------|-------|--------|
| Phase 1 — Hạ tầng | 5 tasks | ~3–4h |
| Phase 2 — Guest (9 files) | 9 tasks | ~5–6h |
| Phase 3 — Auth (4 files) | 4 tasks | ~3–4h |
| Phase 4 — Contributor (3 files) | 3 tasks | ~3h |
| Phase 5 — Expert (4 files) | 4 tasks | ~4–5h |
| Phase 6 — Researcher (4 files) | 4 tasks | ~4–5h |
| Phase 7 — Admin (5 files) | 5 tasks | ~4–5h |
| Phase 8 — CI/Docs | 3 tasks | ~1–2h |
| **Tổng** | **29 spec files, 37 tasks** | **~27–35h** |

---

## Phase X — Verification Checklist

### Biên bản xác minh (cập nhật)

- 2026-04-17:
  - `npm run test:e2e:researcher-ui` → **exit 0** (PASS + SKIP best-effort do Real DB)
  - `npm run test:e2e:admin-ui` → **exit 0** (PASS + SKIP best-effort do Real DB)
  - Thêm `.env.e2e-multi-role.example` + `docs/E2E-test-guide.md`
  - Thêm script CI: `npm run test:e2e:features:ci -- --list` (verify config ok)

| # | Kiểm tra | Type | Trạng thái |
|---|----------|------|------------|
| 1 | `npm run lint` passes (bao gồm tests/) | Auto | `[ ]` |
| 2 | `npm run build` passes | Auto | `[ ]` |
| 3 | `npx playwright test --project=guest-full` pass | Auto | `[ ]` |
| 4 | `npx playwright test --project=auth-ui` pass | Auto | `[ ]` |
| 5 | `npx playwright test --project=contributor-full` pass | Auto | `[ ]` |
| 6 | `npx playwright test --project=expert-ui` pass | Auto | `[ ]` |
| 7 | `npx playwright test --project=researcher-ui` pass | Auto | `[x]` |
| 8 | `npx playwright test --project=admin-ui` pass | Auto | `[x]` |
| 9 | Existing 9 specs không regression | Auto | `[ ]` |
| 10 | Mỗi route trong `App.tsx` có ≥ 1 spec | Manual | `[ ]` |
| 11 | Mỗi feature §A–§L (done) có spec riêng | Manual | `[ ]` |
| 12 | Backend API Test Environment đang chạy ổn định và được kết nối thông qua biến môi trường `VITE_API_BASE_URL` | Manual | `[ ]` |
| 13 | `.env.e2e-multi-role.example` documented | Manual | `[x]` |
| 14 | E2E test guide README exists | Manual | `[x]` |
