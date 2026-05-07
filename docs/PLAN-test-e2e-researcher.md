# Plan: Test E2E Researcher Workflow

## Overview

**What:** Define and maintain a complete Playwright E2E suite for the Researcher portal across search, semantic intelligence, knowledge graph, comparative analysis, and export operations.

**Why:** Researcher is now a multi-phase workflow (Phase 1-4). End-to-end coverage is required to prevent regressions in discovery, citation safety, graph exploration, and async export reliability before release.

## Scope

- In scope: Researcher auth seed, `/researcher` tab flows, semantic ranking UX, QA citation/abstention behavior, graph traversal, compare controls/diff modes, and async export job hardening.
- Out of scope: Contributor data-entry internals, expert moderation internals, backend schema redesign.

## Project type

**WEB** (React + Vite + Playwright).

## Success criteria (measurable)

1. Researcher E2E specs pass reliably in local environment.
2. Coverage includes all implemented researcher phases:
   - Phase 1: structured filters + presets + facet counts
   - Phase 2: semantic explainability + citation abstention
   - Phase 3: graph exploration + comparative controls
   - Phase 4: async export package + hardening
3. Full release gate run passes with no regression in contributor/expert core workflows.
4. Test artifacts are generated under `test-results/`.
5. Suite is stable in 3 consecutive runs.

## Assumptions

- `ResearcherPortalPage` remains mounted at `/researcher` behind `ResearcherGuard`.
- Deterministic execution continues to rely on Playwright route mocking.
- Existing specs remain source-of-truth by phase:
  - `tests/e2e/researcher-phase1.spec.ts`
  - `tests/e2e/researcher-phase2.spec.ts`
  - `tests/e2e/researcher-phase3.spec.ts`
  - `tests/e2e/researcher-phase4.spec.ts`

## Task breakdown

### T1 - Consolidate researcher phase coverage map

- **Agent:** `test-engineer`
- **Priority:** P0
- **Dependencies:** None
- **Input:** Current researcher specs and `ResearcherPortalPage.tsx`
- **Output:** Matrix mapping each phase capability to concrete assertions
- **Verify:** No implemented researcher feature is left untested

### T2 - Stabilize selectors and deterministic mocking

- **Agent:** `test-engineer`
- **Priority:** P0
- **Dependencies:** T1
- **Input:** Existing flaky-prone selectors and mocked API handlers
- **Output:** Locator hardening and fixture consistency updates
- **Verify:** No strict-mode selector conflicts in repeated runs

### T3 - Validate phase-specific critical paths

- **Agent:** `test-engineer`
- **Priority:** P1
- **Dependencies:** T2
- **Input:** Researcher phase specs
- **Output:** Passing tests for:
  - Phase 1: preset lifecycle + facet behavior
  - Phase 2: semantic explainability + citation safety
  - Phase 3: graph depth/search + compare sync/diff
  - Phase 4: async export, cancel/retry, benchmark/audit visibility
- **Verify:** Each phase has at least one positive + one resilience assertion

### T4 - Regression protection for cross-role boundaries

- **Agent:** `test-engineer`
- **Priority:** P1
- **Dependencies:** T3
- **Input:** Contributor and Expert E2E specs
- **Output:** Combined release-gate command that includes researcher + contributor + expert
- **Verify:** Researcher changes do not break non-researcher flows

### T5 - Repeatability and artifact readiness

- **Agent:** `test-engineer` + `devops-engineer`
- **Priority:** P2
- **Dependencies:** T4
- **Input:** Build + test scripts
- **Output:** Repeat-run evidence and artifact checklist
- **Verify:** 3 consecutive runs pass and test-results are reviewable

## Risks and mitigations

- **Risk:** UI refactors frequently break role-based locators  
  **Mitigation:** Prefer role/label selectors with exact matching where needed.

- **Risk:** Mock payload drift vs current page expectations  
  **Mitigation:** Keep fixtures close to current frontend mapping model and revalidate per phase.

- **Risk:** Async export timing causes flaky assertions  
  **Mitigation:** Assert status transitions (`queued/processing/completed|cancelled`) with explicit waits.

## Phase X: Verification checklist

- [x] `npm run build` passes before E2E run
- [x] Researcher phase specs pass (`phase1` -> `phase4`)
- [ ] Contributor + expert regression specs pass in same release-gate run
- [ ] Run full release-gate suite 3 consecutive times without flaky failures
- [x] `test-results/` artifacts generated and reviewable

## Next steps after plan approval

1. Run combined release-gate command (researcher + contributor + expert) and collect artifacts.
2. Repeat full gate 3 times and document final stability status in release notes.
3. Freeze selector strategy for researcher tab UI to reduce future test maintenance.

## Execution status update

1. [x] Execute with `/create implement/refresh e2e tests for researcher workflow`.
2. [x] Refresh specs to match current UI (removed preset/baseline panel from visible flow).
3. [x] Validate all researcher phase specs pass.

### Latest run result

- `npm run test:e2e -- tests/e2e/researcher-phase1.spec.ts tests/e2e/researcher-phase2.spec.ts tests/e2e/researcher-phase3.spec.ts tests/e2e/researcher-phase4.spec.ts`: **7 passed**
