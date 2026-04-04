# Plan: Test E2E Contributor Workflow

## Overview

**What:** Define and implement an end-to-end Playwright suite for the Contributor journey: access upload flow, submit contribution data, and track moderation status in contributor-facing pages.

**Why:** Contributor flow is the primary content-ingestion path. Reliable E2E coverage prevents regressions in role gating, upload UX, submission lifecycle states, and edit/request-update experience.

## Scope

- In scope: Contributor role auth seed, `/upload`, `/contributions`, status filtering, detail modal, and key guard rails for non-contributor users.
- Out of scope: Expert moderation internals, researcher-only portal, backend schema redesign.

## Project type

**WEB** (React + Vite + Playwright).

## Success criteria (measurable)

1. `npm run test:e2e` runs contributor specs successfully in local environment.
2. Contributor happy path is covered: access upload page -> perform submission action path -> verify item appears in contributions list.
3. At least one negative path is covered (non-contributor blocked on `/upload` or validation failure path).
4. Moderation status view/filter behavior is asserted for contributor-facing statuses (`Bản nháp`, `Đang xử lý`, `Yêu cầu cập nhật`, `Đã duyệt`, `Từ chối`).
5. Test artifacts are generated under `test-results/` and can be consumed in CI.

## Assumptions

- `UploadPage` remains mounted at `/upload` and uses Contributor-only guard.
- `ContributionsPage` remains mounted at `/contributions` with tab-based status filtering.
- API layer can be mocked via Playwright route handlers for deterministic runs.

## Task breakdown

### T1 - Baseline contributor workflow mapping

- **Agent:** `test-engineer`
- **Priority:** P0
- **Dependencies:** None
- **Input:** `UploadPage.tsx`, `ContributionsPage.tsx`, route map in `App.tsx`
- **Output:** Step map of contributor actions and expected UI outcomes
- **Verify:** Documented scenario matrix (happy path + negative path)

### T2 - Deterministic mock and auth strategy

- **Agent:** `test-engineer`
- **Priority:** P0
- **Dependencies:** T1
- **Input:** Auth storage model and submission API contracts
- **Output:** Reusable contributor session seed + route mocks for submission list/detail/create
- **Verify:** Tests pass without depending on external backend state

### T3 - Implement contributor happy-path E2E

- **Agent:** `test-engineer`
- **Priority:** P1
- **Dependencies:** T2
- **Input:** Contributor upload and contributions UX
- **Output:** Spec verifies core flow from contribution action to list/status visibility
- **Verify:** Scenario passes and asserts user-visible state transitions

### T4 - Implement guard/negative-path E2E

- **Agent:** `test-engineer`
- **Priority:** P1
- **Dependencies:** T2
- **Input:** Role-based restrictions and validation UX
- **Output:** Spec for at least one negative case:
  - non-contributor sees block message on `/upload`, or
  - contributor rejects invalid submission action with clear warning
- **Verify:** Guard/validation behavior is explicitly asserted

### T5 - Status and detail reliability checks

- **Agent:** `test-engineer` + `frontend-specialist`
- **Priority:** P2
- **Dependencies:** T3
- **Input:** Contributor status tabs and detail modal rendering
- **Output:** Assertions for filter behavior and selected submission detail visibility
- **Verify:** No flaky selector assumptions; role/label-based locators

### T6 - CI readiness and repeatability

- **Agent:** `devops-engineer` + `test-engineer`
- **Priority:** P2
- **Dependencies:** T3, T4, T5
- **Input:** Playwright config and npm scripts
- **Output:** Stable execution instructions for local and CI
- **Verify:** Consecutive runs succeed and artifacts are produced

## Risks and mitigations

- **Risk:** Upload component complexity (multi-step, media fields) increases flakiness  
  **Mitigation:** Start with deterministic mocked input path and assert stable milestones, not fragile visual transitions.

- **Risk:** Backend response shape drift  
  **Mitigation:** Keep fixtures aligned with current mapper/service contracts used by contributor pages.

- **Risk:** Tests pass only in mocked mode  
  **Mitigation:** Add optional staging smoke checklist for API-backed sanity validation.

## Phase X: Verification checklist

- [ ] `npm run test:e2e` passes locally with contributor specs
- [ ] Run full suite 3 consecutive times without flaky failures
- [ ] Happy path + negative path for contributor workflow both covered
- [ ] Status filter assertions included in E2E specs
- [ ] `test-results/` artifacts generated and reviewable

## Next steps after plan approval

1. Execute with `/create implement e2e tests for contributor workflow`.
2. Run `/test` and stabilize flaky selectors if any.
3. Perform final smoke and attach test artifacts/report output.

