# Plan: Test E2E Expert Workflow

## Overview

**What:** Build and stabilize an end-to-end Playwright test suite for the Expert moderation journey on `/moderation`.

**Why:** The Expert path is a critical quality gate for submissions. We need repeatable E2E coverage to catch regressions in claim, verification, and decision flow before release.

## Scope

- In scope: E2E tests, fixtures/mocks, test data seeding, CI execution readiness, and verification checklist.
- Out of scope: feature redesign, API contract changes, and non-expert role flows.

## Project type

**WEB** (React + Vite + Playwright).

## Success criteria (measurable)

1. `npm run test:e2e` passes locally on a clean environment.
2. Expert happy path passes: login seed -> open `/moderation` -> claim -> complete verification -> approve/reject.
3. At least 1 negative path passes (validation fail or unclaim/cancel path).
4. Test run is stable (no flaky retries needed in 3 consecutive runs).
5. CI-ready command and required environment flags are documented.

## Assumptions

- Expert workflow remains accessible at `/moderation`.
- Existing E2E setup uses Playwright with Vite web server.
- For deterministic tests, queue and submission endpoints can be mocked in browser routing.

## Task breakdown

### T1 - Baseline audit of current E2E coverage

- **Agent:** `test-engineer`
- **Priority:** P0
- **Dependencies:** None
- **Input:** `tests/e2e/*`, `playwright.config.ts`, moderation-related services
- **Output:** Gap list of current tests vs required expert workflow scenarios
- **Verify:** Written checklist of covered/missing steps

### T2 - Define deterministic Expert test data strategy

- **Agent:** `test-engineer`
- **Priority:** P0
- **Dependencies:** T1
- **Input:** Auth/localStorage model, submission payload shapes
- **Output:** Reusable seed helpers and fixed mock payloads for expert queue
- **Verify:** Tests run consistently without external backend dependency

### T3 - Implement Expert happy-path E2E

- **Agent:** `test-engineer`
- **Priority:** P1
- **Dependencies:** T2
- **Input:** `/moderation` flow and expected statuses
- **Output:** Scenario for claim -> review steps -> decision -> status assertion
- **Verify:** Scenario passes reliably and asserts user-visible outcomes

### T4 - Implement key edge/negative E2E scenarios

- **Agent:** `test-engineer`
- **Priority:** P1
- **Dependencies:** T3
- **Input:** Validation and cancel/unclaim paths
- **Output:** At least one negative/guard scenario:
  - incomplete verification cannot continue, or
  - unclaim restores queue state
- **Verify:** Failing behavior is prevented and asserted explicitly

### T5 - Stabilize selectors and test ergonomics

- **Agent:** `frontend-specialist` + `test-engineer`
- **Priority:** P2
- **Dependencies:** T3, T4
- **Input:** Flaky selectors and dynamic UI state
- **Output:** Robust locator strategy using roles/labels/test IDs where necessary
- **Verify:** 3 consecutive local runs pass with no intermittent failures

### T6 - CI execution readiness

- **Agent:** `devops-engineer` + `test-engineer`
- **Priority:** P2
- **Dependencies:** T5
- **Input:** package scripts and Playwright config
- **Output:** Clear CI command, browser install step, and environment requirements
- **Verify:** Dry-run in CI-like local command succeeds

## Deliverables

- Updated/added E2E specs for Expert moderation workflow
- Documented test data strategy for deterministic execution
- CI execution notes for Playwright browser setup

## Risks and mitigations

- **Risk:** Flaky UI timing in multi-step verification modal  
  **Mitigation:** Prefer role-based locators + explicit wait for stable UI state transitions.

- **Risk:** Mock payload drift from API contract  
  **Mitigation:** Reuse shared mapper types and keep fixture schema close to current API shape.

- **Risk:** False confidence when only mocked flow is tested  
  **Mitigation:** Add optional staging smoke checklist for API-backed phase.

## Phase X: Verification checklist

- [x] `npm run test:e2e` passes locally
- [ ] Run same suite 3 times consecutively without flaky failure
- [x] `npx playwright install chromium` documented or automated in setup
- [x] Happy path + negative path both covered for expert moderation
- [x] CI command documented in project docs or pipeline notes

## Execution status update

1. [x] Execute with `/create implement e2e tests for expert moderation`.
2. [x] Run `/test` to validate and iterate on failures.
3. [x] Perform final smoke and attach test report artifacts.

### Latest run result

- `npm run test:e2e`: **2 passed**
- Artifacts: `test-results/` (including `.last-run.json` and failure context snapshots when applicable)

