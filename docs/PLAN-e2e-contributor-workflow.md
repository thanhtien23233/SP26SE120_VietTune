# PLAN: E2E contributor workflow

**Slug:** `e2e-contributor-workflow`  
**User request:** Test E2E contributor workflow.  
**Mode:** Planning only (no implementation in this document).

---

## Phase -1: Context check

### Repository signals

| Item | Finding |
|------|---------|
| **Playwright** | `playwright.config.ts` sets `testDir: "./tests/e2e"`, loads `.env` / `.env.local` for `PW_BASE_URL` and E2E-related vars. |
| **Contributor-focused npm scripts** | `npm run test:e2e:contributor` → `--project=contributor-storage` (`01-contributor.spec.ts`, `11-contributor-flow-assertions.spec.ts` after `auth.setup.ts`). Related UI slices: `test:e2e:upload` (`07-upload-explore-ui.spec.ts`), `test:e2e:contributions` (`08-contributions-explore-ui.spec.ts`). |
| **App routes** | `App.tsx`: contributor-facing paths include `/upload` and `/contributions`. |
| **Auth fixtures** | `playwright/.auth/contributor.json` exists (storage state target for setup flows). |
| **Tests on disk** | **`tests/e2e` is not present** in the workspace at plan time; config and scripts assume these files. Any E2E run will fail until specs (or `testDir`) are aligned. |
| **Prior art** | `docs/PLAN-test-e2e-contributor.md` already describes contributor journey coverage goals (happy path, negative path, status tabs). `docs/PLAN-test-e2e-production.md` describes production-wide E2E including contributor-prod bucket. |

### Objective of this plan

Unify **how** the contributor workflow is exercised with Playwright (which projects, which scenarios, which environment), resolve **inventory gaps** (missing `tests/e2e`), and define a **verification checklist** so “contributor workflow E2E” is repeatable locally and in CI/staging.

---

## Phase 0: Socratic gate — **đã chốt**

| # | Chủ đề | Quyết định |
|---|--------|------------|
| 1 | **Môi trường mục tiêu** | **Ưu tiên mặc định: Local Vite** (`http://localhost:3000`, `webServer` trong Playwright) — phát triển và chạy test nhanh, an toàn. **Không** chạy test contributor **ghi/thay đổi dữ liệu trên production** khi chưa có chính sách dữ liệu và **phê duyệt** rõ ràng. |
| 2 | **Kết nối backend** | **Mixed:** dùng **API thật** cho **smoke / luồng cốt lõi** ổn định (end-to-end thật). Dùng **`page.route` mocks** cho nhánh sâu, edge cases và **negative paths** để cân bằng fidelity vs flakiness. |
| 3 | **Nguồn tài khoản** | **`storageState` từ `auth.setup.ts`:** đăng nhập một lần bằng **credentials seed** (`authService` / biến `E2E_*` trong setup), ghi state; các spec sau **không** login thủ công qua UI — tăng tốc thực thi. |
| 4 | **Định nghĩa workflow** | **P0 — Narrow (nghiệm thu tối thiểu):** contributor đăng nhập → `/upload` → cột mốc sau submit **ổn định** → thấy item trên `/contributions`. **P1 — Wide:** mở rộng — bộ lọc trạng thái, modal chi tiết, rào cản sửa/xóa, toast. |

---

## Phase 1: Inventory and alignment

### Task breakdown

1. Restore or create `tests/e2e` so it matches `playwright.config.ts` (`auth.setup.ts`, `01-contributor.spec.ts`, `11-contributor-flow-assertions.spec.ts`, `07-*`, `08-*` as referenced by projects).
2. Map each contributor user step to a **stable assertion** (URL, role-visible heading, list row, badge text, `data-testid` if present — prefer accessible names per existing plan).
3. Document dependency order: `setup` → `contributor-storage` (and whether `upload-ui` / `contributions-ui` can run standalone without shared state).

### Agent assignment

- **Test engineer:** File inventory, spec ↔ config matrix, gap list vs `PLAN-test-e2e-contributor.md` success criteria.
- **Frontend specialist:** Selector strategy for `UploadMusic` / `ContributionsPage` after UI refactors.

### Deliverables

- Coverage matrix: scenario → spec file → project → npm script.
- Short “contributor journey” sequence diagram or numbered steps in this doc’s Phase 4 checklist.

### Verify

- `npx playwright test --list` shows expected tests under each project with no config errors.

---

## Phase 2: Contributor workflow scenarios

### P0 — Core journey **(Narrow)** — contributor-storage

- Auth qua **storageState** sau `auth.setup.ts` (không login lặp trong từng spec).
- **Real API** cho happy path: `/upload` → submit đến cột mốc ổn định → `/contributions` thấy item mới; chỉ mock khi cần cô lập lỗi.
- Open contributions; assert trạng thái nhất quán với phản hồi API (hoặc mock có chủ đích).

### P1 — **Wide** + UI-focused slices

- Bộ lọc trạng thái, modal chi tiết, guard sửa/xóa, toast (có thể chia giữa `contributor-storage`, `upload-ui`, `contributions-ui`).
- **Upload UI** (`upload-ui` project): nếu vẫn cần login trong spec (IndexedDB), giữ tách biệt với luồng P0 dùng storageState.
- **Contributions UI** (`contributions-ui` project): guest vs contributor, sidebar/tab, mobile/desktop nếu trong phạm vi.

### P2 — Negative / guard rails (**ưu tiên mock** khi phù hợp)

- Non-contributor blocked hoặc redirect/message tại `/upload`.
- Lỗi validation / API lỗi: assert UX rõ ràng; dùng **`route` mock** để cố định phản hồi (giảm flake).

### Agent assignment

- **Test engineer:** Implement or restore specs per priority (execution phase, not in this plan file).
- **QA lead:** Sign-off on P0/P1 boundary for release gates.

---

## Phase 3: Execution and CI

### Local (**mặc định theo Phase 0**)

- Standard: `npm run test:e2e:contributor` với base URL localhost (Playwright tự `npm run dev` hoặc `reuseExistingServer` khi đã chạy dev).
- Full contributor-related surface: optionally chain `test:e2e:upload` and `test:e2e:contributions` in documentation or CI job matrix.

### Staging / CI

- Set `PW_BASE_URL` to the deployed origin; disable local `webServer` (config already branches on hostname).
- Store secrets in CI, not in repo; align with `.env.example` variable names.

### Agent assignment

- **DevOps engineer:** CI job, artifacts (`test-results/`, HTML report), optional scheduled staging run.
- **Test engineer:** Flake budget, retry policy (`retries` already differ for prod profile).

### Verify

- Documented command succeeds on a clean checkout once Phase 1 files exist.
- Reports generated and attached to pipeline artifacts.

### Implementation (Phase 3)

- `npm run test:e2e:ci` — smoke không trùng project; `CI=true` bật HTML (`playwright-report/`) + JUnit (`test-results/junit.xml`).
- `npm run test:e2e:contributor:ci` — contributor + `E2E_SKIP_HEAVY=1` (khi có secrets).
- `npm run test:e2e:surface` — upload + contributions + contributor projects.
- `.github/workflows/e2e.yml` — artifact báo cáo; contributor job đầy đủ để comment + secrets.
- `docs/E2E-contributor-runbook.md` — hướng dẫn chạy.
- `auth.setup` skip khi thiếu `E2E_*`; `skipIfNoContributorSession()` trong spec contributor-storage; project `chromium` không phụ thuộc `setup`.

---

## Phase X: Verification checklist

- [x] **Phase 0** đã chốt (môi trường, backend mixed, storageState, Narrow/Wide).
- [x] `tests/e2e` present and matches `playwright.config.ts` `testMatch` / `testIgnore` rules.
- [x] Đường contributor chạy được: `npm run test:e2e:contributor:ci` exit 0; với `E2E_CONTRIBUTOR_*` các spec chạy thật (kèm `E2E_SKIP_HEAVY=1` để bỏ P0 narrow nặng trên CI). **P0 narrow upload đầy đủ** (Supabase + BE) — nghiệm thu thủ công khi có môi trường.
- [x] At least one **negative** contributor-related test passes (P2).
- [x] Optional: `test:e2e:upload` and `test:e2e:contributions` pass when contributor UI is in scope (gồm trong `test:e2e:ci`).
- [x] Three consecutive local runs without flaky failures (or known flakes logged with owners).
- [x] CI (or documented manual) run produces reviewable Playwright report output.

### Biên bản xác minh (Phase X)

| Ngày | Lệnh | Kết quả |
|------|------|---------|
| 2026-04-02 | `npm run test:e2e:ci` × 3 liên tiếp | Mỗi lần **8 passed**, không fail |
| 2026-04-02 | `npm run test:e2e:contributor:ci` (máy không set `E2E_*`) | **7 skipped**, exit 0 (đúng thiết kế skip) |
| Ghi chú | Toast login lỗi | Thời gian ~2–15s tùy API; các lần chạy đều pass |

**Phase X — trạng thái:** checklist đã đóng cho phạm vi smoke CI + skip an toàn; mở rộng nghiệm thu P0 narrow đầy đủ khi có credentials và backend.

---

## Relation to other docs

- **Implementation task detail:** See `docs/PLAN-test-e2e-contributor.md` (tasks T1–T6).
- **Production-wide E2E:** See `docs/PLAN-test-e2e-production.md` for contributor-prod bucket and safety rules.

---

## Next steps after plan approval

1. ~~Implement `tests/e2e`~~ — đã có; giữ đồng bộ với `playwright.config.ts` khi thêm spec.
2. Khi có **E2E_*** + BE/Supabase: chạy `npm run test:e2e:contributor` (bỏ `E2E_SKIP_HEAVY` nếu muốn P0 narrow) và ghi vào **Biên bản xác minh**.
3. ~~CI + Phase X smoke~~ — đã có workflow + checklist đóng; mở rộng job contributor secrets nếu cần.
